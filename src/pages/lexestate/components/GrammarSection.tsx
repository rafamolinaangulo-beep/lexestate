import { useState, useEffect } from 'react'
import { BookMarked, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Layers, Dumbbell } from 'lucide-react'
import type { LexGrammarTopic, LexUser } from '../types'
import { fetchGrammarTopics } from '../api'
import GrammarPractice from './GrammarPractice'

interface Props {
  user: LexUser | null
}

const LEVELS = ['B1', 'B2', 'C1', 'C2'] as const
type Level = typeof LEVELS[number]

const LEVEL_COLORS: Record<Level, string> = {
  B1: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  B2: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  C1: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  C2: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

const LEVEL_ACTIVE: Record<Level, string> = {
  B1: 'bg-sky-500 text-white',
  B2: 'bg-violet-500 text-white',
  C1: 'bg-amber-500 text-black',
  C2: 'bg-rose-500 text-white',
}

export default function GrammarSection({ user: _user }: Props) {
  const [topics, setTopics] = useState<LexGrammarTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<Level | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [practiceTopic, setPracticeTopic] = useState<LexGrammarTopic | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchGrammarTopics()
      .then(setTopics)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar gramática'))
      .finally(() => setLoading(false))
  }, [])

  if (practiceTopic) {
    return <GrammarPractice topic={practiceTopic} onBack={() => setPracticeTopic(null)} />
  }

  const categories = Array.from(new Set(topics.map(t => t.category_es))).sort()

  const filtered = topics.filter(t => {
    const matchLevel = !levelFilter || t.level === levelFilter
    const matchCat = !categoryFilter || t.category_es === categoryFilter
    return matchLevel && matchCat
  })

  // Group by level, then by category
  const grouped: Record<Level, Record<string, LexGrammarTopic[]>> = {
    B1: {}, B2: {}, C1: {}, C2: {}
  }
  for (const t of filtered) {
    if (!grouped[t.level]) grouped[t.level] = {}
    if (!grouped[t.level][t.category_es]) grouped[t.level][t.category_es] = []
    grouped[t.level][t.category_es].push(t)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={() => window.location.reload()}
        className="mt-4 text-emerald-400 text-sm underline">Reintentar</button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookMarked size={20} className="text-emerald-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Gramática</h1>
          <p className="text-slate-500 text-xs">Real Estate English · B1 a C2</p>
        </div>
        <span className="ml-auto text-slate-600 text-sm">{filtered.length} temas</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Level pills */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setLevelFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${!levelFilter
                ? 'bg-emerald-500 text-white border-transparent'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
            Todos
          </button>
          {LEVELS.map(l => (
            <button key={l}
              onClick={() => setLevelFilter(l === levelFilter ? '' : l)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                ${levelFilter === l
                  ? LEVEL_ACTIVE[l]
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Category select */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="appearance-none bg-[#0f2040] border border-slate-700/50 rounded-xl px-3 py-1.5
                     text-xs text-white focus:outline-none focus:border-emerald-500/50 ml-auto">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No hay temas para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.entries(grouped) as [Level, Record<string, LexGrammarTopic[]>][])
            .filter(([, cats]) => Object.keys(cats).length > 0)
            .map(([level, cats]) => (
              <section key={level}>
                {/* Level header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${LEVEL_COLORS[level]}`}>
                    {level}
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="space-y-6">
                  {Object.entries(cats).map(([cat, catTopics]) => (
                    <div key={cat}>
                      {/* Category label */}
                      {!categoryFilter && (
                        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
                          {cat}
                        </h3>
                      )}

                      <div className="space-y-2">
                        {catTopics.map(topic => (
                          <TopicCard
                            key={topic.id}
                            topic={topic}
                            expanded={expandedId === topic.id}
                            onToggle={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
                            onPractice={() => setPracticeTopic(topic)}
                            levelColor={LEVEL_COLORS[level]}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  )
}

interface TopicCardProps {
  topic: LexGrammarTopic
  expanded: boolean
  onToggle: () => void
  onPractice: () => void
  levelColor: string
}

function TopicCard({ topic, expanded, onToggle, onPractice, levelColor }: TopicCardProps) {
  return (
    <div className={`bg-[#0f2040] border rounded-2xl overflow-hidden transition-all
      ${expanded ? 'border-emerald-500/30' : 'border-slate-700/30 hover:border-slate-600/50'}`}>
      {/* Header — always visible */}
      <div className="flex items-center gap-2 px-5 py-4">
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm">{topic.title}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelColor}`}>
                {topic.level}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">{topic.title_es}</p>
          </div>
          {expanded
            ? <ChevronUp size={16} className="text-emerald-400 flex-shrink-0" />
            : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onPractice() }}
          title="Practicar ejercicios de este tema"
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0
                     bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20
                     transition-all">
          <Dumbbell size={12} /> Practicar
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-700/30 pt-4">
          {/* Structure formula */}
          {topic.structure && (
            <div className="bg-[#0a1628] border border-emerald-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers size={13} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Estructura</span>
              </div>
              <code className="text-emerald-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {topic.structure}
              </code>
            </div>
          )}

          {/* Explanation */}
          <div>
            <p className="text-slate-300 text-sm leading-relaxed">{topic.explanation_es}</p>
            {topic.explanation_en && (
              <p className="text-slate-500 text-xs mt-2 italic leading-relaxed">{topic.explanation_en}</p>
            )}
          </div>

          {/* Examples */}
          {topic.examples && topic.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Ejemplos</h4>
              {topic.examples.map((ex, i) => (
                <div key={i} className="bg-[#0a1628] border border-slate-700/30 rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-white text-sm italic">"{ex.en}"</p>
                  <p className="text-slate-400 text-xs">→ {ex.es}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          {topic.tips && (
            <div className="flex gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
              <Lightbulb size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-sm leading-relaxed">{topic.tips}</p>
            </div>
          )}

          {/* Common mistakes */}
          {topic.common_mistakes && (
            <div className="flex gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-sm leading-relaxed">{topic.common_mistakes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
