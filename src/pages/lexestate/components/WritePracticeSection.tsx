import { useState, useRef, useEffect } from 'react'
import { PenLine, CheckCircle, XCircle, ArrowRight, RotateCcw, HelpCircle } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, QuestionType } from '../types'
import { isAnswerCorrect } from '../api'
import { updateProgress } from '../api'
import { updateLocalProgress } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
}

type HintType = 'definition_es' | 'definition_en' | 'translation_es' | 'example_gap'
type Phase = 'config' | 'session' | 'result' | 'summary'

interface Result {
  term: LexTerm
  userAnswer: string
  isCorrect: boolean
  hintType: HintType
}

const HINT_OPTIONS: { value: HintType; label: string; desc: string }[] = [
  { value: 'definition_es',  label: 'Definición en español',  desc: 'Lee la definición en español y escribe la palabra en inglés' },
  { value: 'definition_en',  label: 'Definición en inglés',   desc: 'Lee la definición en inglés y escribe la palabra' },
  { value: 'translation_es', label: 'Traducción en español',  desc: 'Lee la traducción y escribe la palabra en inglés' },
  { value: 'example_gap',    label: 'Ejemplo con hueco',      desc: 'Completa el ejemplo con la palabra correcta' },
]

function getHint(term: LexTerm, hintType: HintType): string {
  switch (hintType) {
    case 'definition_es':  return term.definition_es
    case 'definition_en':  return term.definition_en
    case 'translation_es': return term.translation_es
    case 'example_gap':
      if (!term.example_en) return term.definition_es
      return term.example_en.replace(new RegExp(term.word_en, 'gi'), '___')
  }
}

function getHintLabel(hintType: HintType): string {
  return HINT_OPTIONS.find(h => h.value === hintType)?.label ?? ''
}

