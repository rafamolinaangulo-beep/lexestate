import { useState, useMemo, useRef, useEffect } from 'react'
import { BookOpen, Layers, GraduationCap, CheckCircle, XCircle, RotateCcw, Search, CheckCheck, ClipboardList, Keyboard } from 'lucide-react'
import type { LexVerb, LexUser, ProgressStatus } from '../types'
import { updateVerbProgress, setVerbStatus } from '../api'
import { updateLocalVerbProgress, setLocalVerbStatus } from '../localStorage'

interface Props {
  user: LexUser | null
  verbs: LexVerb[]
  verbsLoaded: boolean
}

type Tab = 'list' | 'flashcards' | 'frases' | 'test'
type FlashPhase = 'config' | 'session' | 'done'
type QuizPhase = 'config' | 'session' | 'done'
type VerbRating = 'unknown' | 'hard' | 'learning' | 'mastered'

interface VerbMCQ {
  verbId: string
  baseForm: string
  translationEs: string
  tense: 'past_simple' | 'past_participle'
  correctAnswer: string
  options: string[]
}

interface SentenceQuestion {
  verbId: string
  baseForm: string
  tense: 'past_simple' | 'past_participle'
  sentence: string
  correctAnswer: string
  options: string[]
}

const STATUS_DOT: Record<ProgressStatus | 'pending', string> = {
  pending:   'bg-slate-600',
  learning:  'bg-blue-400',
  difficult: 'bg-amber-400',
  mastered:  'bg-emerald-400',
}

