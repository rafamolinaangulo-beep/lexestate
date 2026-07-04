import { useState, useEffect } from 'react'
import { RotateCcw, CheckCircle, XCircle, BookOpen, BookType, Zap } from 'lucide-react'
import type {
  LexTerm, LexCategory, LexUser, LexVerb, LexPhrasalVerb, LexPhrasalVerbProgress, ProgressStatus,
} from '../types'
import { updateProgress, updateVerbProgress, fetchPhrasalVerbs, fetchPhrasalVerbProgress, updatePhrasalVerbProgress } from '../api'
import { updateLocalProgress, getLocalProgress, updateLocalVerbProgress, getLocalVerbProgress } from '../localStorage'

type ReviewCard =
  | { kind: 'term';    item: LexTerm }
  | { kind: 'verb';    item: LexVerb }
  | { kind: 'phrasal'; item: LexPhrasalVerb }

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
  termIds: string[]
  verbs?: LexVerb[]
  onFinish?: () => void
}

type Phase = 'loading' | 'empty' | 'session' | 'done'

const KIND_META = {
  term:    { label: 'Vocabulario',  icon: BookOpen, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  verb:    { label: 'Verbo',        icon: BookType,  color: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
  phrasal: { label: 'Phrasal Verb', icon: Zap,        color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
}

const DIFFICULT: ProgressStatus[] = ['difficult', 'learning']

export default function ReviewMistakesSection({
  user, terms, dataLoaded, termIds, verbs, onFinish,
}: Props) {
  const [deck, setDeck]       = useState<ReviewCard[]>([])
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore]     = useState(0)
  const [phase, setPhase]     = useState<Phase>('loading')

  useEffect(() => {
    if (!dataLoaded) return
    setPhase('loading')

    async function build() {
      const cards: ReviewCard[] = []

      // ── Vocabulary ──────────────────────────────────────────────────────────
      if (termIds.length > 0) {
        // Called from quiz "review mistakes" → only those specific terms
        const pool = terms.filter(t => termIds.includes(t.id))
        pool.forEach(t => cards.push({ kind: 'term', item: t }))
      } else {
        // Standalone review → all difficult/learning vocab
        const localProg = getLocalProgress()
        const filtered = terms.filter(t => {
          const status = t.progress?.status ?? localProg[t.id]?.status
          return status && DIFFICULT.includes(status as ProgressStatus)
        })
        filtered.forEach(t => cards.push({ kind: 'term', item: t }))
      }

      // ── Verbs (only in standalone mode) ─────────────────────────────────────
      if (termIds.length === 0 && verbs && verbs.length > 0) {
        const localVerbProg = getLocalVerbProgress()
        verbs
          .filter(v => {
            const status = v.progress?.status ?? localVerbProg[v.id]?.status
            return status && DIFFICULT.includes(status as ProgressStatus)
          })
          .forEach(v => cards.push({ kind: 'verb', item: v }))
      }

      // ── Phrasal verbs (only in standalone mode) ──────────────────────────────
      if (termIds.length === 0) {
        try {
          const [pvs, pvProg] = await Promise.all([
            fetchPhrasalVerbs(),
            fetchPhrasalVerbProgress().catch((): LexPhrasalVerbProgress[] => []),
          ])
          const progMap: Record<string, LexPhrasalVerbProgress> =
            Object.fromEntries(pvProg.map(p => [p.phrasal_verb_id, p]))
          pvs
            .filter(pv => {
              const status = progMap[pv.id]?.status
              return status && DIFFICULT.includes(status as ProgressStatus)
            })
            .forEach(pv => cards.push({ kind: 'phrasal', item: pv }))
        } catch {
          // no phrasal verb data available
        }
      }

      if (cards.length === 0) {
        // Fallback: show a sample of terms if nothing is difficult
        if (termIds.length === 0) {
          terms.slice(0, 10).forEach(t => cards.push({ kind: 'term', item: t }))
        }
      }

      if (cards.length === 0) {
        setPhase('empty')
        return
      }

      setDeck(cards.sort(() => Math.random() - 0.5))
      setCurrent(0)
      setRevealed(false)
      setScore(0)
      setPhase('session')
    }

    build()
  }, [termIds, terms, dataLoaded, verbs])

  async function answer(isCorrect: boolean) {
    const card = deck[current]
    if (isCorrect) setScore(s => s + 1)

    if (card.kind === 'term') {
      user
        ? await updateProgress(card.item.id, isCorrect, 'review', 'flashcard').catch(() => {})
        : updateLocalProgress(card.item.id, isCorrect)
    } else if (card.kind === 'verb') {
      user
        ? await updateVerbProgress(card.item.id, isCorrect, 'review').catch(() => {})
        : updateLocalVerbProgress(card.item.id, isCorrect)
    } else {
      if (user) {
        await updatePhrasalVerbProgress(card.item.id, isCorrect).catch(() => {})
      }
    }

    if (current + 1 >= deck.length) {
      setPhase('done')
    } else {
      setCurrent(c => c + 1)
      setRevealed(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-4" />
        <div className="text-slate-500 text-sm">Preparando repaso…</div>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RotateCcw size={32} className="text-slate-600 mb-3" />
        <div className="text-slate-400 text-sm mb-1">No hay elementos que repasar</div>
        <div className="text-slate-600 text-xs">Practica vocabulario, verbos y phrasal verbs para generar elementos de repaso.</div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const pct = Math.round((score / deck.length) * 100)
    const byKind = deck.reduce((acc, c) => {
      acc[c.kind] = (acc[c.kind] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-white">Repaso completado</h1>
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-8 text-center">
          <div className={`text-5xl font-bold mb-2 ${pct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pct}%
          </div>
          <div className="text-slate-400 mb-4">{score} de {deck.length} correctas</div>
          <div className="flex gap-2 justify-center flex-wrap mb-6">
            {(Object.entries(byKind) as [keyof typeof KIND_META, number][]).map(([k, n]) => {
              const m = KIND_META[k]
              const Icon = m.icon
              return (
                <div key={k} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${m.color}`}>
                  <Icon size={11} /> {n} {m.label.toLowerCase()}
                </div>
              )
            })}
          </div>
          <button onClick={onFinish}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-colors">
            Volver al test
          </button>
        </div>
      </div>
    )
  }

  // ── Session ───────────────────────────────────────────────────────────────────
  const card = deck[current]
  const meta = KIND_META[card.kind]
  const Icon = meta.icon
  const pct = (current / deck.length) * 100

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <RotateCcw size={17} className="text-amber-400" />
          Repaso
        </h1>
        <span className="text-slate-400 text-sm">{current + 1} / {deck.length}</span>
      </div>

      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6 space-y-4">
        {/* Kind badge */}
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>
            <Icon size={11} /> {meta.label}
          </span>
        </div>

        {/* Front */}
        <CardFront card={card} />

        {/* Back */}
        {!revealed ? (
          <button onClick={() => setRevealed(true)}
            className="w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40
                       text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-all">
            Revelar
          </button>
        ) : (
          <div className="space-y-3 border-t border-slate-700/40 pt-4">
            <CardBack card={card} />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => answer(false)}
                className="flex items-center justify-center gap-2 border border-red-500/30
                           bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2.5 rounded-xl transition-all text-sm font-medium">
                <XCircle size={15} /> No lo sé
              </button>
              <button onClick={() => answer(true)}
                className="flex items-center justify-center gap-2 border border-emerald-500/30
                           bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2.5 rounded-xl transition-all text-sm font-medium">
                <CheckCircle size={15} /> Lo sé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardFront({ card }: { card: ReviewCard }) {
  if (card.kind === 'term') {
    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-white mb-1">{card.item.word_en}</div>
        {card.item.pronunciation && <div className="text-slate-500 text-sm">{card.item.pronunciation}</div>}
      </div>
    )
  }
  if (card.kind === 'verb') {
    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-white mb-1">{card.item.base_form}</div>
        <div className="text-slate-400 text-sm">{card.item.translation_es}</div>
        <div className="text-slate-600 text-xs mt-1">¿Past Simple y Past Participle?</div>
      </div>
    )
  }
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white mb-1">{card.item.phrasal_verb}</div>
      <div className="text-slate-500 text-xs">{card.item.category_es}</div>
    </div>
  )
}

function CardBack({ card }: { card: ReviewCard }) {
  if (card.kind === 'term') {
    return (
      <>
        <div className="text-emerald-300 font-semibold">{card.item.translation_es}</div>
        <p className="text-slate-400 text-sm leading-relaxed">{card.item.definition_es}</p>
        {card.item.example_en && (
          <p className="text-slate-500 text-xs italic">"{card.item.example_en}"</p>
        )}
      </>
    )
  }
  if (card.kind === 'verb') {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0a1628] rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Past Simple</div>
            <div className="text-white font-semibold">{card.item.past_simple}</div>
          </div>
          <div className="bg-[#0a1628] rounded-xl p-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Past Participle</div>
            <div className="text-white font-semibold">{card.item.past_participle}</div>
          </div>
        </div>
        {card.item.example_past && (
          <p className="text-slate-500 text-xs italic">"{card.item.example_past}"</p>
        )}
        {card.item.notes && (
          <p className="text-slate-600 text-xs">{card.item.notes}</p>
        )}
      </>
    )
  }
  return (
    <>
      <div className="text-violet-300 font-semibold">{card.item.translation_es}</div>
      <p className="text-slate-400 text-sm leading-relaxed">{card.item.definition_es}</p>
      {card.item.example_en && (
        <p className="text-slate-500 text-xs italic">"{card.item.example_en}"</p>
      )}
    </>
  )
}
