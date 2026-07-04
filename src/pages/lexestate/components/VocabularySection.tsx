import { useState, useMemo } from 'react'
import { Search, Filter, ChevronRight, Star } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser } from '../types'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onSelectTerm: (id: string) => void
  onRefreshData: () => void
}

const LEVELS = ['A1','A2','B1','B2','C1','C2']

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-green-500/20 text-green-400 border-green-500/30',
  A2: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  B1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  B2: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  C1: 'bg-red-500/20 text-red-400 border-red-500/30',
  C2: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function VocabularySection({ terms, categories, dataLoaded, onSelectTerm }: Props) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState(0)
  const [sort, setSort] = useState<'alpha' | 'level' | 'difficulty' | 'frequency'>('alpha')
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let list = [...terms]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.word_en.toLowerCase().includes(q) ||
        t.translation_es.toLowerCase().includes(q) ||
        t.definition_en.toLowerCase().includes(q) ||
        t.definition_es.toLowerCase().includes(q) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
      )
    }
    if (catFilter) list = list.filter(t => t.category_id === catFilter)
    if (levelFilter) list = list.filter(t => t.level === levelFilter)
    if (diffFilter > 0) list = list.filter(t => t.difficulty === diffFilter)

    list.sort((a, b) => {
      if (sort === 'alpha') return a.word_en.localeCompare(b.word_en)
      if (sort === 'level') return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)
      if (sort === 'difficulty') return (a.difficulty ?? 3) - (b.difficulty ?? 3)
      if (sort === 'frequency') return (b.frequency ?? 3) - (a.frequency ?? 3)
      return 0
    })
    return list
  }, [terms, search, catFilter, levelFilter, diffFilter, sort])

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Vocabulario</h1>
        <span className="text-slate-400 text-sm">{filtered.length} términos</span>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar término, traducción, definición..."
            className="w-full bg-[#0f2040] border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5
                       text-sm text-white placeholder-slate-600
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`px-3 rounded-xl border transition-colors flex items-center gap-1.5 text-sm
            ${showFilters
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-[#0f2040] border-slate-700/50 text-slate-400 hover:text-white'}`}>
          <Filter size={15} />
          Filtros
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Categoría</label>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nivel</label>
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
                className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="">Todos</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Dificultad</label>
              <select value={diffFilter} onChange={e => setDiffFilter(Number(e.target.value))}
                className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value={0}>Todas</option>
                {[1,2,3,4,5].map(d => <option key={d} value={d}>{'★'.repeat(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ordenar por</label>
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                className="w-full appearance-none bg-[#0a1628] border border-slate-700/50 rounded-xl px-3 py-2
                           text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="alpha">Alfabético</option>
                <option value="level">Nivel</option>
                <option value="difficulty">Dificultad</option>
                <option value="frequency">Frecuencia</option>
              </select>
            </div>
          </div>
          {(catFilter || levelFilter || diffFilter > 0) && (
            <button
              onClick={() => { setCatFilter(''); setLevelFilter(''); setDiffFilter(0) }}
              className="text-xs text-slate-500 hover:text-white transition-colors">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Terms list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookSearch />
          <div className="mt-3">No se encontraron términos con ese filtro</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(term => {
            const cat = categories.find(c => c.id === term.category_id)
            return (
              <button
                key={term.id}
                onClick={() => onSelectTerm(term.id)}
                className="w-full bg-[#0f2040] hover:bg-[#132952] border border-slate-700/30
                           hover:border-emerald-500/20 rounded-xl px-4 py-3.5 text-left
                           transition-all group flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors capitalize">
                      {term.word_en}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[term.level] ?? ''}`}>
                      {term.level}
                    </span>
                    {cat && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/30 rounded px-1.5 py-0.5">
                        {cat.icon} {cat.name}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5 truncate">{term.translation_es}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {term.is_favorite && <Star size={13} className="text-amber-400 fill-amber-400" />}
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-500 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BookSearch() {
  return <Search size={32} className="mx-auto text-slate-600" />
}
