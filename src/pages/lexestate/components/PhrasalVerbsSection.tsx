import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BookOpen, Layers, GraduationCap, ClipboardList, Search,
  ChevronDown, ChevronUp, CheckCircle, XCircle, RotateCcw,
  CheckCheck, Lightbulb, Keyboard, ArrowLeftRight,
} from 'lucide-react'
import type { LexPhrasalVerb, LexPhrasalVerbProgress, LexPhrasalVerbExercise, LexUser, ProgressStatus } from '../types'
import { fetchPhrasalVerbs, fetchPhrasalVerbProgress, updatePhrasalVerbProgress, setPhrasalVerbStatus, fetchPhrasalVerbExercises } from '../api'

interface Props { user: LexUser | null }

type Tab = 'list' | 'flashcards' | 'test' | 'frases'
type FlashPhase = 'config' | 'session' | 'done'
type TestPhase = 'config' | 'session' | 'done'
type FrasesPhase = 'config' | 'loading' | 'session' | 'done'
type PVRating = 'unknown' | 'hard' | 'learning' | 'mastered'
type TestDirection = 'def-to-term' | 'term-to-def'

const LEVELS = ['B1', 'B2', 'C1'] as const
type Level = typeof LEVELS[number]

const LEVEL_COLORS: Record<Level, string> = {
  B1: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  B2: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  C1: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}
const LEVEL_ACTIVE: Record<Level, string> = {
  B1: 'bg-sky-500 text-white border-transparent',
  B2: 'bg-violet-500 text-white border-transparent',
  C1: 'bg-amber-500 text-black border-transparent',
}

const STATUS_DOT: Record<ProgressStatus | 'pending', string> = {
  pending:   'bg-slate-600',
  learning:  'bg-blue-400',
  difficult: 'bg-amber-400',
  mastered:  'bg-emerald-400',
}

const STATUS_LABELS: Record<ProgressStatus, string> = {
  pending:   'Pendiente',
  learning:  'Aprendiendo',
  difficult: 'Difícil',
  mastered:  'Dominado',
}

