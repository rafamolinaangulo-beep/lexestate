import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Link2, ChevronDown, ChevronUp, BookOpen, Layers, GraduationCap, Keyboard,
  CheckCircle, XCircle, RotateCcw, CheckCheck, ClipboardList,
} from 'lucide-react'
import type { LexPreposition, LexUser, ProgressStatus } from '../types'
import { fetchPrepositions, fetchPrepositionProgress, updatePrepositionProgress } from '../api'

interface Props { user: LexUser | null }

type Tab = 'list' | 'flashcards' | 'test' | 'frases'
type Phase = 'config' | 'session' | 'done'
type FraseMode = 'mcq' | 'tipo'
type VerbRating = 'unknown' | 'hard' | 'learning' | 'mastered'
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

const STATUS_DOT: Record<ProgressStatus, string> = {
  pending:   'bg-slate-600',
  learning:  'bg-blue-400',
  difficult: 'bg-amber-400',
  mastered:  'bg-emerald-400',
}

const RATING_BUTTONS: { value: VerbRating; label: string; color: string }[] = [
  { value: 'unknown',  label: 'No la sé',    color: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' },
  { value: 'hard',     label: 'Difícil',     color: 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
  { value: 'learning', label: 'Aprendiendo', color: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25' },
  { value: 'mastered', label: 'La domino',   color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
]

interface PrepQuestion {
  id: string
  preposition: string
  sentence: string
  correctAnswer: string
  options: string[]
  useCaseEs: string
  level: string
}

function blankSentence(prep: LexPreposition): string {
  const p = prep.preposition.toLowerCase()
  const lower = prep.example_en.toLowerCase()
  const idx = lower.indexOf(p)
  if (idx === -1) return prep.example_en + ' (___)'
  return prep.example_en.slice(0, idx) + '___' + prep.example_en.slice(idx + prep.preposition.length)
}

function normalize(s: string) { return s.trim().toLowerCase().replace(/\s+/g, ' ') }
function inputMatches(input: string, answer: string) {
  return answer.split('/').map(a => normalize(a)).some(a => normalize(input) === a)
}

export default function PrepositionsSection({ user }: Props) {
  const [items, setItems]     = useState<LexPreposition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('list')

  // List state
  const [levelFilter, setLevelFilter]     = useState<LevelFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expandedId, setExpandedId]       = useState<string | null>(null)

  // Flashcard state
  const [flashPhase, setFlashPhase]   = useState<Phase>('config')
  const [flashLevel, setFlashLevel]   = useState<LevelFilter>('all')
  const [flashDeck, setFlashDeck]     = useState<LexPreposition[]>([])
  const [flashIdx, setFlashIdx]       = useState(0)
  const [flashRevealed, setFlashRevealed] = useState(false)
  const [flashResults, setFlashResults]   = useState<{ id: string; rating: VerbRating }[]>([])

  // Test state (MCQ)
  const [testPhase, setTestPhase]     = useState<Phase>('config')
  const [testLevel, setTestLevel]     = useState<LevelFilter>('all')
  const [testCount, setTestCount]     = useState(10)
  const [testDeck, setTestDeck]       = useState<PrepQuestion[]>([])
  const [testIdx, setTestIdx]         = useState(0)
  const [testSelected, setTestSelected] = useState<string | null>(null)
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore]     = useState(0)

  // Frases state (MCQ + typing)
  const [frasesPhase, setFrasesPhase]   = useState<Phase>('config')
  const [frasesLevel, setFrasesLevel]   = useState<LevelFilter>('all')
  const [frasesMode, setFrasesMode]     = useState<FraseMode>('mcq')
  const [frasesCount, setFrasesCount]   = useState(10)
  const [frasesDeck, setFrasesDeck]     = useState<PrepQuestion[]>([])
  const [frasesIdx, setFrasesIdx]       = useState(0)
  const [frasesSelected, setFrasesSelected] = useState<string | null>(null)
  const [frasesSubmitted, setFrasesSubmitted] = useState(false)
  const [frasesScore, setFrasesScore]   = useState(0)
  const [dictInput, setDictInput]       = useState('')
  const dictRef = useRef<HTMLInputElement>(null)

  // Load
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPrepositions(), fetchPrepositionProgress().catch(() => [])])
      .then(([preps, prog]) => {
        const progMap = Object.fromEntries(prog.map(p => [p.preposition_id, p]))
        setItems(preps.map(p => ({ ...p, progress: progMap[p.id] })))
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  // Derived
  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category_es))).sort(), [items])
  const allPrepositions = useMemo(() => Array.from(new Set(items.map(i => i.preposition))), [items])

  const listFiltered = useMemo(() => {
    let pool = items
    if (levelFilter !== 'all') pool = pool.filter(i => i.level === levelFilter)
    if (categoryFilter) pool = pool.filter(i => i.category_es === categoryFilter)
    return pool
  }, [items, levelFilter, categoryFilter])

  const grouped = useMemo(() => {
    const g: Record<string, LexPreposition[]> = {}
    for (const i of listFiltered) {
      if (!g[i.preposition]) g[i.preposition] = []
      g[i.preposition].push(i)
    }
    return g
  }, [listFiltered])

  function makeQuestions(level: LevelFilter, count: number): PrepQuestion[] {
    let pool = level !== 'all' ? items.filter(i => i.level === level) : [...items]
    pool = pool.sort(() => Math.random() - 0.5).slice(0, count)
    return pool.map(p => {
      const wrong = allPrepositions
        .filter(ap => ap !== p.preposition)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
      return {
        id: p.id,
        preposition: p.preposition,
        sentence: blankSentence(p),
        correctAnswer: p.preposition,
        options: [p.preposition, ...wrong].sort(() => Math.random() - 0.5),
        useCaseEs: p.use_case_es,
        level: p.level,
      }
    })
  }

  // ── Flashcard actions ──────────────────────────────────────────────────────
  function startFlash() {
    let pool = flashLevel !== 'all' ? items.filter(i => i.level === flashLevel) : [...items]
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20)
    if (!pool.length) return
    setFlashDeck(pool)
    setFlashIdx(0)
    setFlashRevealed(false)
    setFlashResults([])
    setFlashPhase('session')
  }

  async function ratePrep(rating: VerbRating) {
    const item = flashDeck[flashIdx]
    const isCorrect = rating === 'learning' || rating === 'mastered'
    setFlashResults(prev => [...prev, { id: item.id, rating }])
    if (user) await updatePrepositionProgress(item.id, isCorrect).catch(() => {})
    if (flashIdx + 1 >= flashDeck.length) setFlashPhase('done')
    else { setFlashIdx(c => c + 1); setFlashRevealed(false) }
  }

  // ── Test actions ────────────────────────────────────────────────────────────
  function startTest() {
    const d = makeQuestions(testLevel, testCount)
    if (!d.length) return
    setTestDeck(d)
    setTestIdx(0)
    setTestSelected(null)
    setTestSubmitted(false)
    setTestScore(0)
    setTestPhase('session')
  }

  async function handleTestSelect(opt: string) {
    if (testSubmitted) return
    setTestSelected(opt)
    setTestSubmitted(true)
    const q = testDeck[testIdx]
    const correct = opt === q.correctAnswer
    if (correct) setTestScore(s => s + 1)
    if (user) await updatePrepositionProgress(q.id, correct).catch(() => {})
  }

  function nextTest() {
    if (testIdx + 1 >= testDeck.length) setTestPhase('done')
    else { setTestIdx(c => c + 1); setTestSelected(null); setTestSubmitted(false) }
  }

  // ── Frases actions ──────────────────────────────────────────────────────────
  function startFrases() {
    const d = makeQuestions(frasesLevel, frasesCount)
    if (!d.length) return
    setFrasesDeck(d)
    setFrasesIdx(0)
    setFrasesSelected(null)
    setFrasesSubmitted(false)
    setFrasesScore(0)
    setDictInput('')
    setFrasesPhase('session')
  }

  async function handleFrasesSelect(opt: string) {
    if (frasesSubmitted) return
    setFrasesSelected(opt)
    setFrasesSubmitted(true)
    const q = frasesDeck[frasesIdx]
    const correct = opt === q.correctAnswer
    if (correct) setFrasesScore(s => s + 1)
    if (user) await updatePrepositionProgress(q.id, correct).catch(() => {})
  }

  async function handleDictSubmit() {
    if (frasesSubmitted || !dictInput.trim()) return
    const q = frasesDeck[frasesIdx]
    const correct = inputMatches(dictInput, q.correctAnswer)
    setFrasesSelected(dictInput)
    setFrasesSubmitted(true)
    if (correct) setFrasesScore(s => s + 1)
    if (user) await updatePrepositionProgress(q.id, correct).catch(() => {})
  }

  function nextFrases() {
    if (frasesIdx + 1 >= frasesDeck.length) setFrasesPhase('done')
    else {
      setFrasesIdx(c => c + 1)
      setFrasesSelected(null)
      setFrasesSubmitted(false)
      setDictInput('')
    }
  }

  useEffect(() => {
    if (frasesPhase === 'session' && frasesMode === 'tipo' && !frasesSubmitted) {
      dictRef.current?.focus()
    }
  }, [frasesIdx, frasesPhase, frasesMode, frasesSubmitted])

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  )
  if (error) return <div className="text-center py-12 text-red-400 text-sm">{error}</div>

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'list',       label: 'Lista',      icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'test',       label: 'Test',       icon: ClipboardList },
    { id: 'frases',     label: 'Frases',     icon: GraduationCap },
  ]

  // ── Shared sub-components ───────────────────────────────────────────────────
  function LevelPills({ value, onChange }: { value: LevelFilter; onChange: (v: LevelFilter) => void }) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => onChange('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
            ${value === 'all' ? 'bg-emerald-500 text-white border-transparent' : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
          Todos
        </button>
        {LEVELS.map(l => (
          <button key={l} onClick={() => onChange(value === l ? 'all' : l)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${value === l ? LEVEL_ACTIVE[l] : 'border-slate-700/50 text-slate-400 hover:border-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>
    )
  }

  function ScoreCard({ score, total, onRetry, onConfig }: { score: number; total: number; onRetry: () => void; onConfig: () => void }) {
    const pct = Math.round((score / total) * 100)
    const passed = pct >= 70
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className={`text-5xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</div>
          <div className="text-slate-400 text-sm mb-6">{score} / {total} correctas</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <CheckCheck size={16} className="text-emerald-400 mx-auto mb-1" />
              <div className="text-emerald-400 font-bold text-lg">{score}</div>
              <div className="text-slate-500 text-xs">Correctas</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <XCircle size={16} className="text-red-400 mx-auto mb-1" />
              <div className="text-red-400 font-bold text-lg">{total - score}</div>
              <div className="text-slate-500 text-xs">Errores</div>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={onRetry}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              <RotateCcw size={14} className="inline mr-2" />Repetir
            </button>
            <button onClick={onConfig}
              className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
              Cambiar configuración
            </button>
          </div>
        </div>
      </div>
    )
  }

  function MCQButtons({ q, selected, submitted, onSelect }: {
    q: PrepQuestion; selected: string | null; submitted: boolean; onSelect: (o: string) => void
  }) {
    return (
      <div className="space-y-2">
        {q.options.map(opt => {
          let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
          if (submitted) {
            if (opt === q.correctAnswer) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            else if (opt === selected) style = 'border-red-500/50 bg-red-500/10 text-red-300'
            else style = 'border-slate-700/30 text-slate-600'
          } else if (opt === selected) style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
          return (
            <button key={opt} onClick={() => onSelect(opt)} disabled={submitted}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all flex items-center gap-3 ${style}`}>
              {submitted && opt === q.correctAnswer && <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />}
              {submitted && opt === selected && opt !== q.correctAnswer && <XCircle size={15} className="text-red-400 flex-shrink-0" />}
              <span>{opt}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link2 size={20} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Preposiciones</h1>
          <p className="text-slate-500 text-xs">Real Estate English · B1 a C2</p>
        </div>
        <span className="ml-auto text-slate-600 text-sm">{items.length} usos</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#0a1628] rounded-xl p-1 border border-emerald-500/10">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'text-slate-400 hover:text-white'}`}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ── LIST ─────────────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <LevelPills value={levelFilter} onChange={setLevelFilter} />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="ml-auto appearance-none bg-[#0f2040] border border-slate-700/50 rounded-xl
                         px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Level mini-stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {LEVELS.map(l => (
              <div key={l} className={`rounded-xl py-2 border ${LEVEL_COLORS[l]}`}>
                <div className="text-lg font-bold">{items.filter(i => i.level === l).length}</div>
                <div className="text-[10px] opacity-70">{l}</div>
              </div>
            ))}
          </div>

          {/* Grouped list */}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">No hay resultados.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([prep, entries]) => {
                const isOpen = expandedId === prep
                const levelSet = Array.from(new Set(entries.map(e => e.level)))
                const masteredCount = entries.filter(e => e.progress?.status === 'mastered').length
                return (
                  <div key={prep} className={`bg-[#0a1628] border rounded-2xl overflow-hidden transition-all
                    ${isOpen ? 'border-emerald-500/30' : 'border-slate-700/30 hover:border-slate-600/40'}`}>
                    <button onClick={() => setExpandedId(isOpen ? null : prep)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-lg">{prep}</span>
                          {levelSet.map(l => (
                            <span key={l} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[l]}`}>{l}</span>
                          ))}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {entries.length} {entries.length === 1 ? 'uso' : 'usos'}
                          {masteredCount > 0 && <span className="text-emerald-500 ml-2">· {masteredCount} dominado{masteredCount > 1 ? 's' : ''}</span>}
                        </p>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-emerald-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-slate-700/30 divide-y divide-slate-700/20">
                        {entries.map(entry => (
                          <div key={entry.id} className="px-5 py-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-slate-200 text-sm font-medium">{entry.use_case}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[entry.level]}`}>{entry.level}</span>
                                  <span className="text-[10px] text-slate-600 px-2 py-0.5 rounded-full border border-slate-700/50">{entry.category_es}</span>
                                </div>
                                <p className="text-slate-400 text-xs mt-0.5 italic">{entry.use_case_es}</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${STATUS_DOT[entry.progress?.status ?? 'pending']}`} />
                            </div>
                            <div className="bg-[#060d1a] rounded-xl px-4 py-3 space-y-1.5">
                              <p className="text-white text-sm italic">"{entry.example_en}"</p>
                              <p className="text-slate-500 text-xs">→ {entry.example_es}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-4 text-xs text-slate-600 flex-wrap">
            {(['pending','learning','difficult','mastered'] as ProgressStatus[]).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                <span>{{ pending: 'Sin empezar', learning: 'Aprendiendo', difficult: 'Difícil', mastered: 'Dominado' }[s]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FLASHCARDS ───────────────────────────────────────────────────────── */}
      {tab === 'flashcards' && (
        <>
          {flashPhase === 'config' && (
            <div className="max-w-md mx-auto">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Configurar sesión</h2>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <LevelPills value={flashLevel} onChange={setFlashLevel} />
                </div>
                <p className="text-slate-500 text-xs">
                  Verás la frase con un hueco. Intenta recordar la preposición antes de revelar.
                </p>
                <button onClick={startFlash}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  Empezar (20 tarjetas)
                </button>
              </div>
            </div>
          )}

          {flashPhase === 'session' && (() => {
            const item = flashDeck[flashIdx]
            const pct = (flashIdx / flashDeck.length) * 100
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Flashcards</span>
                  <span className="text-slate-400 text-sm">{flashIdx + 1} / {flashDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 min-h-[220px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[item.level]}`}>{item.level}</span>
                      <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded-full border border-slate-700/40">{item.category_es}</span>
                    </div>
                    <p className="text-white text-lg font-semibold leading-relaxed">{blankSentence(item)}</p>
                    <p className="text-slate-500 text-sm mt-2 italic">{item.use_case_es}</p>
                  </div>
                  {!flashRevealed ? (
                    <button onClick={() => setFlashRevealed(true)}
                      className="mt-5 w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                                 text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-all">
                      Revelar preposición
                    </button>
                  ) : (
                    <div className="mt-4 border-t border-slate-700/40 pt-4 space-y-3">
                      <div className="bg-[#0a1628] rounded-xl p-3 text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Preposición</div>
                        <div className="text-2xl font-bold text-emerald-400">{item.preposition}</div>
                      </div>
                      <p className="text-slate-400 text-sm italic">"{item.example_en}"</p>
                      <p className="text-slate-600 text-xs">→ {item.example_es}</p>
                    </div>
                  )}
                </div>
                {flashRevealed && (
                  <div className="grid grid-cols-2 gap-2">
                    {RATING_BUTTONS.map(rb => (
                      <button key={rb.value} onClick={() => ratePrep(rb.value)}
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
            const known = flashResults.filter(r => r.rating === 'learning' || r.rating === 'mastered').length
            const pct = Math.round((known / flashResults.length) * 100)
            return (
              <div className="max-w-md mx-auto">
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
                  <div className="text-5xl font-bold text-emerald-400 mb-1">{pct}%</div>
                  <div className="text-slate-400 text-sm mb-6">{known} de {flashResults.length} conocidas</div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {RATING_BUTTONS.map(rb => (
                      <div key={rb.value} className={`rounded-xl p-3 border ${rb.color}`}>
                        <div className="font-bold text-lg">{flashResults.filter(r => r.rating === rb.value).length}</div>
                        <div className="text-xs opacity-70">{rb.label}</div>
                      </div>
                    ))}
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

      {/* ── TEST ─────────────────────────────────────────────────────────────── */}
      {tab === 'test' && (
        <>
          {testPhase === 'config' && (
            <div className="max-w-md mx-auto">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Test de preposiciones</h2>
                <p className="text-slate-400 text-sm">Elige la preposición correcta para completar cada frase.</p>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <LevelPills value={testLevel} onChange={setTestLevel} />
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
            const q = testDeck[testIdx]
            const pct = (testIdx / testDeck.length) * 100
            const isCorrectAnswer = testSelected === q.correctAnswer
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Test</span>
                  <span className="text-slate-400 text-sm">{testIdx + 1} / {testDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Elige la preposición correcta</div>
                    <p className="text-white text-base leading-relaxed font-medium">{q.sentence}</p>
                    <p className="text-slate-500 text-xs mt-2 italic">{q.useCaseEs}</p>
                  </div>
                  <MCQButtons q={q} selected={testSelected} submitted={testSubmitted} onSelect={handleTestSelect} />
                  {testSubmitted && (
                    <div className={`rounded-xl p-3 text-sm ${isCorrectAnswer ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {isCorrectAnswer ? `✓ Correcto. La preposición es "${q.correctAnswer}".` : `✗ Incorrecto. La preposición correcta es "${q.correctAnswer}".`}
                    </div>
                  )}
                  {testSubmitted && (
                    <button onClick={nextTest}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      {testIdx + 1 >= testDeck.length ? 'Ver resultado' : 'Siguiente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {testPhase === 'done' && <ScoreCard score={testScore} total={testDeck.length} onRetry={startTest} onConfig={() => setTestPhase('config')} />}
        </>
      )}

      {/* ── FRASES ───────────────────────────────────────────────────────────── */}
      {tab === 'frases' && (
        <>
          {frasesPhase === 'config' && (
            <div className="max-w-md mx-auto">
              <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">Frases en contexto</h2>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Modo</label>
                  <div className="flex gap-2">
                    <button onClick={() => setFrasesMode('mcq')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                        ${frasesMode === 'mcq' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <GraduationCap size={14} /> Elegir opción
                    </button>
                    <button onClick={() => setFrasesMode('tipo')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all
                        ${frasesMode === 'tipo' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                      <Keyboard size={14} /> Escribir
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Nivel</label>
                  <LevelPills value={frasesLevel} onChange={setFrasesLevel} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Preguntas</label>
                  <div className="flex gap-2">
                    {([5, 10, 15, 20] as const).map(n => (
                      <button key={n} onClick={() => setFrasesCount(n)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all
                          ${frasesCount === n ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={startFrases}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  Empezar
                </button>
              </div>
            </div>
          )}

          {frasesPhase === 'session' && (() => {
            const q = frasesDeck[frasesIdx]
            const pct = (frasesIdx / frasesDeck.length) * 100
            const isCorrect = frasesMode === 'mcq' ? frasesSelected === q.correctAnswer : inputMatches(frasesSelected ?? '', q.correctAnswer)
            return (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Frases</span>
                  <span className="text-slate-400 text-sm">{frasesIdx + 1} / {frasesDeck.length}</span>
                </div>
                <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Completa la frase</div>
                    <p className="text-white text-base leading-relaxed font-medium">{q.sentence}</p>
                    <p className="text-slate-500 text-xs mt-2 italic">{q.useCaseEs}</p>
                  </div>

                  {frasesMode === 'mcq' ? (
                    <MCQButtons q={q} selected={frasesSelected} submitted={frasesSubmitted} onSelect={handleFrasesSelect} />
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input ref={dictRef} value={dictInput}
                          onChange={e => setDictInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleDictSubmit() }}
                          disabled={frasesSubmitted}
                          placeholder="Escribe la preposición…"
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all focus:outline-none
                            ${frasesSubmitted
                              ? isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' : 'bg-red-500/10 border-red-500/50 text-red-300'
                              : 'bg-[#0a1628] border-slate-600/50 text-white focus:border-emerald-500/50'}`} />
                        {frasesSubmitted && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isCorrect ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-red-400" />}
                          </div>
                        )}
                      </div>
                      {!frasesSubmitted && (
                        <button onClick={handleDictSubmit} disabled={!dictInput.trim()}
                          className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40
                                     border border-emerald-500/30 text-emerald-400 py-2.5 rounded-xl text-sm font-medium transition-all">
                          Comprobar
                        </button>
                      )}
                    </div>
                  )}

                  {frasesSubmitted && (
                    <div className={`rounded-xl p-3 text-sm ${isCorrect ? 'bg-emerald-500/8 text-emerald-300' : 'bg-red-500/8 text-red-300'}`}>
                      {isCorrect ? `✓ Correcto. La preposición es "${q.correctAnswer}".` : `✗ Incorrecto. La preposición correcta es "${q.correctAnswer}".`}
                    </div>
                  )}
                  {frasesSubmitted && (
                    <button onClick={nextFrases}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
                      {frasesIdx + 1 >= frasesDeck.length ? 'Ver resultado' : 'Siguiente'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {frasesPhase === 'done' && <ScoreCard score={frasesScore} total={frasesDeck.length} onRetry={startFrases} onConfig={() => setFrasesPhase('config')} />}
        </>
      )}
    </div>
  )
}
