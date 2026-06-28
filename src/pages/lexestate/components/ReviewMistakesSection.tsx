import { useState, useEffect } from 'react'
import { RotateCcw, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser } from '../types'
import { updateProgress } from '../api'
import { updateLocalProgress, getLocalProgress } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
  termIds: string[]
}

type Phase = 'session' | 'done'

export default function ReviewMistakesSection({ user, terms, dataLoaded, termIds }: Props) {
  const [deck, setDeck] = useState<LexTerm[]>([])
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<Phase>('session')

  useEffect(() => {
    if (!dataLoaded) return
    let pool: LexTerm[]
    if (termIds && termIds.length > 0) {
      pool = terms.filter(t => termIds.includes(t.id))
    } else {
      // Show difficult terms from localStorage/progress
      const progress = getLocalProgress()
      pool = terms.filter(t => {
        const p = progress[t.id]
        return p?.status === 'difficult' || p?.status === 'learning'
      })
    }
    if (pool.length === 0) pool = terms.slice(0, 10)
    setDeck(pool.sort(() => Math.random() - 0.5))
    setCurrent(0)
    setRevealed(false)
    setScore(0)
    setPhase('session')
  }, [termIds, terms, dataLoaded])

  async function answer(isCorrect: boolean) {
    const term = deck[current]
    if (isCorrect) setScore(s => s + 1)
    if (user) {
      await updateProgress(term.id, isCorrect, 'review', 'flashcard').catch(() => {})
    } else {
      updateLocalProgress(term.id, isCorrect)
    }
    if (current + 1 >= deck.length) {
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setRevealed(false)
    }
  }

  if (!dataLoaded || deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RotateCcw size={32} className="text-slate-600 mb-3" />
        <div className="text-slate-400 text-sm">No hay términos para repasar</div>
      </div>
    )
  }

  if (phase === 'done') {
    const pct = Math.round((score / deck.length) * 100)
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Repaso completado</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className={`text-5xl font-bold mb-2 ${pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pct}%
          </div>
          <div className="text-slate-400">{score} de {deck.length} correctas</div>
          <button
            onClick={() => { setCurrent(0); setRevealed(false); setScore(0); setPhase('session') }}
            className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold
                       py-2.5 rounded-xl transition-colors">
            Repetir repaso
          </button>
        </div>
      </div>
    )
  }

  const term = deck[current]

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <RotateCcw size={17} className="text-amber-400" />
          Repaso de errores
        </h1>
        <span className="text-slate-400 text-sm">{current + 1} / {deck.length}</span>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
             style={{ width: `${(current / deck.length) * 100}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-1">{term.word_en}</div>
          {term.pronunciation && <div className="text-slate-500 text-sm">{term.pronunciation}</div>}
        </div>

        {!revealed ? (
          <button onClick={() => setRevealed(true)}
            className="w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                       text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-all">
            Revelar
          </button>
        ) : (
          <div className="space-y-3 border-t border-slate-700/40 pt-4">
            <div className="text-emerald-300 font-semibold">{term.translation_es}</div>
            <p className="text-slate-400 text-sm leading-relaxed">{term.definition_es}</p>
            {term.example_en && (
              <p className="text-slate-500 text-xs italic">"{term.example_en}"</p>
            )}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => answer(false)}
                className="flex items-center justify-center gap-2 border border-red-500/30
                           bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2.5 rounded-xl
                           transition-all text-sm font-medium">
                <XCircle size={15} />
                No la sé
              </button>
              <button onClick={() => answer(true)}
                className="flex items-center justify-center gap-2 border border-emerald-500/30
                           bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2.5 rounded-xl
                           transition-all text-sm font-medium">
                <CheckCircle size={15} />
                La sé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
