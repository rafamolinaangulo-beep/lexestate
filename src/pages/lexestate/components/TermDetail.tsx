import { useEffect, useState } from 'react'
import { ArrowLeft, Star, Volume2, BookOpen, Tag, AlertCircle, Lightbulb } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, LexView } from '../types'
import { toggleFavorite } from '../api'
import { toggleLocalFavorite, isLocalFavorite } from '../localStorage'

interface Props {
  termId: string
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  onBack: () => void
  onNavigate: (v: LexView, termId?: string) => void
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-green-500/20 text-green-400 border-green-500/30',
  A2: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  B1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  B2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C1: 'bg-red-500/20 text-red-400 border-red-500/30',
  C2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-GB'
  utt.rate = 0.85
  window.speechSynthesis.speak(utt)
}

export default function TermDetail({ termId, user, terms, categories, onBack, onNavigate }: Props) {
  const term = terms.find(t => t.id === termId)
  const [isFav, setIsFav] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  useEffect(() => {
    if (!term) return
    setIsFav(isLocalFavorite(term.id))
  }, [term])

  if (!term) {
    return (
      <div className="text-center py-16">
        <div className="text-slate-500">Término no encontrado</div>
        <button onClick={onBack} className="mt-4 text-emerald-400 text-sm hover:underline">
          ← Volver
        </button>
      </div>
    )
  }

  const category = categories.find(c => c.id === term.category_id)

  async function handleFavorite() {
    setFavLoading(true)
    try {
      if (user) {
        const res = await toggleFavorite(term!.id)
        setIsFav(res.is_favorite)
      } else {
        const newVal = toggleLocalFavorite(term!.id)
        setIsFav(newVal)
      }
    } finally {
      setFavLoading(false)
    }
  }

  const relatedTerms = terms.filter(t =>
    (term.related_terms ?? []).some(r => t.word_en.toLowerCase() === r.toLowerCase())
  ).slice(0, 4)

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} />
          Vocabulario
        </button>
        <button
          onClick={handleFavorite}
          disabled={favLoading}
          className="p-2 rounded-xl hover:bg-amber-500/10 transition-colors">
          <Star size={20} className={isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} />
        </button>
      </div>

      {/* Main card */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-6">
        {/* Word + level */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-3xl font-bold text-white">{term.word_en}</h1>
          <span className={`text-xs font-bold px-2 py-1 rounded border flex-shrink-0 ${LEVEL_COLORS[term.level] ?? ''}`}>
            {term.level}
          </span>
        </div>

        {/* Pronunciation */}
        <div className="flex items-center gap-3 mb-4">
          {term.pronunciation && (
            <span className="text-slate-400 text-sm">{term.pronunciation}</span>
          )}
          {term.ipa && (
            <span className="text-slate-500 text-sm font-mono">{term.ipa}</span>
          )}
          <button
            onClick={() => speak(term.word_en)}
            className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-emerald-500/10
                       text-slate-500 hover:text-emerald-400 transition-colors">
            <Volume2 size={14} />
          </button>
        </div>

        {/* Translation */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
          <div className="text-xs text-emerald-400/70 uppercase tracking-wider mb-1">Traducción</div>
          <div className="text-emerald-300 font-semibold">{term.translation_es}</div>
        </div>

        {/* Category + tags */}
        {(category || (term.tags ?? []).length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {category && (
              <span className="flex items-center gap-1 text-xs bg-slate-700/40 text-slate-400 rounded-lg px-2.5 py-1">
                <BookOpen size={11} />
                {category.icon} {category.name}
              </span>
            )}
            {(term.tags ?? []).map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-slate-700/30 text-slate-500 rounded-lg px-2 py-0.5">
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Definitions */}
      <div className="grid md:grid-cols-2 gap-3">
        <Section title="Definición en inglés" color="text-blue-400">
          <p className="text-slate-300 text-sm leading-relaxed">{term.definition_en}</p>
        </Section>
        <Section title="Definición en español" color="text-slate-300">
          <p className="text-slate-300 text-sm leading-relaxed">{term.definition_es}</p>
        </Section>
      </div>

      {/* Examples */}
      {(term.example_en || term.example_es) && (
        <Section title="Ejemplos" color="text-emerald-400">
          {term.example_en && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">English</div>
              <p className="text-slate-300 text-sm italic">"{term.example_en}"</p>
            </div>
          )}
          {term.example_es && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Español</div>
              <p className="text-slate-400 text-sm italic">"{term.example_es}"</p>
            </div>
          )}
        </Section>
      )}

      {/* Synonyms */}
      {(term.synonyms ?? []).length > 0 && (
        <Section title="Sinónimos" color="text-violet-400">
          <div className="flex flex-wrap gap-2">
            {(term.synonyms ?? []).map(s => (
              <span key={s} className="text-xs bg-violet-500/10 border border-violet-500/20
                                       text-violet-300 rounded-lg px-2.5 py-1">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Common mistakes */}
      {term.common_mistakes && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
                Error común
              </div>
              <div className="text-slate-300 text-sm">{term.common_mistakes}</div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {term.notes && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Lightbulb size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">Nota</div>
              <div className="text-slate-300 text-sm">{term.notes}</div>
            </div>
          </div>
        </div>
      )}

      {/* Related terms */}
      {relatedTerms.length > 0 && (
        <Section title="Términos relacionados" color="text-teal-400">
          <div className="space-y-1">
            {relatedTerms.map(t => (
              <button key={t.id} onClick={() => onNavigate('term-detail', t.id)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400
                           transition-colors group">
                <span className="text-xs text-slate-600">→</span>
                <span className="group-hover:underline">{t.word_en}</span>
                <span className="text-slate-600 text-xs">— {t.translation_es}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Difficulty / Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <Section title="Dificultad" color="text-slate-400">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`text-lg ${n <= (term.difficulty ?? 3) ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
            ))}
          </div>
        </Section>
        <Section title="Frecuencia de uso" color="text-slate-400">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={`text-lg ${n <= (term.frequency ?? 3) ? 'text-emerald-400' : 'text-slate-700'}`}>●</span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f2040] border border-slate-700/30 rounded-xl p-4">
      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>{title}</div>
      {children}
    </div>
  )
}