const RATING_BUTTONS: { value: VerbRating; label: string; color: string }[] = [
  { value: 'unknown',  label: 'No lo sé',    color: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' },
  { value: 'hard',     label: 'Difícil',     color: 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
  { value: 'learning', label: 'Aprendiendo', color: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25' },
  { value: 'mastered', label: 'Lo domino',   color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
]

function ratingToCorrect(r: VerbRating): boolean {
  return r === 'learning' || r === 'mastered'
}

function buildSentenceQuestions(verbs: LexVerb[]): SentenceQuestion[] {
  const questions: SentenceQuestion[] = []
  for (const v of verbs) {
    if (v.example_past) {
      questions.push({
        verbId: v.id, baseForm: v.base_form,
        tense: 'past_simple', sentence: v.example_past,
        correctAnswer: v.past_simple.split('/')[0].trim(),
        options: [],
      })
    }
    if (v.example_participle) {
      questions.push({
        verbId: v.id, baseForm: v.base_form,
        tense: 'past_participle', sentence: v.example_participle,
        correctAnswer: v.past_participle.split('/')[0].trim(),
        options: [],
      })
    }
  }
  return questions
}

function addDistractors(q: SentenceQuestion, allVerbs: LexVerb[]): SentenceQuestion {
  const pool = allVerbs
    .filter(v => v.id !== q.verbId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
  const wrong = (q.tense === 'past_simple'
    ? pool.map(v => v.past_simple.split('/')[0].trim())
    : pool.map(v => v.past_participle.split('/')[0].trim())
  ).filter(w => w !== q.correctAnswer)
  const options = [q.correctAnswer, ...wrong.slice(0, 3)].sort(() => Math.random() - 0.5)
  return { ...q, options }
}

type LevelFilter = 'all' | 'B1' | 'B2' | 'C1' | 'C2'

const LEVELS: Exclude<LevelFilter, 'all'>[] = ['B1', 'B2', 'C1', 'C2']

const LEVEL_COLORS: Record<string, string> = {
  B1: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  B2: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  C1: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  C2: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}
const LEVEL_ACTIVE: Record<string, string> = {
  B1: 'bg-sky-500 text-white border-transparent',
  B2: 'bg-violet-500 text-white border-transparent',
  C1: 'bg-amber-500 text-black border-transparent',
  C2: 'bg-rose-500 text-white border-transparent',
}

export default function VerbsSection({ user, verbs, verbsLoaded }: Props) {
  const [tab, setTab] = useState<Tab>('list')

  // List state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'irregular'>('all')
  const [search, setSearch] = useState('')

  // Flashcard state
  const [flashPhase, setFlashPhase] = useState<FlashPhase>('config')
  const [flashLevel, setFlashLevel] = useState<LevelFilter>('all')
  const [flashFilter, setFlashFilter] = useState<'all' | 'regular' | 'irregular'>('all')
  const [flashDeck, setFlashDeck] = useState<LexVerb[]>([])
  const [flashCurrent, setFlashCurrent] = useState(0)
  const [flashRevealed, setFlashRevealed] = useState(false)
  const [flashResults, setFlashResults] = useState<{ verbId: string; rating: VerbRating }[]>([])

  // Frases quiz state
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('config')
  const [quizLevel, setQuizLevel] = useState<LevelFilter>('all')
  const [quizFilter, setQuizFilter] = useState<'all' | 'regular' | 'irregular'>('all')
  const [quizMode, setQuizMode] = useState<'mcq' | 'tipo'>('mcq')
  const [quizDeck, setQuizDeck] = useState<SentenceQuestion[]>([])
  const [quizCurrent, setQuizCurrent] = useState(0)
  const [quizSelected, setQuizSelected] = useState<string | null>(null)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizCount, setQuizCount] = useState(10)
  const [dictInput, setDictInput] = useState('')
  const dictInputRef = useRef<HTMLInputElement>(null)

  // Verb MCQ test state
  const [testPhase, setTestPhase] = useState<QuizPhase>('config')
  const [testLevel, setTestLevel] = useState<LevelFilter>('all')
  const [testFilter, setTestFilter] = useState<'all' | 'regular' | 'irregular'>('all')
  const [testTense, setTestTense]   = useState<'both' | 'past_simple' | 'past_participle'>('both')
  const [testDeck, setTestDeck]     = useState<VerbMCQ[]>([])
  const [testCurrent, setTestCurrent] = useState(0)
  const [testSelected, setTestSelected] = useState<string | null>(null)
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore]   = useState(0)
  const [testCount, setTestCount]   = useState(10)

  // ── List ──────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let pool = verbs
    if (levelFilter !== 'all') pool = pool.filter(v => v.level === levelFilter)
    if (typeFilter !== 'all') pool = pool.filter(v => v.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      pool = pool.filter(v =>
        v.base_form.includes(q) ||
        v.past_simple.toLowerCase().includes(q) ||
        v.past_participle.toLowerCase().includes(q) ||
        v.translation_es.toLowerCase().includes(q)
      )
    }
    return pool
  }, [verbs, levelFilter, typeFilter, search])

  const grouped = useMemo(() => {
    if (levelFilter !== 'all') return null
    const g: Record<string, LexVerb[]> = {}
    for (const v of filtered) {
      if (!g[v.level]) g[v.level] = []
      g[v.level].push(v)
    }
    return g
  }, [filtered, levelFilter])

  const progressMap = useMemo(() => {
    const m: Record<string, ProgressStatus> = {}
    for (const v of verbs) {
      if (v.progress?.status) m[v.id] = v.progress.status
    }
    return m
  }, [verbs])

  // ── Flashcard actions ────────────────────────────────────────────────────────
  function startFlash() {
    let pool = flashLevel !== 'all' ? verbs.filter(v => v.level === flashLevel) : [...verbs]
    if (flashFilter !== 'all') pool = pool.filter(v => v.type === flashFilter)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20)
    if (!pool.length) return
    setFlashDeck(pool)
    setFlashCurrent(0)
    setFlashRevealed(false)
    setFlashResults([])
    setFlashPhase('session')
  }

  async function rateVerb(rating: VerbRating) {
    const verb = flashDeck[flashCurrent]
    const isCorrect = ratingToCorrect(rating)
    setFlashResults(prev => [...prev, { verbId: verb.id, rating }])

    if (rating === 'mastered') {
      user ? await setVerbStatus(verb.id, 'mastered').catch(() => {}) : setLocalVerbStatus(verb.id, 'mastered')
    } else {
      user
        ? await updateVerbProgress(verb.id, isCorrect, 'flashcard').catch(() => {})
        : updateLocalVerbProgress(verb.id, isCorrect)
    }

    if (flashCurrent + 1 >= flashDeck.length) {
      setFlashPhase('done')
    } else {
      setFlashCurrent(c => c + 1)
      setFlashRevealed(false)
    }
  }

  // ── Frases quiz actions ──────────────────────────────────────────────────────
  function normalizeVerb(s: string) { return s.trim().toLowerCase().replace(/\s+/g, ' ') }
  function verbInputCorrect(input: string, answer: string) {
    const u = normalizeVerb(input)
    return answer.split('/').map(a => normalizeVerb(a)).some(a => u === a)
  }

  function startQuiz() {
    let pool = quizLevel !== 'all' ? verbs.filter(v => v.level === quizLevel) : [...verbs]
    if (quizFilter !== 'all') pool = pool.filter(v => v.type === quizFilter)
    let qs = buildSentenceQuestions(pool)
    qs = qs.sort(() => Math.random() - 0.5).slice(0, quizCount)
    qs = qs.map(q => addDistractors(q, verbs))
    if (!qs.length) return
    setQuizDeck(qs)
    setQuizCurrent(0)
    setQuizSelected(null)
    setQuizSubmitted(false)
    setQuizScore(0)
    setQuizPhase('session')
  }

  async function handleQuizSelect(option: string) {
    if (quizSubmitted) return
    setQuizSelected(option)
    setQuizSubmitted(true)
    const q = quizDeck[quizCurrent]
    const correct = option === q.correctAnswer
    if (correct) setQuizScore(s => s + 1)
    user
      ? updateVerbProgress(q.verbId, correct, 'frases').catch(() => {})
      : updateLocalVerbProgress(q.verbId, correct)
  }

  async function handleDictSubmit() {
    if (quizSubmitted || !dictInput.trim()) return
    const q = quizDeck[quizCurrent]
    const correct = verbInputCorrect(dictInput, q.correctAnswer)
    setQuizSelected(dictInput)
    setQuizSubmitted(true)
    if (correct) setQuizScore(s => s + 1)
    user
      ? updateVerbProgress(q.verbId, correct, 'frases').catch(() => {})
      : updateLocalVerbProgress(q.verbId, correct)
  }

  function nextQuestion() {
    if (quizCurrent + 1 >= quizDeck.length) {
      setQuizPhase('done')
    } else {
      setQuizCurrent(c => c + 1)
      setQuizSelected(null)
      setQuizSubmitted(false)
      setDictInput('')
    }
  }

  useEffect(() => {
    if (quizPhase === 'session' && quizMode === 'tipo' && !quizSubmitted) {
      dictInputRef.current?.focus()
    }
  }, [quizCurrent, quizPhase, quizMode, quizSubmitted])

  // ── Verb MCQ test actions ────────────────────────────────────────────────────
  function buildMCQ(pool: LexVerb[], count: number, tense: typeof testTense): VerbMCQ[] {
    const tenses: ('past_simple' | 'past_participle')[] =
      tense === 'both' ? ['past_simple', 'past_participle'] : [tense]
    const items: VerbMCQ[] = []
    for (const v of pool) {
      for (const t of tenses) {
        items.push({
          verbId: v.id, baseForm: v.base_form, translationEs: v.translation_es,
          tense: t,
          correctAnswer: t === 'past_simple' ? v.past_simple.split('/')[0].trim() : v.past_participle.split('/')[0].trim(),
          options: [],
        })
      }
    }
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, count)
    return shuffled.map(q => {
      const wrong = pool
        .filter(v => v.id !== q.verbId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map(v => q.tense === 'past_simple' ? v.past_simple.split('/')[0].trim() : v.past_participle.split('/')[0].trim())
        .filter(w => w !== q.correctAnswer)
        .slice(0, 3)
      return { ...q, options: [q.correctAnswer, ...wrong].sort(() => Math.random() - 0.5) }
    })
  }

  function startTest() {
    let pool = testLevel !== 'all' ? verbs.filter(v => v.level === testLevel) : [...verbs]
    if (testFilter !== 'all') pool = pool.filter(v => v.type === testFilter)
    const deck = buildMCQ(pool, testCount, testTense)
    if (!deck.length) return
    setTestDeck(deck)
    setTestCurrent(0)
    setTestSelected(null)
    setTestSubmitted(false)
    setTestScore(0)
    setTestPhase('session')
  }

  async function handleTestSelect(option: string) {
    if (testSubmitted) return
    setTestSelected(option)
    setTestSubmitted(true)
    const q = testDeck[testCurrent]
    const correct = option === q.correctAnswer
    if (correct) setTestScore(s => s + 1)
    user
      ? updateVerbProgress(q.verbId, correct, 'test').catch(() => {})
      : updateLocalVerbProgress(q.verbId, correct)
  }

  function nextTestQuestion() {
    if (testCurrent + 1 >= testDeck.length) {
      setTestPhase('done')
    } else {
      setTestCurrent(c => c + 1)
      setTestSelected(null)
      setTestSubmitted(false)
    }
  }

  if (!verbsLoaded) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  // ── Tab bar ──────────────────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'list',       label: 'Lista',      icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'test',       label: 'Test',       icon: ClipboardList },
    { id: 'frases',     label: 'Frases',     icon: GraduationCap },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Verbos</h1>
        <span className="text-slate-500 text-sm">{verbs.length} verbos</span>
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
          {/* Level pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setLevelFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${levelFilter === 'all'
                  ? 'bg-emerald-500 text-white border-transparent'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
              Todos
            </button>
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevelFilter(levelFilter === l ? 'all' : l)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                  ${levelFilter === l
                    ? LEVEL_ACTIVE[l]
                    : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Type + Search row */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar verbo…"
                className="w-full bg-[#0f2040] border border-slate-700/40 rounded-xl pl-9 pr-3 py-2
                           text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40" />
            </div>
            <div className="flex gap-1 bg-[#0a1628] rounded-xl p-1 border border-emerald-500/10">
              {(['all','irregular','regular'] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${typeFilter === f ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                  {f === 'all' ? 'Todos' : f === 'irregular' ? 'Irregulares' : 'Regulares'}
                </button>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Total',       value: filtered.length,                                     color: 'text-white' },
              { label: 'Irregulares', value: filtered.filter(v => v.type === 'irregular').length,  color: 'text-amber-400' },
              { label: 'Regulares',   value: filtered.filter(v => v.type === 'regular').length,    color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#0f2040] border border-slate-700/30 rounded-xl py-2 px-3">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-500 text-[11px]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table header */}
          <div className="bg-[#0a1628] border border-emerald-500/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5
                            text-[10px] font-semibold uppercase tracking-wider text-slate-500
                            border-b border-emerald-500/10">
              <span>Infinitivo</span>
              <span>Past Simple</span>
              <span>Past Participle</span>
              <span>Traducción</span>
              <span className="w-14" />
            </div>

            <div className="divide-y divide-slate-700/20 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">No se encontraron verbos.</div>
              ) : grouped ? (
                /* Grouped by level when filter = 'all' */
                LEVELS.filter(l => grouped[l]?.length).map(level => (
                  <div key={level}>
                    {/* Level separator row */}
                    <div className={`flex items-center gap-2 px-4 py-2 border-b border-slate-700/20
                                     bg-[#060d1a]/60`}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[level]}`}>
                        {level}
                      </span>
                      <span className="text-slate-600 text-[10px]">{grouped[level].length} verbos</span>
                    </div>
                    {grouped[level].map(v => <VerbRow key={v.id} v={v} progressMap={progressMap} showLevel={false} />)}
                  </div>
                ))
              ) : (
                /* Flat list when specific level selected */
                filtered.map(v => <VerbRow key={v.id} v={v} progressMap={progressMap} showLevel={false} />)
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-slate-600">
            {([['pending','Sin empezar'],['learning','Aprendiendo'],['difficult','Difícil'],['mastered','Dominado']] as [ProgressStatus, string][]).map(([s, label]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                <span>{label}</span>
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
                    <button onClick={() => setFlashLevel('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${flashLevel === 'all' ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                      Todos
                    </button>
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => setFlashLevel(flashLevel === l ? 'all' : l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${flashLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Tipo de verbos</label>
                  <div className="flex gap-2">
                    {(['all','irregular','regular'] as const).map(f => (
                      <button key={f} onClick={() => setFlashFilter(f)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                          ${flashFilter === f ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        {f === 'all' ? 'Todos' : f === 'irregular' ? 'Irregulares' : 'Regulares'}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-slate-500 text-xs">
                  Se mostrarán 20 verbos aleatorios. Verás el infinitivo y deberás recordar el Past Simple y el Past Participle.
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded
                        ${verb.type === 'irregular' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {verb.type === 'irregular' ? 'IRREGULAR' : 'REGULAR'}
                      </span>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-1">{verb.base_form}</h2>
                    <p className="text-slate-400 text-base">{verb.translation_es}</p>
                  </div>

                  {!flashRevealed ? (
                    <button onClick={() => setFlashRevealed(true)}
                      className="mt-5 w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                                 text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-all
                                 flex items-center justify-center gap-2">
                      <BookOpen size={15} />
                      Revelar formas verbales
                    </button>
                  ) : (
                    <div className="mt-4 border-t border-slate-700/40 pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0a1628] rounded-xl p-3">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Past Simple</div>
                          <div className="text-white font-semibold">{verb.past_simple}</div>
                        </div>
                        <div className="bg-[#0a1628] rounded-xl p-3">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Past Participle</div>
                          <div className="text-white font-semibold">{verb.past_participle}</div>
                        </div>
                      </div>
                      {verb.notes && (
                        <p className="text-slate-500 text-xs italic">{verb.notes}</p>
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
                  <div className="text-slate-400 text-sm mb-6">{known} de {flashResults.length} verbos</div>
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

      {/* ── FRASES TAB ──────────────────────────────────────────────────────── */}
      {tab === 'frases' && (
        <>
          {quizPhase === 'config' && (() => {
            let quizPool = quizLevel !== 'all' ? verbs.filter(v => v.level === quizLevel) : verbs
            if (quizFilter !== 'all') quizPool = quizPool.filter(v => v.type === quizFilter)
            const available = buildSentenceQuestions(quizPool).length
            return (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                  <h2 className="text-white font-semibold">Práctica con frases</h2>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Modo de práctica</label>
                    <div className="flex gap-2">
                      <button onClick={() => setQuizMode('mcq')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                          ${quizMode === 'mcq' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        <GraduationCap size={14} /> Elegir opción
                      </button>
                      <button onClick={() => setQuizMode('tipo')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                          ${quizMode === 'tipo' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        <Keyboard size={14} /> Escribir
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setQuizLevel('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${quizLevel === 'all' ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        Todos
                      </button>
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => setQuizLevel(quizLevel === l ? 'all' : l)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${quizLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Número de preguntas</label>
                    <div className="flex gap-2">
                      {([5, 10, 15, 20] as const).map(n => (
                        <button key={n} onClick={() => setQuizCount(n)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all
                            ${quizCount === n ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Tipo de verbos</label>
                    <div className="flex gap-2">
                      {(['all','irregular','regular'] as const).map(f => (
                        <button key={f} onClick={() => setQuizFilter(f)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                            ${quizFilter === f ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                          {f === 'all' ? 'Todos' : f === 'irregular' ? 'IRR' : 'REG'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {available < quizCount && (
                    <p className="text-amber-400/80 text-xs">
                      Solo hay {available} frases disponibles con este filtro. Se usarán todas.
                    </p>
                  )}
                  <button onClick={startQuiz} disabled={available === 0}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
                    Empezar ({Math.min(quizCount, available)} preguntas)
                  </button>
                </div>
              </div>
            )
          })()}

          {quizPhase === 'session' && (() => {
            const q = quizDeck[quizCurrent]
            const pct = (quizCurrent / quizDeck.length) * 100
            const tenseLabel = q.tense === 'past_simple' ? 'Past Simple' : 'Past Participle'
            const displaySentence = q.sentence.replace('___', '________')

            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Frases</span>
                  <span className="text-slate-400 text-sm">{quizCurrent + 1} / {quizDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                        Completa con el {tenseLabel} de
                      </span>
                      <span className="font-bold text-white text-sm">"{q.baseForm}"</span>
                    </div>
                    <p className="text-white text-base leading-relaxed">{displaySentence}</p>
                  </div>

                  {quizMode === 'mcq' ? (
                    <div className="space-y-2">
                      {q.options.map(opt => {
                        let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
                        if (quizSubmitted) {
                          if (opt === q.correctAnswer) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          else if (opt === quizSelected) style = 'border-red-500/50 bg-red-500/10 text-red-300'
                          else style = 'border-slate-700/30 text-slate-600'
                        } else if (opt === quizSelected) {
                          style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        }
                        return (
                          <button key={opt} onClick={() => handleQuizSelect(opt)} disabled={quizSubmitted}
                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${style}`}>
                            {quizSubmitted && opt === q.correctAnswer && <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />}
                            {quizSubmitted && opt === quizSelected && opt !== q.correctAnswer && <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          ref={dictInputRef}
                          value={dictInput}
                          onChange={e => setDictInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleDictSubmit() }}
                          disabled={quizSubmitted}
                          placeholder={`Escribe el ${tenseLabel.toLowerCase()}…`}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all focus:outline-none
                            ${quizSubmitted
                              ? verbInputCorrect(quizSelected ?? '', q.correctAnswer)
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                                : 'bg-red-500/10 border-red-500/50 text-red-300'
                              : 'bg-[#0a1628] border-slate-600/50 text-white focus:border-emerald-500/50'}`}
                        />
                        {quizSubmitted && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {verbInputCorrect(quizSelected ?? '', q.correctAnswer)
                              ? <CheckCircle size={16} className="text-emerald-400" />
                              : <XCircle size={16} className="text-red-400" />}
                          </div>
                        )}
                      </div>
                      {!quizSubmitted && (
                        <button onClick={handleDictSubmit} disabled={!dictInput.trim()}
                          className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40
                                     border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-all">
                          Comprobar
                        </button>
                      )}
                    </div>
                  )}

                  {quizSubmitted && (
                    <div className={`rounded-xl p-3 text-sm
                      ${(quizMode === 'mcq' ? quizSelected === q.correctAnswer : verbInputCorrect(quizSelected ?? '', q.correctAnswer))
                        ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {(quizMode === 'mcq' ? quizSelected === q.correctAnswer : verbInputCorrect(quizSelected ?? '', q.correctAnswer))
                        ? `✓ Correcto. "${q.baseForm}" → ${q.tense === 'past_simple' ? 'past simple' : 'past participle'}: ${q.correctAnswer}`
                        : `✗ Incorrecto. La forma correcta es "${q.correctAnswer}"`}
                    </div>
                  )}

                  {quizSubmitted && (
                    <button onClick={nextQuestion}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                                 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      {quizCurrent + 1 >= quizDeck.length ? 'Ver resultado' : 'Siguiente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {quizPhase === 'done' && (() => {
            const pct = Math.round((quizScore / quizDeck.length) * 100)
            const passed = pct >= 70
            return (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
                  <div className={`text-5xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</div>
                  <div className="text-slate-400 text-sm mb-6">{quizScore} / {quizDeck.length} correctas</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <CheckCheck size={16} className="text-emerald-400 mx-auto mb-1" />
                      <div className="text-emerald-400 font-bold text-lg">{quizScore}</div>
                      <div className="text-slate-500 text-xs">Correctas</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <XCircle size={16} className="text-red-400 mx-auto mb-1" />
                      <div className="text-red-400 font-bold text-lg">{quizDeck.length - quizScore}</div>
                      <div className="text-slate-500 text-xs">Errores</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={startQuiz}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      <RotateCcw size={14} className="inline mr-2" />
                      Repetir test
                    </button>
                    <button onClick={() => setQuizPhase('config')}
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

      {/* ── TEST TAB (verb MCQ) ─────────────────────────────────────────────── */}
      {tab === 'test' && (
        <>
          {testPhase === 'config' && (
            <div className="max-w-md mx-auto space-y-5">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Test de formas verbales</h2>
                <p className="text-slate-400 text-sm">
                  Se muestra el infinitivo y debes elegir la forma correcta.
                </p>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => setTestLevel('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${testLevel === 'all' ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                      Todos
                    </button>
                    {LEVELS.map(l => (
                      <button key={l} onClick={() => setTestLevel(testLevel === l ? 'all' : l)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                          ${testLevel === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Tiempo verbal</label>
                  <div className="flex gap-2">
                    {([['both','Ambos'],['past_simple','Past Simple'],['past_participle','Past Part.']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setTestTense(v)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all
                          ${testTense === v ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Tipo de verbos</label>
                  <div className="flex gap-2">
                    {(['all','irregular','regular'] as const).map(f => (
                      <button key={f} onClick={() => setTestFilter(f)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all
                          ${testFilter === f ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        {f === 'all' ? 'Todos' : f === 'irregular' ? 'IRR' : 'REG'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Preguntas</label>
                  <div className="flex gap-2">
                    {([5, 10, 20, 30] as const).map(n => (
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
            const q = testDeck[testCurrent]
            const pct = (testCurrent / testDeck.length) * 100
            const tenseLabel = q.tense === 'past_simple' ? 'Past Simple' : 'Past Participle'
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Test verbos</span>
                  <span className="text-slate-400 text-sm">{testCurrent + 1} / {testDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      ¿Cuál es el {tenseLabel} de…?
                    </div>
                    <div className="text-4xl font-bold text-white">{q.baseForm}</div>
                    <div className="text-slate-400 text-sm mt-1">{q.translationEs}</div>
                  </div>

                  <div className="space-y-2">
                    {q.options.map(opt => {
                      let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
                      if (testSubmitted) {
                        if (opt === q.correctAnswer) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        else if (opt === testSelected) style = 'border-red-500/50 bg-red-500/10 text-red-300'
                        else style = 'border-slate-700/30 text-slate-600'
                      } else if (opt === testSelected) {
                        style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      }
                      return (
                        <button key={opt} onClick={() => handleTestSelect(opt)} disabled={testSubmitted}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-3 ${style}`}>
                          {testSubmitted && opt === q.correctAnswer && <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />}
                          {testSubmitted && opt === testSelected && opt !== q.correctAnswer && <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                          <span>{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {testSubmitted && (
                    <div className={`rounded-xl p-3 text-sm ${testSelected === q.correctAnswer ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {testSelected === q.correctAnswer
                        ? `✓ Correcto. ${tenseLabel} de "${q.baseForm}": ${q.correctAnswer}`
                        : `✗ Incorrecto. ${tenseLabel} de "${q.baseForm}" es "${q.correctAnswer}"`}
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
                      <RotateCcw size={14} className="inline mr-2" />
                      Repetir test
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
    </div>
  )
}

// ── Helper component ──────────────────────────────────────────────────────────
function VerbRow({ v, progressMap, showLevel }: { v: LexVerb; progressMap: Record<string, ProgressStatus>; showLevel: boolean }) {
  const status = progressMap[v.id] ?? 'pending'
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 items-center
                    hover:bg-white/[0.02] transition-colors">
      <div>
        <span className="text-white font-semibold text-sm">{v.base_form}</span>
        {showLevel && (
          <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${LEVEL_COLORS[v.level]}`}>
            {v.level}
          </span>
        )}
        {v.notes && (
          <div className="text-slate-600 text-[10px] leading-tight mt-0.5 truncate" title={v.notes}>{v.notes}</div>
        )}
      </div>
      <span className="text-slate-300 text-sm">{v.past_simple}</span>
      <span className="text-slate-300 text-sm">{v.past_participle}</span>
      <span className="text-slate-400 text-xs truncate">{v.translation_es}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} title={status} />
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
          ${v.type === 'irregular' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {v.type === 'irregular' ? 'IRR' : 'REG'}
        </span>
      </div>
    </div>
  )
}
