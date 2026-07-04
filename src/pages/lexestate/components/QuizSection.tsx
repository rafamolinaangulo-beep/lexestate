import { useState } from 'react'
import { GraduationCap, CheckCircle, XCircle, Clock, ArrowRight, RotateCcw, BookMarked, BookType } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, QuizConfig, GeneratedQuestion, QuizMistake, LexVerb } from '../types'
import { generateLocalQuestions, saveQuizResult, updateProgress, updateVerbProgress } from '../api'
import { saveLocalQuizResult, updateLocalProgress, updateLocalVerbProgress, recordStudyActivity } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  verbs?: LexVerb[]
  dataLoaded: boolean
  onRefreshData: () => void
  onReview: (termIds: string[]) => void
}

type Phase = 'config' | 'session' | 'done'

type VocabQuestion = GeneratedQuestion & { kind: 'vocab' }
type VerbQuestion = {
  kind: 'verb'
  verbId: string
  baseForm: string
  translationEs: string
  tense: 'past_simple' | 'past_participle'
  question_type: string
  question_text: string
  correct_answer: string
  options: string[]
  explanation: string
}
type MixedQuestion = VocabQuestion | VerbQuestion

const QUESTION_TYPES = [
  { value: 'mixed',                label: 'Mixto (todos los tipos)' },
  { value: 'definition_es_to_word',label: 'Definición ES → Palabra EN' },
  { value: 'definition_en_to_word',label: 'Definición EN → Palabra EN' },
  { value: 'word_to_translation_es',label: 'Palabra EN → Traducción ES' },
  { value: 'word_to_definition_es', label: 'Palabra EN → Definición ES' },
  { value: 'example_gap_to_word',   label: 'Ejemplo con hueco' },
]

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function QuizSection({ user, terms, categories, verbs = [], dataLoaded, onReview }: Props) {
  const [phase, setPhase] = useState<Phase>('config')
  const [config, setConfig] = useState<QuizConfig>({
    count: 10,
    category_id: null,
    level: null,
    question_type: 'mixed',
  })
  const [includeVerbs, setIncludeVerbs] = useState(false)
  const [questions, setQuestions] = useState<MixedQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [mistakes, setMistakes] = useState<QuizMistake[]>([])
  const [score, setScore] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval> | null>(null)

  function stopTimer() {
    if (timerRef) { clearInterval(timerRef); setTimerRef(null) }
  }

  function buildVerbQuestions(count: number): VerbQuestion[] {
    if (!verbs.length) return []
    const tenses: ('past_simple' | 'past_participle')[] = ['past_simple', 'past_participle']
    const items: VerbQuestion[] = []
    for (const v of verbs) {
      for (const tense of tenses) {
        const correctAnswer = tense === 'past_simple'
          ? v.past_simple.split('/')[0].trim()
          : v.past_participle.split('/')[0].trim()
        const wrong = verbs
          .filter(w => w.id !== v.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 6)
          .map(w => tense === 'past_simple' ? w.past_simple.split('/')[0].trim() : w.past_participle.split('/')[0].trim())
          .filter(w => w !== correctAnswer)
          .slice(0, 3)
        items.push({
          kind: 'verb', verbId: v.id, baseForm: v.base_form,
          translationEs: v.translation_es, tense,
          question_type: 'verb_form',
          question_text: `¿${tense === 'past_simple' ? 'Past Simple' : 'Past Participle'} de "${v.base_form}" (${v.translation_es})?`,
          correct_answer: correctAnswer,
          options: [correctAnswer, ...wrong].sort(() => Math.random() - 0.5),
          explanation: `${v.base_form} → ${v.past_simple} → ${v.past_participle}`,
        })
      }
    }
    return items.sort(() => Math.random() - 0.5).slice(0, count)
  }

  function buildQuiz() {
    let pool = [...terms]
    if (config.category_id) pool = pool.filter(t => t.category_id === config.category_id)
    if (config.level) pool = pool.filter(t => t.level === config.level)
    if (pool.length < 4) { alert('No hay suficientes términos con ese filtro (mínimo 4)'); return }

    const vocabCount = includeVerbs ? Math.ceil(config.count * 0.7) : config.count
    const verbCount  = includeVerbs ? config.count - vocabCount : 0
    const vocabQs = generateLocalQuestions(pool, vocabCount, config.question_type)
      .map(q => ({ ...q, kind: 'vocab' as const }))
    const verbQs = buildVerbQuestions(verbCount)
    const mixed: MixedQuestion[] = [...vocabQs, ...verbQs].sort(() => Math.random() - 0.5)

    setQuestions(mixed)
    setCurrent(0)
    setSelected(null)
    setSubmitted(false)
    setMistakes([])
    setScore(0)
    setElapsed(0)
    const t0 = Date.now()
    setStartTime(t0)
    const ref = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
    setTimerRef(ref)
    setPhase('session')
  }

  async function handleSelect(option: string) {
    if (submitted) return
    setSelected(option)
    setSubmitted(true)
    const q = questions[current]
    const correct = option === q.correct_answer
    if (correct) {
      setScore(s => s + 1)
    } else if (q.kind === 'vocab') {
      setMistakes(prev => [...prev, {
        term_id: q.term.id,
        word_en: q.term.word_en,
        user_answer: option,
        correct_answer: q.correct_answer,
      }])
    }
    if (q.kind === 'vocab') {
      user
        ? updateProgress(q.term.id, correct, 'quiz', q.question_type).catch(() => {})
        : updateLocalProgress(q.term.id, correct)
    } else {
      user
        ? updateVerbProgress(q.verbId, correct, 'quiz').catch(() => {})
        : updateLocalVerbProgress(q.verbId, correct)
    }
  }

  async function next() {
    if (current + 1 >= questions.length) {
      stopTimer()
      const finalElapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(finalElapsed)
      const pct = Math.round((score / questions.length) * 100)
      const result = {
        score,
        total_questions: questions.length,
        percentage: pct,
        category_id: config.category_id,
        level: config.level,
        question_type: includeVerbs ? 'mixed+verbs' : config.question_type,
        time_seconds: finalElapsed,
        mistakes,
      }
      if (user) {
        await saveQuizResult(result).catch(() => {})
      } else {
        saveLocalQuizResult(result)
      }
      recordStudyActivity()
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setSubmitted(false)
    }
  }

  if (!dataLoaded) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  if (phase === 'config') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <GraduationCap size={20} className="text-emerald-400" />
          Test
        </h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Configurar test</h2>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Número de preguntas</label>
            <div className="grid grid-cols-4 gap-2">
              {([10,20,30,50] as const).map(n => (
                <button key={n} onClick={() => setConfig(c => ({ ...c, count: n }))}
                  className={`py-2 rounded-xl border text-sm font-semibold transition-all
                    ${config.count === n
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
            <select value={config.category_id ?? ''}
              onChange={e => setConfig(c => ({ ...c, category_id: e.target.value || null }))}
              className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Nivel</label>
            <select value={config.level ?? ''}
              onChange={e => setConfig(c => ({ ...c, level: e.target.value || null }))}
              className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todos</option>
              {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de pregunta</label>
            <select value={config.question_type}
              onChange={e => setConfig(c => ({ ...c, question_type: e.target.value as QuizConfig['question_type'] }))}
              className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {verbs.length > 0 && (
            <button onClick={() => setIncludeVerbs(v => !v)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all
                ${includeVerbs
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'border-slate-700/50 text-slate-400 hover:border-slate-600'}`}>
              <BookType size={15} className={includeVerbs ? 'text-cyan-400' : 'text-slate-500'} />
              <div className="flex-1 text-left">
                <div className="font-medium">Incluir verbos</div>
                <div className="text-xs opacity-70">~30% de las preguntas serán formas verbales</div>
              </div>
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                ${includeVerbs ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                {includeVerbs && <CheckCircle size={12} className="text-white" />}
              </div>
            </button>
          )}
          <button onClick={buildQuiz}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold
                       py-3 rounded-xl transition-colors">
            Empezar test
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = Math.round((score / questions.length) * 100)
    const passed = pct >= 70
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Resultado del test</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 text-center">
          <div className={`text-5xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct}%
          </div>
          <div className="text-slate-400 text-sm mb-2">{score} / {questions.length} correctas</div>
          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
            <Clock size={12} />
            <span>{formatTime(elapsed)}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-emerald-400 font-bold text-lg">{score}</div>
              <div className="text-slate-500 text-xs">Correctas</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="text-red-400 font-bold text-lg">{mistakes.length}</div>
              <div className="text-slate-500 text-xs">Errores</div>
            </div>
            <div className="bg-slate-700/20 border border-slate-700/30 rounded-xl p-3">
              <div className="text-white font-bold text-lg">{formatTime(elapsed)}</div>
              <div className="text-slate-500 text-xs">Tiempo</div>
            </div>
          </div>
        </div>

        {mistakes.length > 0 && (
          <>
            {/* Aviso de lista de repaso */}
            <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3
                            flex items-start gap-3">
              <BookMarked size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-amber-300 text-sm font-medium">
                  {mistakes.length} {mistakes.length === 1 ? 'término añadido' : 'términos añadidos'} a tu lista de repaso
                </div>
                <div className="text-amber-400/60 text-xs mt-0.5">
                  Aparecerán en la sección "Repaso" hasta que los domines
                </div>
              </div>
            </div>

            {/* Detalle de errores */}
            <div className="bg-[#0f2040] border border-slate-700/30 rounded-xl p-4 space-y-2">
              <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Errores</div>
              {mistakes.map((m, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-medium">{m.word_en}</span>
                    <span className="text-slate-500"> → </span>
                    <span className="text-red-300">"{m.user_answer}"</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="space-y-2">
          {mistakes.length > 0 && (
            <button onClick={() => onReview(mistakes.map(m => m.term_id))}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold
                         py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              <RotateCcw size={14} />
              Repasar ahora los {mistakes.length} errores
            </button>
          )}
          <button onClick={() => { setPhase('config'); stopTimer() }}
            className={`w-full font-semibold py-2.5 rounded-xl transition-colors text-sm
              ${mistakes.length === 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : 'border border-slate-600 text-slate-400 hover:text-white'}`}>
            Nuevo test
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const progress = (current / questions.length) * 100

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Test</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400 text-sm">
            <Clock size={14} />
            {formatTime(elapsed)}
          </span>
          <span className="text-slate-400 text-sm">{current + 1}/{questions.length}</span>
        </div>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
             style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {q.kind === 'verb'
                ? (q.tense === 'past_simple' ? 'Verbo · Past Simple' : 'Verbo · Past Participle')
                : (QUESTION_TYPES.find(t => t.value === q.question_type)?.label ?? q.question_type)}
            </span>
            {q.kind === 'verb' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">VERB</span>
            )}
          </div>
          <p className="text-white text-base leading-relaxed">{q.question_text}</p>
        </div>

        <div className="space-y-2">
          {q.options.map(opt => {
            let style = 'border-slate-700/50 text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-emerald-500/5'
            if (submitted) {
              if (opt === q.correct_answer) {
                style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              } else if (opt === selected && opt !== q.correct_answer) {
                style = 'border-red-500/50 bg-red-500/10 text-red-300'
              } else {
                style = 'border-slate-700/30 text-slate-600'
              }
            } else if (opt === selected) {
              style = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            }
            return (
              <button key={opt} onClick={() => handleSelect(opt)} disabled={submitted}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm
                           transition-all flex items-center gap-3 ${style}`}>
                {submitted && opt === q.correct_answer && (
                  <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                )}
                {submitted && opt === selected && opt !== q.correct_answer && (
                  <XCircle size={15} className="text-red-400 flex-shrink-0" />
                )}
                <span>{opt}</span>
              </button>
            )
          })}
        </div>

        {submitted && q.explanation && (
          <div className="bg-slate-700/20 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
            {q.explanation}
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
    </div>
  )
}
