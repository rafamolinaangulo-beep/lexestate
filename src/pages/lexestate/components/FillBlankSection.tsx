import { useState, useMemo } from 'react'
import { PenLine, CheckCircle, XCircle, ArrowRight, Volume2, Lightbulb } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser } from '../types'
import { updateProgress } from '../api'
import { updateLocalProgress, recordStudyActivity, savePracticeResult } from '../localStorage'
import { speak } from '../tts'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
}

type Phase = 'config' | 'session' | 'done'

interface FillQuestion {
  termId: string
  wordEn: string
  translationEs: string
  sentence: string
  options: string[]
  correct: string
  level: string
  exampleEs?: string | null
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSentence(term: LexTerm): string | null {
  if (!term.example_en) return null
  const re = new RegExp(`\\b${escapeRegex(term.word_en)}(s|ed|ing|'s)?\\b`, 'i')
  if (!re.test(term.example_en)) return null
  return term.example_en.replace(re, '___')
}

function generateQuestions(terms: LexTerm[], count: number, catFilter: string, levelFilter: string): FillQuestion[] {
  let pool = [...terms]
  if (catFilter) pool = pool.filter(t => t.category_id === catFilter)
  if (levelFilter) pool = pool.filter(t => t.level === levelFilter)
  pool = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count * 3, pool.length))

  const questions: FillQuestion[] = []

  for (const term of pool) {
    if (questions.length >= count) break
    const sentence = buildSentence(term) ??
      `The English term for "${term.translation_es}" is ___.`

    // Distractors: other words from the same pool
    const distractors = pool
      .filter(t => t.id !== term.id && t.word_en !== term.word_en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(t => t.word_en)

    if (distractors.length < 3) continue

    questions.push({
      termId: term.id,
      wordEn: term.word_en,
      translationEs: term.translation_es,
      sentence,
      options: [term.word_en, ...distractors].sort(() => Math.random() - 0.5),
      correct: term.word_en,
      level: term.level,
      exampleEs: term.example_es,
    })
  }

  return questions
}

export default function FillBlankSection({ user, terms, categories, dataLoaded }: Props) {
  const [phase, setPhase] = useState<Phase>('config')
  const [catFilter, setCatFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [count, setCount] = useState<10 | 15 | 20>(10)
  const [questions, setQuestions] = useState<FillQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const available = useMemo(() => {
    let pool = [...terms]
    if (catFilter) pool = pool.filter(t => t.category_id === catFilter)
    if (levelFilter) pool = pool.filter(t => t.level === levelFilter)
    return pool.length
  }, [terms, catFilter, levelFilter])

  function buildQuiz() {
    const qs = generateQuestions(terms, count, catFilter, levelFilter)
    if (qs.length === 0) return
    setQuestions(qs)
    setCurrent(0)
    setSelected(null)
    setSubmitted(false)
    setScore(0)
    setPhase('session')
  }

  function handleSelect(opt: string) {
    if (submitted) return
    setSelected(opt)
    setSubmitted(true)
    const q = questions[current]
    const correct = opt === q.correct
    if (correct) setScore(s => s + 1)
    if (user) {
      updateProgress(q.termId, correct, 'fill_blank', 'fill_blank').catch(() => {})
    } else {
      updateLocalProgress(q.termId, correct)
    }
  }

  function next() {
    if (current + 1 >= questions.length) {
      savePracticeResult('fill_blank', score, questions.length)
      recordStudyActivity()
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  if (!dataLoaded) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (phase === 'config') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <PenLine size={20} className="text-emerald-400" />
            Rellena los huecos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Completa frases reales de inglés inmobiliario eligiendo el término correcto.
          </p>
        </div>

        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Número de ejercicios</label>
            <div className="grid grid-cols-3 gap-2">
              {([10, 15, 20] as const).map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all
                    ${count === n
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nivel</label>
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todos los niveles</option>
              {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button onClick={buildQuiz} disabled={available < 4}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                       text-white font-semibold py-3 rounded-xl transition-colors">
            {available < 4 ? 'No hay suficientes términos' : `Empezar (${Math.min(count, available)} ejercicios)`}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Ejercicio completado</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className={`text-5xl font-bold mb-1 ${pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pct}%
          </div>
          <div className="text-slate-400 text-sm mb-6">{score} de {questions.length} correctas</div>
          <div className="space-y-2">
            <button onClick={buildQuiz}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Nuevo ejercicio
            </button>
            <button onClick={() => setPhase('config')}
              className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
              Cambiar filtros
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const progress = (current / questions.length) * 100

  // Render sentence with blank highlighted
  const sentenceParts = q.sentence.split('___')

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <PenLine size={18} className="text-emerald-400" />
          Rellena los huecos
        </h1>
        <span className="text-slate-400 text-sm">{current + 1} / {questions.length}</span>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
             style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
        {/* Level badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Completa la frase</span>
          <span className="text-xs font-bold text-slate-400 bg-slate-700/40 rounded px-2 py-0.5">
            {q.level}
          </span>
        </div>

        {/* Sentence with blank */}
        <div className="text-white text-base leading-relaxed bg-slate-800/40 rounded-xl p-4">
          {sentenceParts[0]}
          <span className="inline-flex items-center">
            {submitted ? (
              <span className={`font-bold px-1 ${q.correct === selected ? 'text-emerald-400' : 'text-red-400'}`}>
                {q.correct}
              </span>
            ) : (
              <span className="inline-block w-24 border-b-2 border-emerald-500/60 mx-1 text-center">
                &nbsp;
              </span>
            )}
          </span>
          {sentenceParts[1]}
        </div>

        {/* Translation hint */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lightbulb size={12} className="flex-shrink-0" />
          {q.translationEs}
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {q.options.map(opt => {
            let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
            if (submitted) {
              if (opt === q.correct) {
                style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              } else if (opt === selected && opt !== q.correct) {
                style = 'border-red-500/50 bg-red-500/10 text-red-300'
              } else {
                style = 'border-slate-700/20 text-slate-600'
              }
            } else if (opt === selected) {
              style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            }
            return (
              <button key={opt} onClick={() => handleSelect(opt)} disabled={submitted}
                className={`border rounded-xl py-3 px-4 text-sm text-left transition-all
                           flex items-center gap-2 ${style}`}>
                {submitted && opt === q.correct && <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />}
                {submitted && opt === selected && opt !== q.correct && <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                <span>{opt}</span>
                {opt === q.correct && submitted && (
                  <button
                    onClick={e => { e.stopPropagation(); speak(opt) }}
                    className="ml-auto text-emerald-500/50 hover:text-emerald-400 transition-colors">
                    <Volume2 size={13} />
                  </button>
                )}
              </button>
            )
          })}
        </div>

        {/* Example in Spanish after reveal */}
        {submitted && q.exampleEs && (
          <div className="text-slate-500 text-xs italic border-t border-slate-700/30 pt-3">
            ES: "{q.exampleEs}"
          </div>
        )}

        {submitted && (
          <button onClick={next}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                       text-white font-semibold py-2.5 rounded-xl transition-colors">
            {current + 1 >= questions.length ? 'Ver resultado' : 'Siguiente'}
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-3 text-sm text-slate-500">
        <span className="text-emerald-400">{score} correctas</span>
        <span>·</span>
        <span className="text-red-400">{current - score + (submitted ? 1 : 0) - (submitted && selected === q.correct ? 1 : 0)} errores</span>
      </div>
    </div>
  )
}
