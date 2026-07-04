import { useState, useEffect, useRef } from 'react'
import { Headphones, Volume2, RotateCcw, ArrowRight, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
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

interface ListeningResult {
  termId: string
  wordEn: string
  userAnswer: string
  correct: boolean
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ')
}

export default function ListeningSection({ user, terms, categories, dataLoaded }: Props) {
  const [phase, setPhase] = useState<Phase>('config')
  const [catFilter, setCatFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [count, setCount] = useState<10 | 15 | 20>(10)
  const [deck, setDeck] = useState<LexTerm[]>([])
  const [current, setCurrent] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [results, setResults] = useState<ListeningResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-play TTS when new card appears
  useEffect(() => {
    if (phase !== 'session' || deck.length === 0) return
    const term = deck[current]
    const t = setTimeout(() => speak(term.word_en), 300)
    return () => clearTimeout(t)
  }, [current, phase, deck])

  // Focus input on new card
  useEffect(() => {
    if (phase === 'session' && !submitted) inputRef.current?.focus()
  }, [current, phase, submitted])

  function buildDeck() {
    let pool = [...terms]
    if (catFilter) pool = pool.filter(t => t.category_id === catFilter)
    if (levelFilter) pool = pool.filter(t => t.level === levelFilter)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, count)
    if (pool.length === 0) return
    setDeck(pool)
    setCurrent(0)
    setInput('')
    setSubmitted(false)
    setShowHint(false)
    setResults([])
    setPhase('session')
  }

  async function handleSubmit() {
    if (!input.trim() || submitted) return
    const term = deck[current]
    const correct = normalize(input) === normalize(term.word_en)
    setSubmitted(true)
    setResults(prev => [...prev, { termId: term.id, wordEn: term.word_en, userAnswer: input.trim(), correct }])

    if (user) {
      updateProgress(term.id, correct, 'listening', 'reveal').catch(() => {})
    } else {
      updateLocalProgress(term.id, correct)
    }
  }

  function next() {
    if (current + 1 >= deck.length) {
      const allResults = [...results]
      savePracticeResult('listening', allResults.filter(r => r.correct).length, allResults.length)
      recordStudyActivity()
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setInput('')
      setSubmitted(false)
      setShowHint(false)
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
    const available = terms.filter(
      t => (!catFilter || t.category_id === catFilter) && (!levelFilter || t.level === levelFilter)
    ).length

    return (
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Headphones size={20} className="text-emerald-400" />
            Dictado
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Escucha la pronunciación y escribe el término en inglés.
          </p>
        </div>

        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Número de palabras</label>
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

          <button onClick={buildDeck} disabled={available < 1}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                       text-white font-semibold py-3 rounded-xl transition-colors">
            Empezar ({Math.min(count, available)} palabras)
          </button>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Lightbulb size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400 text-xs leading-relaxed">
              La palabra se reproducirá automáticamente. Escríbela en inglés exactamente como suena.
              Usa el botón <span className="text-emerald-400">🔊</span> para escucharla de nuevo cuantas veces necesites.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = results.filter(r => r.correct).length
    const pct = Math.round((correct / results.length) * 100)
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Dictado completado</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className={`text-5xl font-bold mb-1 ${pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pct}%
          </div>
          <div className="text-slate-400 text-sm mb-6">{correct} de {results.length} correctas</div>

          <div className="space-y-2 text-left mb-6">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {r.correct
                  ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  : <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <span className="text-white font-medium">{r.wordEn}</span>
                  {!r.correct && (
                    <span className="text-red-400 text-xs ml-2">← escribiste "{r.userAnswer}"</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button onClick={buildDeck}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Nueva sesión
            </button>
            <button onClick={() => setPhase('config')}
              className="w-full border border-slate-700 text-slate-400 hover:text-white py-2.5 rounded-xl transition-colors text-sm">
              Cambiar configuración
            </button>
          </div>
        </div>
      </div>
    )
  }

  const term = deck[current]
  const cat = categories.find(c => c.id === term.category_id)
  const progress = (current / deck.length) * 100

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Headphones size={18} className="text-emerald-400" />
          Dictado
        </h1>
        <span className="text-slate-400 text-sm">{current + 1} / {deck.length}</span>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
             style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-5">
        {/* Category + level */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {cat && <span>{cat.icon} {cat.name}</span>}
          {cat && term.level && <span>·</span>}
          {term.level && <span className="font-bold text-slate-400">{term.level}</span>}
        </div>

        {/* Play button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onClick={() => speak(term.word_en)}
            className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30
                       hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all
                       flex items-center justify-center group">
            <Volume2 size={36} className="text-emerald-400 group-hover:text-emerald-300" />
          </button>
          <p className="text-slate-500 text-sm">Toca para escuchar de nuevo</p>
        </div>

        {/* Hint */}
        {!submitted && (
          <div className="text-center">
            {!showHint ? (
              <button onClick={() => setShowHint(true)}
                className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
                Ver pista (traducción)
              </button>
            ) : (
              <div className="text-slate-400 text-sm bg-slate-700/20 rounded-xl px-4 py-2">
                {term.translation_es}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {!submitted ? (
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input.trim() && handleSubmit()}
              placeholder="Escribe el término en inglés..."
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-xl px-4 py-3
                         text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50
                         text-sm transition-colors"
            />
            <button onClick={handleSubmit} disabled={!input.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30
                         text-white font-semibold py-2.5 rounded-xl transition-colors">
              Comprobar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Result feedback */}
            {results[results.length - 1]?.correct ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20
                              rounded-xl px-4 py-3">
                <CheckCircle size={18} className="text-emerald-400" />
                <div>
                  <div className="text-emerald-400 font-semibold text-sm">¡Correcto!</div>
                  <div className="text-emerald-300/70 text-xs">{term.word_en}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                              rounded-xl px-4 py-3">
                <XCircle size={18} className="text-red-400" />
                <div>
                  <div className="text-red-400 font-semibold text-sm">
                    Incorrecto — escribiste "{results[results.length - 1]?.userAnswer}"
                  </div>
                  <div className="text-white text-sm font-medium mt-0.5">
                    La respuesta era: <span className="text-emerald-300">{term.word_en}</span>
                  </div>
                  {term.pronunciation && (
                    <div className="text-slate-500 text-xs mt-0.5">{term.pronunciation}</div>
                  )}
                </div>
              </div>
            )}

            {/* Translation */}
            <div className="bg-slate-700/20 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-slate-500">Traducción: </span>
              <span className="text-slate-300">{term.translation_es}</span>
            </div>

            <button onClick={next}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400
                         text-white font-semibold py-2.5 rounded-xl transition-colors">
              {current + 1 >= deck.length ? 'Ver resultado' : 'Siguiente'}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="text-emerald-400 font-medium">
          {results.filter(r => r.correct).length} correctas
        </span>
        <span>·</span>
        <span className="text-red-400">
          {results.filter(r => !r.correct).length} errores
        </span>
        <button onClick={() => speak(term.word_en)}
          className="ml-auto flex items-center gap-1.5 text-slate-600 hover:text-emerald-400 transition-colors">
          <RotateCcw size={13} />
          Repetir
        </button>
      </div>
    </div>
  )
}
