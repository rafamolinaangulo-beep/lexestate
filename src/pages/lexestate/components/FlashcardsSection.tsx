import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, BookOpen, Volume2 } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, FlashcardRating } from '../types'
import { updateProgress, setTermStatus } from '../api'
import { updateLocalProgress, setLocalTermStatus, recordStudyActivity, getLocalSettings } from '../localStorage'
import { speak } from '../tts'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
}

type Phase = 'config' | 'session' | 'done'

const RATING_BUTTONS: { value: FlashcardRating['rating']; label: string; color: string }[] = [
  { value: 'unknown',  label: 'No la sé',    color: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' },
  { value: 'hard',     label: 'Difícil',     color: 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
  { value: 'learning', label: 'Aprendiendo', color: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25' },
  { value: 'mastered', label: 'La domino',   color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
]

function ratingToCorrect(r: FlashcardRating['rating']): boolean {
  return r === 'learning' || r === 'mastered'
}

export default function FlashcardsSection({ user, terms, categories, dataLoaded }: Props) {
  const [phase, setPhase] = useState<Phase>('config')
  const [catFilter, setCatFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [deck, setDeck] = useState<LexTerm[]>([])
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<FlashcardRating[]>([])

  // Auto-pronounce word when new card appears
  useEffect(() => {
    if (phase !== 'session' || deck.length === 0) return
    const settings = getLocalSettings()
    if (settings.auto_pronunciation) speak(deck[current].word_en)
  }, [current, phase, deck])

  function buildDeck() {
    let pool = [...terms]
    if (catFilter) pool = pool.filter(t => t.category_id === catFilter)
    if (levelFilter) pool = pool.filter(t => t.level === levelFilter)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 30)
    if (pool.length === 0) return
    setDeck(pool)
    setCurrent(0)
    setRevealed(false)
    setResults([])
    setPhase('session')
  }

  async function rate(rating: FlashcardRating['rating']) {
    const term = deck[current]
    const isCorrect = ratingToCorrect(rating)
    setResults(prev => [...prev, { termId: term.id, rating }])

    if (rating === 'mastered') {
      // "La domino" → marcar directamente como dominada, sin esperar streak
      if (user) {
        await setTermStatus(term.id, 'mastered').catch(() => {})
      } else {
        setLocalTermStatus(term.id, 'mastered')
      }
    } else {
      if (user) {
        await updateProgress(term.id, isCorrect, 'flashcard', 'reveal').catch(() => {})
      } else {
        updateLocalProgress(term.id, isCorrect)
      }
    }

    if (current + 1 >= deck.length) {
      recordStudyActivity()
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setRevealed(false)
    }
  }

  if (!dataLoaded) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  if (phase === 'config') {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Flashcards</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Configurar sesión</h2>
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
          <button onClick={buildDeck}
            disabled={terms.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                       text-white font-semibold py-3 rounded-xl transition-colors">
            Empezar ({Math.min(30, terms.filter(t => (!catFilter || t.category_id === catFilter) && (!levelFilter || t.level === levelFilter)).length)} tarjetas)
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const known = results.filter(r => ratingToCorrect(r.rating)).length
    const pct = Math.round((known / results.length) * 100)
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Sesión completada</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className="text-5xl font-bold text-emerald-400 mb-1">{pct}%</div>
          <div className="text-slate-400 text-sm mb-6">{known} de {results.length} tarjetas</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {RATING_BUTTONS.map(rb => {
              const count = results.filter(r => r.rating === rb.value).length
              return (
                <div key={rb.value} className={`rounded-xl p-3 border ${rb.color}`}>
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-xs opacity-70">{rb.label}</div>
                </div>
              )
            })}
          </div>
          <div className="space-y-2">
            <button onClick={buildDeck}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
              Nueva sesión
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

  const term = deck[current]
  const cat = categories.find(c => c.id === term.category_id)
  const progress = ((current) / deck.length) * 100

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Flashcards</h1>
        <span className="text-slate-400 text-sm">{current + 1} / {deck.length}</span>
      </div>

      {/* Progress */}
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
             style={{ width: `${progress}%` }} />
      </div>

      {/* Card */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 min-h-[240px]
                      flex flex-col justify-between">
        <div>
          {cat && (
            <span className="text-xs text-slate-500 mb-3 block">{cat.icon} {cat.name}</span>
          )}
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold text-white">{term.word_en}</h2>
            <button
              onClick={() => speak(term.word_en)}
              className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-emerald-500/10
                         text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0">
              <Volume2 size={16} />
            </button>
          </div>
          {term.pronunciation && (
            <p className="text-slate-500 text-sm">{term.pronunciation}</p>
          )}
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="mt-6 w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                       text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium
                       transition-all flex items-center justify-center gap-2">
            <BookOpen size={16} />
            Revelar definición
          </button>
        ) : (
          <div className="mt-4 space-y-3 border-t border-slate-700/40 pt-4">
            <div className="text-emerald-300 font-medium text-sm">{term.translation_es}</div>
            <p className="text-slate-400 text-sm leading-relaxed">{term.definition_es}</p>
            {term.example_en && (
              <p className="text-slate-500 text-xs italic">"{term.example_en}"</p>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-2 gap-2">
          {RATING_BUTTONS.map(rb => (
            <button key={rb.value} onClick={() => rate(rb.value)}
              className={`border rounded-xl py-3 text-sm font-medium transition-all ${rb.color}`}>
              {rb.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
