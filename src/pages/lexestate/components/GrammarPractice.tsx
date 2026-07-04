import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, RotateCcw, Trophy, ChevronRight } from 'lucide-react'
import type { LexGrammarTopic, LexGrammarExercise, GrammarExerciseType } from '../types'
import { fetchGrammarExercises } from '../api'

interface Props {
  topic: LexGrammarTopic
  onBack: () => void
}

type Phase = 'loading' | 'exercise' | 'feedback' | 'done'

const TYPE_LABELS: Record<GrammarExerciseType, string> = {
  fill_blank:        'Rellena el hueco',
  multiple_choice:   'Opción múltiple',
  error_correction:  'Corrección de errores',
  transformation:    'Transformación',
}

const TYPE_COLORS: Record<GrammarExerciseType, string> = {
  fill_blank:       'bg-sky-500/15 text-sky-400 border-sky-500/30',
  multiple_choice:  'bg-violet-500/15 text-violet-400 border-violet-500/30',
  error_correction: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  transformation:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .replace(/[.,;:!?'"()[\]]/g, '')
    .replace(/\s+/g, ' ')
}

function isCorrect(userAnswer: string, correctAnswer: string): boolean {
  const u = normalize(userAnswer)
  const c = normalize(correctAnswer)
  if (u === c) return true
  // Accept if the correct answer contains multiple acceptable answers separated by " / "
  const variants = correctAnswer.split(' / ').map(v => normalize(v))
  return variants.some(v => u === v || u.includes(v) || v.includes(u))
}

export default function GrammarPractice({ topic, onBack }: Props) {
  const [exercises, setExercises] = useState<LexGrammarExercise[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [current, setCurrent] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [results, setResults] = useState<{ correct: boolean; userAnswer: string }[]>([])
  const [showHint, setShowHint] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGrammarExercises(topic.id)
      .then(data => {
        setExercises(data)
        setPhase(data.length > 0 ? 'exercise' : 'done')
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'Error'); setPhase('done') })
  }, [topic.id])

  const ex = exercises[current]
  const score = results.filter(r => r.correct).length

  function submitAnswer(answer: string) {
    const correct = isCorrect(answer, ex.correct_answer)
    setResults(prev => [...prev, { correct, userAnswer: answer }])
    setPhase('feedback')
  }

  function next() {
    if (current + 1 >= exercises.length) {
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setUserAnswer('')
      setSelectedOption(null)
      setShowHint(false)
      setPhase('exercise')
    }
  }

  function restart() {
    setCurrent(0)
    setUserAnswer('')
    setSelectedOption(null)
    setResults([])
    setShowHint(false)
    setPhase('exercise')
  }

  const lastResult = results[results.length - 1]

  // ── LOADING ──
  if (phase === 'loading') return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  )

  // ── DONE ──
  if (phase === 'done') {
    const pct = exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0
    const pctColor = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Volver a Gramática
        </button>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">{error}</div>
        ) : (
          <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center space-y-5">
            <Trophy size={40} className={`mx-auto ${pctColor}`} />
            <div>
              <div className={`text-5xl font-bold ${pctColor}`}>{pct}%</div>
              <div className="text-slate-400 text-sm mt-1">{score} de {exercises.length} correctas</div>
            </div>
            <div className="text-white font-medium">{topic.title}</div>

            {/* Per-exercise review */}
            <div className="text-left space-y-2 mt-4">
              {exercises.map((e, i) => {
                const r = results[i]
                if (!r) return null
                return (
                  <div key={e.id}
                    className={`rounded-xl px-4 py-3 border text-sm space-y-1
                      ${r.correct
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-start gap-2">
                      {r.correct
                        ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />}
                      <span className="text-slate-300 text-xs">{e.sentence.replace(/___/g, '___')}</span>
                    </div>
                    {!r.correct && (
                      <div className="pl-5 space-y-0.5">
                        <div className="text-red-400 text-xs">Tu respuesta: {r.userAnswer}</div>
                        <div className="text-emerald-400 text-xs">Correcta: {e.correct_answer}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={restart}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                           text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                <RotateCcw size={14} /> Reintentar
              </button>
              <button onClick={onBack}
                className="flex-1 border border-slate-700 text-slate-400 hover:text-white
                           py-2.5 rounded-xl transition-colors text-sm">
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!ex) return null

  const isMultiple = ex.type === 'multiple_choice'
  const isText = ex.type === 'fill_blank' || ex.type === 'error_correction' || ex.type === 'transformation'
  const progress = (current / exercises.length) * 100

  // ── EXERCISE ──
  if (phase === 'exercise') return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> {topic.title}
      </button>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
               style={{ width: `${progress}%` }} />
        </div>
        <span className="text-slate-500 text-xs flex-shrink-0">{current + 1}/{exercises.length}</span>
      </div>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${TYPE_COLORS[ex.type]}`}>
          {TYPE_LABELS[ex.type]}
        </span>
        <span className="text-slate-600 text-xs">{score}/{results.length} correctas</span>
      </div>

      {/* Card */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
        {/* Instruction */}
        <p className="text-slate-300 text-sm font-medium">{ex.instruction}</p>

        {/* Sentence */}
        <div className="bg-[#0a1628] border border-slate-700/30 rounded-xl px-4 py-3">
          <p className="text-white text-sm leading-relaxed font-mono whitespace-pre-wrap">{ex.sentence}</p>
        </div>

        {/* Multiple choice */}
        {isMultiple && ex.options && (
          <div className="space-y-2">
            {ex.options.map((opt, i) => (
              <button key={i} onClick={() => setSelectedOption(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all
                  ${selectedOption === opt
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#0a1628] border-slate-700/30 text-slate-300 hover:border-slate-500/50 hover:text-white'}`}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        {isText && (
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Tu respuesta</label>
            <textarea
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && userAnswer.trim()) submitAnswer(userAnswer) }}
              placeholder="Escribe tu respuesta aquí..."
              rows={ex.type === 'transformation' || ex.type === 'error_correction' ? 3 : 2}
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-xl px-4 py-3
                         text-white text-sm placeholder-slate-600 resize-none
                         focus:outline-none focus:border-emerald-500/50 transition-colors" />
            <p className="text-slate-700 text-xs mt-1">Ctrl+Enter para confirmar</p>
          </div>
        )}

        {/* Hint */}
        {showHint && ex.explanation && (
          <div className="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300 text-xs leading-relaxed">{ex.explanation}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => isMultiple ? selectedOption && submitAnswer(selectedOption) : userAnswer.trim() && submitAnswer(userAnswer)}
            disabled={isMultiple ? !selectedOption : !userAnswer.trim()}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                       text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            Comprobar
          </button>
          {!showHint && (
            <button onClick={() => setShowHint(true)}
              className="flex items-center gap-1.5 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10
                         px-3 py-2.5 rounded-xl transition-colors text-xs">
              <Lightbulb size={13} /> Pista
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── FEEDBACK ──
  if (phase === 'feedback' && lastResult) return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> {topic.title}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
               style={{ width: `${((current + 1) / exercises.length) * 100}%` }} />
        </div>
        <span className="text-slate-500 text-xs flex-shrink-0">{current + 1}/{exercises.length}</span>
      </div>

      <div className={`border rounded-2xl p-6 space-y-4 transition-all
        ${lastResult.correct
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-red-500/5 border-red-500/20'}`}>

        {/* Result header */}
        <div className="flex items-center gap-3">
          {lastResult.correct
            ? <CheckCircle2 size={22} className="text-emerald-400" />
            : <XCircle size={22} className="text-red-400" />}
          <span className={`font-bold text-base ${lastResult.correct ? 'text-emerald-400' : 'text-red-400'}`}>
            {lastResult.correct ? '¡Correcto!' : 'Incorrecto'}
          </span>
        </div>

        {/* The exercise sentence */}
        <div className="bg-[#0a1628] border border-slate-700/30 rounded-xl px-4 py-3">
          <p className="text-slate-400 text-xs mb-1 font-medium">{TYPE_LABELS[ex.type]}</p>
          <p className="text-white text-sm font-mono leading-relaxed whitespace-pre-wrap">{ex.sentence}</p>
        </div>

        {/* User answer */}
        {!lastResult.correct && (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Tu respuesta:</p>
                <p className="text-red-300 text-sm">{lastResult.userAnswer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Correct answer */}
        <div className="flex items-start gap-2">
          <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Respuesta correcta:</p>
            <p className="text-emerald-300 text-sm font-medium">{ex.correct_answer}</p>
          </div>
        </div>

        {/* Explanation */}
        {ex.explanation && (
          <div className="flex gap-3 bg-[#0a1628] border border-slate-700/20 rounded-xl px-4 py-3">
            <Lightbulb size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300 text-xs leading-relaxed">{ex.explanation}</p>
          </div>
        )}

        <button onClick={next}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                     text-white font-semibold py-3 rounded-xl transition-colors text-sm">
          {current + 1 >= exercises.length ? 'Ver resultados' : 'Siguiente'} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )

  return null
}