const RATING_BUTTONS: { value: PVRating; label: string; color: string }[] = [
  { value: 'unknown',  label: 'No lo sé',    color: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' },
  { value: 'hard',     label: 'Difícil',     color: 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
  { value: 'learning', label: 'Aprendiendo', color: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25' },
  { value: 'mastered', label: 'Lo domino',   color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
]

function ratingToCorrect(r: PVRating): boolean { return r === 'learning' || r === 'mastered' }
function norm(s: string) { return s.trim().toLowerCase().replace(/[.,;:!?'"()\[\]-]/g, '').replace(/\s+/g, ' ') }
function answerMatches(user: string, answer: string) {
  const u = norm(user)
  return answer.split(' / ').map(norm).some(v => u === v || u.includes(v) || v.includes(u))
}

type FillBlankQuestion = { verb: LexPhrasalVerb; exercise: LexPhrasalVerbExercise }

export default function PhrasalVerbsSection({ user }: Props) {
  const [verbs, setVerbs] = useState<LexPhrasalVerb[]>([])
  const [progress, setProgress] = useState<Record<string, LexPhrasalVerbProgress>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('list')

  // ── List state ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<Level | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Flashcard state ───────────────────────────────────────────────────────────
  const [flashPhase, setFlashPhase] = useState<FlashPhase>('config')
  const [flashLevel, setFlashLevel] = useState<Level | ''>('')
  const [flashCat, setFlashCat] = useState('')
  const [flashDeck, setFlashDeck] = useState<LexPhrasalVerb[]>([])
  const [flashCurrent, setFlashCurrent] = useState(0)
  const [flashRevealed, setFlashRevealed] = useState(false)
  const [flashResults, setFlashResults] = useState<{ verbId: string; rating: PVRating }[]>([])

  // ── Test state ────────────────────────────────────────────────────────────────
  const [testPhase, setTestPhase] = useState<TestPhase>('config')
  const [testLevel, setTestLevel] = useState<Level | ''>('')
  const [testCat, setTestCat] = useState('')
  const [testMode, setTestMode] = useState<'mcq' | 'tipo'>('mcq')
  const [testDirection, setTestDirection] = useState<TestDirection>('def-to-term')
  const [testCount, setTestCount] = useState(10)
  const [testDeck, setTestDeck] = useState<{ verb: LexPhrasalVerb; options: string[] }[]>([])
  const [testCurrent, setTestCurrent] = useState(0)
  const [testSelected, setTestSelected] = useState<string | null>(null)
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore] = useState(0)
  const [testInput, setTestInput] = useState('')
  const testInputRef = useRef<HTMLInputElement>(null)

  // ── Frases state ──────────────────────────────────────────────────────────────
  const [frasesPhase, setFrasesPhase] = useState<FrasesPhase>('config')
  const [frasesLevel, setFrasesLevel] = useState<Level | ''>('')
  const [frasesCat, setFrasesCat] = useState('')
  const [frasesQuestions, setFrasesQuestions] = useState<FillBlankQuestion[]>([])
  const [frasesCurrent, setFrasesCurrent] = useState(0)
  const [frasesInput, setFrasesInput] = useState('')
  const [frasesSubmitted, setFrasesSubmitted] = useState(false)
  const [frasesScore, setFrasesScore] = useState(0)
  const [frasesShowHint, setFrasesShowHint] = useState(false)
  const [frasesResults, setFrasesResults] = useState<{ correct: boolean; answer: string }[]>([])

  useEffect(() => {
    setLoading(true)
    const p1 = fetchPhrasalVerbs()
    const p2 = user ? fetchPhrasalVerbProgress().catch(() => []) : Promise.resolve([])
    Promise.all([p1, p2]).then(([vbs, prog]) => {
      setVerbs(vbs)
      setProgress(Object.fromEntries(prog.map(p => [p.phrasal_verb_id, p])))
    }).finally(() => setLoading(false))
  }, [user])

  const categories = useMemo(
    () => Array.from(new Map(verbs.map(v => [v.category, v.category_es])).entries()),
    [verbs]
  )

  const filtered = useMemo(() => verbs.filter(v => {
    const matchLevel = !levelFilter || v.level === levelFilter
    const matchCat = !categoryFilter || v.category === categoryFilter
    const matchSearch = !search
      || v.phrasal_verb.toLowerCase().includes(search.toLowerCase())
      || v.translation_es.toLowerCase().includes(search.toLowerCase())
      || v.definition_es.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchCat && matchSearch
  }), [verbs, levelFilter, categoryFilter, search])

  const grouped = useMemo(() => {
    const map: Record<string, { es: string; items: LexPhrasalVerb[] }> = {}
    for (const v of filtered) {
      if (!map[v.category]) map[v.category] = { es: v.category_es, items: [] }
      map[v.category].items.push(v)
    }
    return map
  }, [filtered])

  const progressMap = useMemo(() => {
    const m: Record<string, ProgressStatus> = {}
    for (const v of verbs) if (progress[v.id]?.status) m[v.id] = progress[v.id].status
    return m
  }, [verbs, progress])

  async function handleStatusChange(verbId: string, status: ProgressStatus) {
    await setPhrasalVerbStatus(verbId, status).catch(() => {})
    setProgress(prev => ({
      ...prev,
      [verbId]: { ...(prev[verbId] ?? {} as LexPhrasalVerbProgress), phrasal_verb_id: verbId, status },
    }))
  }

  // ── Flashcard actions ─────────────────────────────────────────────────────────
  function startFlash() {
    let pool = flashLevel ? verbs.filter(v => v.level === flashLevel) : [...verbs]
    if (flashCat) pool = pool.filter(v => v.category === flashCat)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20)
    if (!pool.length) return
    setFlashDeck(pool)
    setFlashCurrent(0)
    setFlashRevealed(false)
    setFlashResults([])
    setFlashPhase('session')
  }

  async function rateVerb(rating: PVRating) {
    const verb = flashDeck[flashCurrent]
    setFlashResults(prev => [...prev, { verbId: verb.id, rating }])
    if (rating === 'mastered') {
      await setPhrasalVerbStatus(verb.id, 'mastered').catch(() => {})
      setProgress(prev => ({
        ...prev,
        [verb.id]: { ...(prev[verb.id] ?? {} as LexPhrasalVerbProgress), phrasal_verb_id: verb.id, status: 'mastered' },
      }))
    } else {
      const res = await updatePhrasalVerbProgress(verb.id, ratingToCorrect(rating)).catch(() => null)
      if (res) setProgress(prev => ({ ...prev, [verb.id]: res }))
    }
    if (flashCurrent + 1 >= flashDeck.length) setFlashPhase('done')
    else { setFlashCurrent(c => c + 1); setFlashRevealed(false) }
  }

  // ── Test actions ──────────────────────────────────────────────────────────────
  function buildTestDeck(dir: TestDirection) {
    let pool = testLevel ? verbs.filter(v => v.level === testLevel) : [...verbs]
    if (testCat) pool = pool.filter(v => v.category === testCat)
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, testCount)
    return shuffled.map(verb => {
      const wrong = pool
        .filter(v => v.id !== verb.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(v => dir === 'def-to-term' ? v.phrasal_verb : v.translation_es)
      const correct = dir === 'def-to-term' ? verb.phrasal_verb : verb.translation_es
      const options = [correct, ...wrong].sort(() => Math.random() - 0.5)
      return { verb, options }
    })
  }

  function startTest() {
    const deck = buildTestDeck(testDirection)
    if (!deck.length) return
    setTestDeck(deck)
    setTestCurrent(0)
    setTestSelected(null)
    setTestSubmitted(false)
    setTestScore(0)
    setTestInput('')
    setTestPhase('session')
  }

  function getCorrectAnswer(verb: LexPhrasalVerb) {
    return testDirection === 'def-to-term' ? verb.phrasal_verb : verb.translation_es
  }

  async function handleTestSelect(option: string) {
    if (testSubmitted) return
    const { verb } = testDeck[testCurrent]
    const correct = option === getCorrectAnswer(verb)
    setTestSelected(option)
    setTestSubmitted(true)
    if (correct) setTestScore(s => s + 1)
    const res = await updatePhrasalVerbProgress(verb.id, correct).catch(() => null)
    if (res) setProgress(prev => ({ ...prev, [verb.id]: res }))
  }

  async function handleTestInputSubmit() {
    if (testSubmitted || !testInput.trim()) return
    const { verb } = testDeck[testCurrent]
    const correct = answerMatches(testInput, getCorrectAnswer(verb))
    setTestSelected(testInput)
    setTestSubmitted(true)
    if (correct) setTestScore(s => s + 1)
    const res = await updatePhrasalVerbProgress(verb.id, correct).catch(() => null)
    if (res) setProgress(prev => ({ ...prev, [verb.id]: res }))
  }

  function nextTestQuestion() {
    if (testCurrent + 1 >= testDeck.length) setTestPhase('done')
    else { setTestCurrent(c => c + 1); setTestSelected(null); setTestSubmitted(false); setTestInput('') }
  }

  useEffect(() => {
    if (testPhase === 'session' && testMode === 'tipo' && !testSubmitted) testInputRef.current?.focus()
  }, [testCurrent, testPhase, testMode, testSubmitted])

  // ── Frases actions ────────────────────────────────────────────────────────────
  async function startFrases() {
    setFrasesPhase('loading')
    let pool = frasesLevel ? verbs.filter(v => v.level === frasesLevel) : [...verbs]
    if (frasesCat) pool = pool.filter(v => v.category === frasesCat)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    try {
      const exercises = await fetchPhrasalVerbExercises(shuffled.map(v => v.id))
      const byVerb = new Map<string, LexPhrasalVerbExercise[]>()
      for (const ex of exercises) {
        if (!byVerb.has(ex.phrasal_verb_id)) byVerb.set(ex.phrasal_verb_id, [])
        byVerb.get(ex.phrasal_verb_id)!.push(ex)
      }
      const qs: FillBlankQuestion[] = shuffled.flatMap(verb => {
        const exs = byVerb.get(verb.id) ?? []
        if (!exs.length) return []
        const ex = exs[Math.floor(Math.random() * exs.length)]
        return [{ verb, exercise: ex }]
      })
      setFrasesQuestions(qs)
      setFrasesCurrent(0)
      setFrasesInput('')
      setFrasesSubmitted(false)
      setFrasesScore(0)
      setFrasesResults([])
      setFrasesShowHint(false)
      setFrasesPhase(qs.length ? 'session' : 'config')
    } catch {
      setFrasesPhase('config')
    }
  }

  async function handleFrasesSubmit() {
    if (frasesSubmitted || !frasesInput.trim()) return
    const q = frasesQuestions[frasesCurrent]
    const correct = answerMatches(frasesInput, q.exercise.correct_answer)
    setFrasesSubmitted(true)
    if (correct) setFrasesScore(s => s + 1)
    setFrasesResults(prev => [...prev, { correct, answer: frasesInput }])
    const res = await updatePhrasalVerbProgress(q.verb.id, correct).catch(() => null)
    if (res) setProgress(prev => ({ ...prev, [q.verb.id]: res }))
  }

  function nextFrasesQuestion() {
    if (frasesCurrent + 1 >= frasesQuestions.length) setFrasesPhase('done')
    else { setFrasesCurrent(c => c + 1); setFrasesInput(''); setFrasesSubmitted(false); setFrasesShowHint(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  )

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'list',       label: 'Lista',      icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'test',       label: 'Test',       icon: ClipboardList },
    { id: 'frases',     label: 'Frases',     icon: GraduationCap },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Phrasal Verbs</h1>
        <span className="text-slate-500 text-sm">{verbs.length} phrasal verbs</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a1628] rounded-xl p-1 border border-emerald-500/10">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'text-slate-400 hover:text-white'}`}>
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── LIST TAB ────────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar phrasal verb o traducción…"
              className="w-full bg-[#0f2040] border border-slate-700/40 rounded-xl pl-9 pr-3 py-2
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setLevelFilter('')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                  ${!levelFilter ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                Todos
              </button>
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevelFilter(l === levelFilter ? '' : l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${levelFilter === l ? LEVEL_ACTIVE[l] : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="ml-auto appearance-none bg-[#0f2040] border border-slate-700/50 rounded-xl
                         px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todas las categorías</option>
              {categories.map(([cat, catEs]) => <option key={cat} value={cat}>{catEs}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total',       value: filtered.length,                                                          color: 'text-white' },
              { label: 'Aprendiendo', value: Object.values(progress).filter(p => p.status === 'learning').length,      color: 'text-blue-400' },
              { label: 'Dominados',   value: Object.values(progress).filter(p => p.status === 'mastered').length,      color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#0f2040] border border-slate-700/30 rounded-xl py-2 px-3">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-[11px]">{s.label}</div>
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">No hay resultados.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, { es, items }]) => (
                <section key={cat}>
                  {!categoryFilter && (
                    <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">{es}</h3>
                  )}
                  <div className="space-y-2">
                    {items.map(verb => (
                      <PhrasalVerbCard
                        key={verb.id}
                        verb={verb}
                        expanded={expandedId === verb.id}
                        onToggle={() => setExpandedId(expandedId === verb.id ? null : verb.id)}
                        progress={progress[verb.id]}
                        onStatusChange={user ? (s) => handleStatusChange(verb.id, s) : undefined}
                        levelColor={LEVEL_COLORS[verb.level as Level]}
                        statusDot={STATUS_DOT[progressMap[verb.id] ?? 'pending']}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="flex gap-4 text-xs text-slate-600">
            {(['pending', 'learning', 'difficult', 'mastered'] as ProgressStatus[]).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                <span>{STATUS_LABELS[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FLASHCARDS TAB ──────────────────────────────────────────────────── */}
      {tab === 'flashcards' && (
        <>
          {flashPhase === 'config' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Configurar sesión</h2>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFlashLevel('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${!flashLevel ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                      Todos
                    </button>
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => setFlashLevel(flashLevel === l ? '' : l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${flashLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Categoría</label>
                  <select value={flashCat} onChange={e => setFlashCat(e.target.value)}
                    className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl
                               px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">Todas</option>
                    {categories.map(([cat, catEs]) => <option key={cat} value={cat}>{catEs}</option>)}
                  </select>
                </div>
                <p className="text-slate-500 text-xs">
                  Se mostrarán 20 phrasal verbs aleatorios. Verás el verbo y deberás recordar su significado.
                </p>
                <button onClick={startFlash}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  Empezar
                </button>
              </div>
            </div>
          )}

          {flashPhase === 'session' && (() => {
            const verb = flashDeck[flashCurrent]
            const pct = (flashCurrent / flashDeck.length) * 100
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Flashcards</span>
                  <span className="text-slate-400 text-sm">{flashCurrent + 1} / {flashDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 min-h-[220px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[verb.level as Level]}`}>
                        {verb.level}
                      </span>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-1 font-mono">{verb.phrasal_verb}</h2>
                    <p className="text-emerald-400/80 text-base">{verb.translation_es}</p>
                  </div>

                  {!flashRevealed ? (
                    <button onClick={() => setFlashRevealed(true)}
                      className="mt-5 w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                                 text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-all
                                 flex items-center justify-center gap-2">
                      <BookOpen size={15} />
                      Revelar definición
                    </button>
                  ) : (
                    <div className="mt-4 border-t border-slate-700/40 pt-4 space-y-3">
                      <div className="bg-[#0a1628] rounded-xl p-3 space-y-1">
                        <p className="text-slate-300 text-sm leading-relaxed">{verb.definition_es}</p>
                        <p className="text-slate-500 text-xs italic">{verb.definition_en}</p>
                      </div>
                      {verb.example_en && (
                        <p className="text-slate-500 text-xs italic">"{verb.example_en}"</p>
                      )}
                    </div>
                  )}
                </div>

                {flashRevealed && (
                  <div className="grid grid-cols-2 gap-2">
                    {RATING_BUTTONS.map(rb => (
                      <button key={rb.value} onClick={() => rateVerb(rb.value)}
                        className={`border rounded-xl py-3 text-sm font-medium transition-all ${rb.color}`}>
                        {rb.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {flashPhase === 'done' && (() => {
            const known = flashResults.filter(r => ratingToCorrect(r.rating)).length
            const pct = Math.round((known / flashResults.length) * 100)
            return (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
                  <div className="text-5xl font-bold text-emerald-400 mb-1">{pct}%</div>
                  <div className="text-slate-400 text-sm mb-6">{known} de {flashResults.length} phrasal verbs</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {RATING_BUTTONS.map(rb => {
                      const count = flashResults.filter(r => r.rating === rb.value).length
                      return (
                        <div key={rb.value} className={`rounded-xl p-3 border ${rb.color}`}>
                          <div className="font-bold text-lg">{count}</div>
                          <div className="text-xs opacity-70">{rb.label}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="space-y-2">
                    <button onClick={startFlash}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      Nueva sesión
                    </button>
                    <button onClick={() => setFlashPhase('config')}
                      className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
                      Cambiar filtros
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ── TEST TAB ────────────────────────────────────────────────────────── */}
      {tab === 'test' && (
        <>
          {testPhase === 'config' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Test de Phrasal Verbs</h2>

                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Dirección</label>
                  <div className="flex gap-2">
                    <button onClick={() => setTestDirection('def-to-term')}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all
                        ${testDirection === 'def-to-term'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <ArrowLeftRight size={14} />
                      <span>Definición → Término</span>
                      <span className="text-[10px] opacity-60">ves el significado, escribes el phrasal verb</span>
                    </button>
                    <button onClick={() => setTestDirection('term-to-def')}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all
                        ${testDirection === 'term-to-def'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <ArrowLeftRight size={14} />
                      <span>Término → Significado</span>
                      <span className="text-[10px] opacity-60">ves el phrasal verb, escribes qué significa</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Modo</label>
                  <div className="flex gap-2">
                    <button onClick={() => setTestMode('mcq')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                        ${testMode === 'mcq' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <GraduationCap size={14} /> Elegir opción
                    </button>
                    <button onClick={() => setTestMode('tipo')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                        ${testMode === 'tipo' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <Keyboard size={14} /> Escribir
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setTestLevel('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${!testLevel ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                      Todos
                    </button>
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => setTestLevel(testLevel === l ? '' : l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${testLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Categoría</label>
                  <select value={testCat} onChange={e => setTestCat(e.target.value)}
                    className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl
                               px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">Todas</option>
                    {categories.map(([cat, catEs]) => <option key={cat} value={cat}>{catEs}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Preguntas</label>
                  <div className="flex gap-2">
                    {([5, 10, 15, 20] as const).map(n => (
                      <button key={n} onClick={() => setTestCount(n)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all
                          ${testCount === n ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={startTest}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  Empezar test
                </button>
              </div>
            </div>
          )}

          {testPhase === 'session' && (() => {
            const { verb, options } = testDeck[testCurrent]
            const pct = (testCurrent / testDeck.length) * 100
            const correctAnswer = getCorrectAnswer(verb)
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Test</span>
                  <span className="text-slate-400 text-sm">{testCurrent + 1} / {testDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  {testDirection === 'def-to-term' ? (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">¿Cuál es el phrasal verb?</div>
                      <p className="text-white text-base leading-relaxed font-medium">{verb.definition_es}</p>
                      <p className="text-slate-500 text-sm italic mt-1">{verb.definition_en}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">¿Qué significa?</div>
                      <p className="text-4xl font-bold text-white font-mono">{verb.phrasal_verb}</p>
                    </div>
                  )}

                  {testMode === 'mcq' ? (
                    <div className="space-y-2">
                      {options.map(opt => {
                        let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
                        if (testSubmitted) {
                          if (opt === correctAnswer) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          else if (opt === testSelected) style = 'border-red-500/50 bg-red-500/10 text-red-300'
                          else style = 'border-slate-700/30 text-slate-600'
                        } else if (opt === testSelected) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        return (
                          <button key={opt} onClick={() => handleTestSelect(opt)} disabled={testSubmitted}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${style}
                              ${testDirection === 'def-to-term' ? 'font-mono' : ''}`}>
                            {testSubmitted && opt === correctAnswer && <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />}
                            {testSubmitted && opt === testSelected && opt !== correctAnswer && <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input ref={testInputRef} value={testInput} onChange={e => setTestInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleTestInputSubmit() }}
                          disabled={testSubmitted}
                          placeholder={testDirection === 'def-to-term' ? 'Escribe el phrasal verb…' : 'Escribe el significado en español…'}
                          className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none
                            ${testDirection === 'def-to-term' ? 'font-mono' : ''}
                            ${testSubmitted
                              ? answerMatches(testSelected ?? '', correctAnswer)
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                : 'bg-red-500/10 border-red-500/50 text-red-300'
                              : 'bg-[#0a1628] border-slate-600/50 text-white focus:border-emerald-500/50'}`} />
                        {testSubmitted && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {answerMatches(testSelected ?? '', correctAnswer)
                              ? <CheckCircle size={16} className="text-emerald-400" />
                              : <XCircle size={16} className="text-red-400" />}
                          </div>
                        )}
                      </div>
                      {!testSubmitted && (
                        <button onClick={handleTestInputSubmit} disabled={!testInput.trim()}
                          className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40
                                     border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-all">
                          Comprobar
                        </button>
                      )}
                    </div>
                  )}

                  {testSubmitted && (
                    <div className={`rounded-xl p-3 text-sm
                      ${(testMode === 'mcq' ? testSelected === correctAnswer : answerMatches(testSelected ?? '', correctAnswer))
                        ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {(testMode === 'mcq' ? testSelected === correctAnswer : answerMatches(testSelected ?? '', correctAnswer))
                        ? `✓ Correcto: "${verb.phrasal_verb}" — ${verb.translation_es}`
                        : `✗ Incorrecto. La respuesta es "${correctAnswer}"`}
                    </div>
                  )}

                  {testSubmitted && (
                    <button onClick={nextTestQuestion}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                                 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      {testCurrent + 1 >= testDeck.length ? 'Ver resultado' : 'Siguiente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {testPhase === 'done' && (() => {
            const pct = Math.round((testScore / testDeck.length) * 100)
            const passed = pct >= 70
            return (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
                  <div className={`text-5xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</div>
                  <div className="text-slate-400 text-sm mb-6">{testScore} / {testDeck.length} correctas</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCheck size={16} className="text-emerald-400 mx-auto mb-1" />
                      <div className="text-emerald-400 font-bold text-lg">{testScore}</div>
                      <div className="text-slate-500 text-xs">Correctas</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <XCircle size={16} className="text-red-400 mx-auto mb-1" />
                      <div className="text-red-400 font-bold text-lg">{testDeck.length - testScore}</div>
                      <div className="text-slate-500 text-xs">Errores</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={startTest}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      <RotateCcw size={14} className="inline mr-2" />Repetir test
                    </button>
                    <button onClick={() => setTestPhase('config')}
                      className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
                      Cambiar configuración
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ── FRASES TAB ──────────────────────────────────────────────────────── */}
      {tab === 'frases' && (
        <>
          {frasesPhase === 'config' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Frases en contexto</h2>
                <p className="text-slate-400 text-sm">
                  Completa frases reales de vocabulario inmobiliario escribiendo el phrasal verb correcto.
                </p>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setFrasesLevel('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${!frasesLevel ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                      Todos
                    </button>
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => setFrasesLevel(frasesLevel === l ? '' : l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${frasesLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Categoría</label>
                  <select value={frasesCat} onChange={e => setFrasesCat(e.target.value)}
                    className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl
                               px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">Todas</option>
                    {categories.map(([cat, catEs]) => <option key={cat} value={cat}>{catEs}</option>)}
                  </select>
                </div>
                <button onClick={startFrases}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  Empezar
                </button>
              </div>
            </div>
          )}

          {frasesPhase === 'loading' && (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          )}

          {frasesPhase === 'session' && (() => {
            const q = frasesQuestions[frasesCurrent]
            const pct = (frasesCurrent / frasesQuestions.length) * 100
            const isOk = frasesSubmitted && answerMatches(frasesInput, q.exercise.correct_answer)
            const isWrong = frasesSubmitted && !isOk
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Frases</span>
                  <span className="text-slate-400 text-sm">{frasesCurrent + 1} / {frasesQuestions.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">Completa la frase</div>

                  <div className="bg-[#0a1628] border border-slate-700/30 rounded-xl px-4 py-4 space-y-2">
                    <SentenceWithBlank sentence={q.exercise.sentence} />
                    <p className="text-slate-600 text-xs mt-1">{q.verb.translation_es} · {q.verb.level}</p>
                  </div>

                  {frasesShowHint && (
                    <div className="bg-[#0a1628] border border-amber-500/20 rounded-xl px-4 py-3">
                      <p className="text-slate-400 text-xs mb-1">Pista:</p>
                      <p className="text-amber-300 text-sm">{q.exercise.hint_es}</p>
                    </div>
                  )}

                  <div className="relative">
                    <input value={frasesInput} onChange={e => setFrasesInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleFrasesSubmit() }}
                      disabled={frasesSubmitted}
                      placeholder="Escribe el phrasal verb…"
                      autoFocus
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-mono transition-all focus:outline-none
                        ${isOk ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                          : isWrong ? 'bg-red-500/10 border-red-500/50 text-red-300'
                          : 'bg-[#0a1628] border-slate-600/50 text-white focus:border-emerald-500/50'}`} />
                    {frasesSubmitted && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isOk ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                      </div>
                    )}
                  </div>

                  {!frasesSubmitted && (
                    <div className="flex gap-2">
                      <button onClick={handleFrasesSubmit} disabled={!frasesInput.trim()}
                        className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40
                                   border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-all">
                        Comprobar
                      </button>
                      {!frasesShowHint && (
                        <button onClick={() => setFrasesShowHint(true)}
                          className="flex items-center gap-1.5 border border-amber-500/30 text-amber-400
                                     hover:bg-amber-500/10 px-3 py-2.5 rounded-xl transition-colors text-xs">
                          <Lightbulb size={13} /> Pista
                        </button>
                      )}
                    </div>
                  )}

                  {frasesSubmitted && (
                    <div className={`rounded-xl p-3 text-sm ${isOk ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {isOk
                        ? `✓ Correcto: "${q.verb.phrasal_verb}"`
                        : `✗ Incorrecto. La respuesta es "${q.exercise.correct_answer}"`}
                    </div>
                  )}

                  {frasesSubmitted && (
                    <button onClick={nextFrasesQuestion}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                                 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      {frasesCurrent + 1 >= frasesQuestions.length ? 'Ver resultado' : 'Siguiente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {frasesPhase === 'done' && (() => {
            const pct = Math.round((frasesScore / frasesQuestions.length) * 100)
            const passed = pct >= 70
            return (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
                  <div className={`text-5xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</div>
                  <div className="text-slate-400 text-sm mb-6">{frasesScore} / {frasesQuestions.length} correctas</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCheck size={16} className="text-emerald-400 mx-auto mb-1" />
                      <div className="text-emerald-400 font-bold text-lg">{frasesScore}</div>
                      <div className="text-slate-500 text-xs">Correctas</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <XCircle size={16} className="text-red-400 mx-auto mb-1" />
                      <div className="text-red-400 font-bold text-lg">{frasesQuestions.length - frasesScore}</div>
                      <div className="text-slate-500 text-xs">Errores</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={startFrases}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      <RotateCcw size={14} className="inline mr-2" />Repetir
                    </button>
                    <button onClick={() => setFrasesPhase('config')}
                      className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
                      Cambiar configuración
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ── PhrasalVerbCard ───────────────────────────────────────────────────────────

interface CardProps {
  verb: LexPhrasalVerb
  expanded: boolean
  onToggle: () => void
  progress?: LexPhrasalVerbProgress
  onStatusChange?: (s: ProgressStatus) => void
  levelColor: string
  statusDot: string
}

function PhrasalVerbCard({ verb, expanded, onToggle, progress, onStatusChange, levelColor, statusDot }: CardProps) {
  const status = progress?.status ?? 'pending'
  return (
    <div className={`bg-[#0f2040] border rounded-2xl overflow-hidden transition-all
      ${expanded ? 'border-emerald-500/30' : 'border-slate-700/30 hover:border-slate-600/50'}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-base font-mono">{verb.phrasal_verb}</span>
            {verb.is_separable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-medium">sep.</span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelColor}`}>{verb.level}</span>
          </div>
          <p className="text-emerald-400/80 text-sm font-medium mt-0.5">{verb.translation_es}</p>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} title={status} />
        {expanded
          ? <ChevronUp size={16} className="text-emerald-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30 pt-4">
          <div className="space-y-1">
            <p className="text-slate-300 text-sm leading-relaxed">{verb.definition_es}</p>
            <p className="text-slate-500 text-xs italic">{verb.definition_en}</p>
          </div>
          <div className="bg-[#0a1628] border border-slate-700/30 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <BookOpen size={12} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Ejemplo</span>
            </div>
            <p className="text-white text-sm italic">"{verb.example_en}"</p>
            {verb.example_es && <p className="text-slate-400 text-xs">→ {verb.example_es}</p>}
          </div>
          {verb.notes && (
            <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <Lightbulb size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-xs leading-relaxed">{verb.notes}</p>
            </div>
          )}
          {onStatusChange && (
            <div className="flex gap-2 flex-wrap pt-1">
              {(Object.entries(STATUS_LABELS) as [ProgressStatus, string][]).map(([s, label]) => (
                <button key={s} onClick={() => onStatusChange(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all border
                    ${status === s
                      ? s === 'pending'   ? 'border-slate-600 bg-slate-700/50 text-slate-300'
                        : s === 'learning'  ? 'border-blue-500/30 bg-blue-500/15 text-blue-400'
                        : s === 'difficult' ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                        : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                      : 'border-slate-700/50 text-slate-500 hover:text-white hover:border-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sentence helpers ──────────────────────────────────────────────────────────

function SentenceWithBlank({ sentence }: { sentence: string }) {
  const parts = sentence.split('_____')
  if (parts.length === 1) return <p className="text-white text-sm leading-relaxed">{sentence}</p>
  return (
    <p className="text-white text-sm leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="inline-block bg-emerald-500/20 border-b-2 border-emerald-400 text-emerald-300
                             px-2 mx-0.5 rounded-sm font-mono text-xs tracking-widest">
              _____
            </span>
          )}
        </span>
      ))}
    </p>
  )
}
