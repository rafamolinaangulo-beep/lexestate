import { useEffect, useState } from 'react'
import { Heart, ChevronRight, Trash2 } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, LexView } from '../types'
import { fetchFavorites, toggleFavorite } from '../api'
import { getLocalFavorites, toggleLocalFavorite } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
  onSelectTerm: (id: string) => void
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'text-green-400', A2: 'text-lime-400', B1: 'text-yellow-400',
  B2: 'text-orange-400', C1: 'text-red-400', C2: 'text-purple-400',
}

export default function FavoritesSection({ user, terms, categories, dataLoaded, onSelectTerm }: Props) {
  const [favIds, setFavIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dataLoaded) return
    if (user) {
      fetchFavorites()
        .then(favs => setFavIds(favs.map(f => f.term_id)))
        .catch(() => setFavIds(getLocalFavorites()))
        .finally(() => setLoading(false))
    } else {
      setFavIds(getLocalFavorites())
      setLoading(false)
    }
  }, [user, dataLoaded])

  async function removeFavorite(termId: string) {
    if (user) {
      await toggleFavorite(termId).catch(() => {})
    } else {
      toggleLocalFavorite(termId)
    }
    setFavIds(prev => prev.filter(id => id !== termId))
  }

  const favTerms = terms.filter(t => favIds.includes(t.id))

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Heart size={18} className="text-pink-400 fill-pink-400" />
          Favoritos
        </h1>
        <span className="text-slate-400 text-sm">{favTerms.length} términos</span>
      </div>

      {favTerms.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={40} className="mx-auto text-slate-700 mb-3" />
          <div className="text-slate-400 text-sm">Aún no tienes favoritos</div>
          <div className="text-slate-600 text-xs mt-1">
            Guarda términos desde su ficha de detalle
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {favTerms.map(term => {
            const cat = categories.find(c => c.id === term.category_id)
            return (
              <div key={term.id}
                className="bg-[#0f2040] border border-slate-700/30 hover:border-emerald-500/20
                           rounded-xl px-4 py-3.5 flex items-center gap-3 group transition-all">
                <button className="flex-1 text-left" onClick={() => onSelectTerm(term.id)}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">
                      {term.word_en}
                    </span>
                    <span className={`text-[10px] font-bold ${LEVEL_COLORS[term.level] ?? ''}`}>
                      {term.level}
                    </span>
                    {cat && <span className="text-[10px] text-slate-500">{cat.icon}</span>}
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">{term.translation_es}</div>
                </button>
                <button onClick={() => removeFavorite(term.id)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10
                             rounded-lg transition-all flex-shrink-0">
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-emerald-500 flex-shrink-0 transition-colors" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