export default function WritePracticeSection({ user, terms, categories, dataLoaded }: Props) {
  const [phase, setPhase] = useState<Phase>('config')
  const [hintType, setHintType] = useState<HintType>('definition_es')
  const [catFilter, setCatFilter] = useState('')
  const [deck, setDeck] = useState<LexTerm[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [penaltyAnswer, setPenaltyAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const penaltyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase === 'session' && !submitted) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, current, submitted])

  useEffect(() => {
    if (submitted && !isCorrect) {
      setTimeout(() => penaltyRef.current?.focus(), 100)
    }
  }, [submitted, isCorrect])

  function buildDeck() {
    let pool = [...terms]
    if (catFilter) pool = pool.filter(t => t.category_id === catFilter)
    // Skip terms that don't have the required hint
    if (hintType === 'example_gap') pool = pool.filter(t => !!t.example_en)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 20)
    if (pool.length === 0) return
    setDeck(pool)
    setCurrent(0)
    setAnswer('')
    setPenaltyAnswer('')
    setSubmitted(false)
    setResults([])
    setPhase('session')
  }

  async function submit() {
    if (!answer.trim() || submitted) return
    const term = deck[current]
    const correct = isAnswerCorrect(answer, term.word_en)
    setIsCorrect(correct)
    setSubmitted(true)
    setResults(prev => [...prev, { term, userAnswer: answer, isCorrect: correct, hintType }])
    if (user) {
      await updateProgress(term.id, correct, 'write', hintType).catch(() => {})
    } else {
      updateLocalProgress(term.id, correct)
    }
  }

  async function skipUnknown() {
    if (submitted) return
    const term = deck[current]
    setIsCorrect(false)
    setSubmitted(true)
    setResults(prev => [...prev, { term, userAnswer: '', isCorrect: false, hintType }])
    if (user) {
      await updateProgress(term.id, false, 'write', hintType).catch(() => {})
    } else {
      updateLocalProgress(term.id, false)
    }
  }

  function next() {
    if (current + 1 >= deck.length) {
      setPhase('summary')
    } else {
      setCurrent(c => c + 1)
      setAnswer('')
      setPenaltyAnswer('')
      setSubmitted(false)
      setIsCorrect(false)
    }
  }

  if (!dataLoaded) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  if (phase === 'config') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <PenLine size={20} className="text-emerald-400" />
          Escribir respuesta
        </h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">Tipo de pista</label>
            <div className="space-y-2">
              {HINT_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${hintType === opt.value
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'border-slate-700/40 hover:border-slate-600/60'}`}>
                  <input type="radio" name="hint" value={opt.value}
                    checked={hintType === opt.value}
                    onChange={e => setHintType(e.target.value as HintType)}
                    className="mt-0.5 accent-emerald-500 flex-shrink-0" />
                  <div>
                    <div className={`text-sm font-medium ${hintType === opt.value ? 'text-emerald-300' : 'text-white'}`}>
                      {opt.label}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <button onClick={buildDeck}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold
                       py-3 rounded-xl transition-colors">
            Comenzar práctica
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'summary') {
    const correct = results.filter(r => r.isCorrect).length
    const pct = Math.round((correct / results.length) * 100)
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Resultado</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 text-center mb-4">
          <div className="text-5xl font-bold mb-1" style={{ color: pct >= 70 ? '#34d399' : '#f87171' }}>
            {pct}%
          </div>
          <div className="text-slate-400 text-sm">{correct} de {results.length} correctas</div>
        </div>
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm
              ${r.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              {r.isCorrect
                ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                : <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{r.term.word_en}</div>
                {!r.isCorrect && (
                  <div className="text-red-300 text-xs">
                    {r.userAnswer ? `Tu respuesta: "${r.userAnswer}"` : 'No sabías la respuesta'}
                  </div>
                )}
                <div className="text-slate-400 text-xs">{r.term.definition_es}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={buildDeck}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold
                       py-2.5 rounded-xl transition-colors">
            Repetir
          </button>
          <button onClick={() => { setPhase('config'); setCatFilter('') }}
            className="flex-1 border border-slate-700 text-slate-400 hover:text-white
                       py-2.5 rounded-xl transition-colors text-sm">
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  const term = deck[current]
  const hint = getHint(term, hintType)
  const penaltyDone = isCorrect || isAnswerCorrect(penaltyAnswer, term.word_en)

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Escribir respuesta</h1>
        <span className="text-slate-400 text-sm">{current + 1} / {deck.length}</span>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
             style={{ width: `${(current / deck.length) * 100}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          {getHintLabel(hintType)}
        </div>
        <p className="text-white text-base leading-relaxed">{hint}</p>

        <div className="pt-2">
          <input
            ref={inputRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitted ? undefined : submit() }}
            disabled={submitted}
            placeholder="Escribe la palabra en inglés..."
            className={`w-full bg-[#0a1628] border rounded-xl px-4 py-3 text-white text-sm
                        placeholder-slate-600 focus:outline-none transition-colors
                        ${submitted
                          ? isCorrect
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : 'border-red-500/50 bg-red-500/5'
                          : 'border-slate-700/50 focus:border-emerald-500/50'}`}
          />
        </div>

        {!submitted ? (
          <div className="flex gap-2">
            <button onClick={submit} disabled={!answer.trim()}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                         text-white font-semibold py-2.5 rounded-xl transition-colors">
              Comprobar
            </button>
            <button onClick={skipUnknown}
              title="No sé la respuesta"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-600/60
                         text-slate-400 hover:text-amber-400 hover:border-amber-500/40
                         hover:bg-amber-500/5 transition-colors text-sm">
              <HelpCircle size={15} />
              No sé
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 rounded-xl p-3 border
              ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              {isCorrect
                ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                : <XCircle size={18} className="text-red-400 flex-shrink-0" />}
              <div>
                <div className={`font-semibold text-sm ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isCorrect ? '¡Correcto!' : 'Incorrecto'}
                </div>
                {!isCorrect && (
                  <div className="text-white text-sm">Respuesta correcta: <strong>{term.word_en}</strong></div>
                )}
              </div>
            </div>

            <div className="bg-slate-700/20 rounded-xl p-3 text-sm text-slate-400 leading-relaxed">
              <div className="text-emerald-300 font-medium mb-1">{term.translation_es}</div>
              {term.definition_en}
            </div>

            {!isCorrect && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Escribe <span className="text-white font-semibold">«{term.word_en}»</span> para continuar
                </label>
                <input
                  ref={penaltyRef}
                  value={penaltyAnswer}
                  onChange={e => setPenaltyAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && penaltyDone) next() }}
                  placeholder={term.word_en}
                  className={`w-full bg-[#0a1628] border rounded-xl px-4 py-3 text-white text-sm
                              placeholder-slate-700 focus:outline-none transition-colors
                              ${penaltyDone
                                ? 'border-emerald-500/60 bg-emerald-500/5'
                                : 'border-slate-600/50 focus:border-slate-500'}`}
                />
              </div>
            )}

            <button onClick={next} disabled={!penaltyDone}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         transition-colors text-sm font-medium
                         ${penaltyDone
                           ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                           : 'border border-slate-700/50 text-slate-600 cursor-not-allowed'}`}>
              {current + 1 >= deck.length ? 'Ver resultados' : 'Siguiente'}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
