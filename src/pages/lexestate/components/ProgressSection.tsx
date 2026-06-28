import { useEffect, useState } from 'react'
import { TrendingUp, Target, Zap, Calendar, BarChart2, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, LexStats, LexView, LexQuizResult, LexUserProgress } from '../types'
import { fetchStats, fetchQuizResults, fetchUserProgress } from '../api'
import { computeLocalStats, getLocalQuizResults, getLocalProgress } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onRefreshData: () => void
  onNavigate: (v: LexView) => void
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-green-500', A2: 'bg-lime-500', B1: 'bg-yellow-500',
  B2: 'bg-orange-500', C1: 'bg-red-500', C2: 'bg-purple-500',
}

function formatDate(s: string | null | undefined) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const LEVEL_BADGE: Record<string, string> = {
  A1: 'bg-green-500/20 text-green-400', A2: 'bg-lime-500/20 text-lime-400',
  B1: 'bg-yellow-500/20 text-yellow-400', B2: 'bg-orange-500/20 text-orange-400',
  C1: 'bg-red-500/20 text-red-400', C2: 'bg-purple-500/20 text-purple-400',
}

export default function ProgressSection({ user, terms, categories, dataLoaded, onNavigate }: Props) {
  const [stats, setStats] = useState<LexStats | null>(null)
  const [results, setResults] = useState<LexQuizResult[]>([])
  const [masteredTerms, setMasteredTerms] = useState<LexTerm[]>([])
  const [showMastered, setShowMastered] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dataLoaded) return
    setLoading(true)

    const statsP = user
      ? fetchStats().catch(() => computeLocalStats(terms.length))
      : Promise.resolve(computeLocalStats(terms.length))

    const resultsP = user
      ? fetchQuizResults().catch(() => getLocalQuizResults())
      : Promise.resolve(getLocalQuizResults())

    const progressP: Promise<LexUserProgress[]> = user
      ? fetchUserProgress().catch(() => [])
      : Promise.resolve(
          Object.entries(getLocalProgress())
            .map(([term_id, p]) => ({ term_id, ...p } as LexUserProgress))
        )

    Promise.all([statsP, resultsP, progressP]).then(([s, r, progress]) => {
      setStats(s)
      setResults(r.slice(0, 10))
      const masteredIds = new Set(progress.filter(p => p.status === 'mastered').map(p => p.term_id))
      setMasteredTerms(terms.filter(t => masteredIds.has(t.id)))
    }).finally(() => setLoading(false))
  }, [user, dataLoaded, terms])

  // Progress by level
  const levelStats = ['A1','A2','B1','B2','C1','C2'].map(level => {
    const levelTerms = terms.filter(t => t.level === level)
    return { level, total: levelTerms.length }
  })

  // Progress by category
  const catStats = categories.map(cat => {
    const catTerms = terms.filter(t => t.category_id === cat.id)
    return { cat, total: catTerms.length }
  }).filter(c => c.total > 0).slice(0, 8)

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <TrendingUp size={20} className="text-emerald-400" />
        Progreso
      </h1>

      {/* Main stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: stats.total,    color: 'text-white' },
            { label: 'Pendientes',  value: stats.pending,  color: 'text-slate-400' },
            { label: 'Aprendiendo', value: stats.learning, color: 'text-blue-400' },
            { label: 'Difíciles',   value: stats.difficult,color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#0f2040] border border-slate-700/30 rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mastered progress */}
      {stats && (
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-400" />
              <span className="text-white font-medium text-sm">Palabras dominadas</span>
            </div>
            <span className="text-emerald-400 font-bold text-lg">
              {stats.mastered} / {stats.total}
            </span>
          </div>
          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
                 style={{ width: `${stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1.5">
            <span>Precisión global: {stats.accuracy}%</span>
            <span>{stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0}% completado</span>
          </div>
        </div>
      )}

      {/* By level */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
        <h2 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
          <BarChart2 size={15} className="text-slate-400" />
          Términos por nivel
        </h2>
        <div className="space-y-2.5">
          {levelStats.map(ls => (
            <div key={ls.level} className="flex items-center gap-3">
              <div className={`text-xs font-bold px-2 py-0.5 rounded ${LEVEL_COLORS[ls.level]} text-white w-10 text-center`}>
                {ls.level}
              </div>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${LEVEL_COLORS[ls.level]} rounded-full`}
                     style={{ width: `${terms.length > 0 ? (ls.total / terms.length) * 100 : 0}%` }} />
              </div>
              <span className="text-slate-400 text-xs w-8 text-right">{ls.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
        <h2 className="text-white font-medium text-sm mb-4">Términos por categoría</h2>
        <div className="space-y-2">
          {catStats.map(cs => (
            <div key={cs.cat.id} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-32 truncate">{cs.cat.icon} {cs.cat.name}</span>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full"
                     style={{ width: `${terms.length > 0 ? (cs.total / terms.length) * 100 : 0}%` }} />
              </div>
              <span className="text-slate-400 text-xs w-6 text-right">{cs.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent quiz results */}
      {results.length > 0 && (
        <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
          <h2 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-slate-400" />
            Últimos tests
          </h2>
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <span className={`font-bold w-12 text-right ${r.percentage >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {Math.round(r.percentage)}%
                </span>
                <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${r.percentage >= 70 ? 'bg-emerald-500' : 'bg-red-500'}`}
                       style={{ width: `${r.percentage}%` }} />
                </div>
                <span className="text-slate-500 text-xs">{formatDate(r.created_at)}</span>
                <span className="text-slate-500 text-xs">{r.score}/{r.total_questions}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mastered words registry */}
      <div className="bg-[#0f2040] border border-emerald-500/20 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowMastered(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <CheckCheck size={16} className="text-emerald-400" />
            <span className="text-white font-medium text-sm">Palabras dominadas</span>
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {masteredTerms.length}
            </span>
          </div>
          {showMastered
            ? <ChevronUp size={16} className="text-slate-400" />
            : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showMastered && (
          masteredTerms.length === 0 ? (
            <div className="px-5 pb-5 text-slate-500 text-sm text-center py-4">
              Aún no has dominado ninguna palabra.<br />
              <span className="text-xs">Marca "La domino" en flashcards o consigue 3 aciertos seguidos.</span>
            </div>
          ) : (
            <div className="border-t border-slate-700/40 divide-y divide-slate-700/20">
              {masteredTerms.map(t => {
                const cat = categories.find(c => c.id === t.category_id)
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{t.word_en}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${LEVEL_BADGE[t.level] ?? ''}`}>
                          {t.level}
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs truncate">
                        {t.translation_es}{cat ? ` · ${cat.name}` : ''}
                      </div>
                    </div>
                    <CheckCheck size={13} className="text-emerald-500 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {stats && stats.difficult > 0 && (
        <button onClick={() => onNavigate('review')}
          className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400
                     hover:bg-amber-500/20 py-3 rounded-xl transition-colors text-sm font-medium
                     flex items-center justify-center gap-2">
          <Zap size={15} />
          Repasar los {stats.difficult} términos difíciles
        </button>
      )}
    </div>
  )
}
