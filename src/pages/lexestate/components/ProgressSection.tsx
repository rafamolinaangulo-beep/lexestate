import { useEffect, useState } from 'react'
import { TrendingUp, Target, Zap, Calendar, BarChart2, CheckCheck, ChevronDown, ChevronUp, BookType, Headphones, FileText, GraduationCap, PenLine, MessageSquare, Mail } from 'lucide-react'
import type { LexTerm, LexCategory, LexUser, LexStats, LexView, LexQuizResult, LexUserProgress, LexVerbStats } from '../types'
import { fetchStats, fetchQuizResults, fetchUserProgress, fetchVerbStats } from '../api'
import { computeLocalStats, getLocalQuizResults, getLocalProgress, computeLocalVerbStats, getActivityLog, getLocalStreak, getPracticeStats } from '../localStorage'

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
  const [verbStats, setVerbStats] = useState<LexVerbStats | null>(null)
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

    const verbStatsP = user
      ? fetchVerbStats().catch(() => computeLocalVerbStats(0) as LexVerbStats)
      : Promise.resolve(computeLocalVerbStats(0) as LexVerbStats)

    const resultsP = user
      ? fetchQuizResults().catch(() => getLocalQuizResults())
      : Promise.resolve(getLocalQuizResults())

    const progressP: Promise<LexUserProgress[]> = user
      ? fetchUserProgress().catch(() => [])
      : Promise.resolve(
          Object.entries(getLocalProgress())
            .map(([term_id, p]) => ({ term_id, ...p } as LexUserProgress))
        )

    Promise.all([statsP, verbStatsP, resultsP, progressP]).then(([s, vs, r, progress]) => {
      setStats(s)
      setVerbStats(vs)
      setResults(r.slice(0, 10))
      const masteredIds = new Set(progress.filter(p => p.status === 'mastered').map(p => p.term_id))
      setMasteredTerms(terms.filter(t => masteredIds.has(t.id)))
    }).finally(() => setLoading(false))
  }, [user, dataLoaded, terms])

  const masteredSet = new Set(masteredTerms.map(t => t.id))

  // Progress by level
  const levelStats = ['A1','A2','B1','B2','C1','C2'].map(level => {
    const levelTerms = terms.filter(t => t.level === level)
    const mastered = levelTerms.filter(t => masteredSet.has(t.id)).length
    return { level, total: levelTerms.length, mastered }
  })

  // Progress by category
  const catStats = categories.map(cat => {
    const catTerms = terms.filter(t => t.category_id === cat.id)
    const mastered = catTerms.filter(t => masteredSet.has(t.id)).length
    return { cat, total: catTerms.length, mastered }
  }).filter(c => c.total > 0).slice(0, 8)

  const activityLog = getActivityLog()
  const localStreak = getLocalStreak()

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <TrendingUp size={20} className="text-emerald-400" />
        Progreso
      </h1>

      {/* Streak + heatmap */}
      <ActivityHeatmap log={activityLog} streak={stats?.streak ?? localStreak} />

      {/* Main stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: stats.total,    color: 'text-white' },
            { label: 'Dominadas',   value: stats.mastered, color: 'text-emerald-400' },
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

      {/* Verb stats */}
      {verbStats && verbStats.total > 0 && (
        <div className="bg-[#0f2040] border border-cyan-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookType size={15} className="text-cyan-400" />
            <h2 className="text-white font-medium text-sm">Progreso de verbos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total',       value: verbStats.total,    color: 'text-white' },
              { label: 'Dominados',   value: verbStats.mastered, color: 'text-emerald-400' },
              { label: 'Aprendiendo', value: verbStats.learning, color: 'text-blue-400' },
              { label: 'Difíciles',   value: verbStats.difficult,color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#0a1628] border border-slate-700/20 rounded-xl p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-600 text-[11px] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 rounded-full transition-all"
                 style={{ width: `${verbStats.total > 0 ? Math.round((verbStats.mastered / verbStats.total) * 100) : 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1.5">
            <span>Precisión: {verbStats.accuracy}%</span>
            <span>{verbStats.total > 0 ? Math.round((verbStats.mastered / verbStats.total) * 100) : 0}% completado</span>
          </div>
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
          Progreso por nivel
        </h2>
        <div className="space-y-2.5">
          {levelStats.filter(ls => ls.total > 0).map(ls => (
            <div key={ls.level} className="flex items-center gap-3">
              <div className={`text-xs font-bold px-2 py-0.5 rounded ${LEVEL_COLORS[ls.level]} text-white w-10 text-center`}>
                {ls.level}
              </div>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${LEVEL_COLORS[ls.level]} rounded-full transition-all`}
                     style={{ width: `${ls.total > 0 ? (ls.mastered / ls.total) * 100 : 0}%` }} />
              </div>
              <span className="text-slate-400 text-xs w-14 text-right">{ls.mastered}/{ls.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By category */}
      <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
        <h2 className="text-white font-medium text-sm mb-4">Progreso por categoría</h2>
        <div className="space-y-2">
          {catStats.map(cs => (
            <div key={cs.cat.id} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-32 truncate">{cs.cat.icon} {cs.cat.name}</span>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full transition-all"
                     style={{ width: `${cs.total > 0 ? (cs.mastered / cs.total) * 100 : 0}%` }} />
              </div>
              <span className="text-slate-400 text-xs w-10 text-right">{cs.mastered}/{cs.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Practice modes overview */}
      <PracticeModesCard quizResults={results} onNavigate={onNavigate} />

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

function relativeDate(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function AccuracyBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-9 text-right ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
        {pct}%
      </span>
    </div>
  )
}

function PracticeModesCard({ quizResults, onNavigate }: { quizResults: LexQuizResult[]; onNavigate: (v: LexView) => void }) {
  const listening = getPracticeStats('listening')
  const fillBlank = getPracticeStats('fill_blank')

  // Quiz stats from existing quiz results
  const quizSessions = quizResults.length
  const quizAccuracy = quizSessions > 0
    ? Math.round(quizResults.reduce((s, r) => s + r.percentage, 0) / quizSessions)
    : 0
  const quizLastDate = quizResults[0]?.created_at ?? null

  const MODES = [
    {
      icon: GraduationCap, label: 'Test', view: 'quiz' as LexView,
      sessions: quizSessions, accuracy: quizAccuracy,
      words: quizResults.reduce((s, r) => s + r.total_questions, 0),
      lastDate: quizLastDate,
      color: 'text-amber-400',
    },
    {
      icon: Headphones, label: 'Dictado', view: 'listening' as LexView,
      sessions: listening.sessions, accuracy: listening.accuracy,
      words: listening.totalWords, lastDate: listening.lastDate,
      color: 'text-emerald-400',
    },
    {
      icon: FileText, label: 'Rellena huecos', view: 'fill-blank' as LexView,
      sessions: fillBlank.sessions, accuracy: fillBlank.accuracy,
      words: fillBlank.totalWords, lastDate: fillBlank.lastDate,
      color: 'text-blue-400',
    },
    {
      icon: PenLine, label: 'Escribir', view: 'write' as LexView,
      sessions: null, accuracy: null, words: null, lastDate: null,
      color: 'text-violet-400',
    },
  ]

  const RESOURCES = [
    { icon: MessageSquare, label: 'Expresiones profesionales', count: 30, view: 'phrases' as LexView, desc: '30 frases B1–C1' },
    { icon: Mail, label: 'Emails profesionales', count: 5, view: 'emails' as LexView, desc: '5 plantillas B1–C1' },
  ]

  return (
    <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5 space-y-4">
      <h2 className="text-white font-medium text-sm flex items-center gap-2">
        <BarChart2 size={15} className="text-slate-400" />
        Práctica por módulos
      </h2>

      {/* Practice modes table */}
      <div className="space-y-2.5">
        {MODES.map(m => {
          const Icon = m.icon
          const hasData = m.sessions !== null && m.sessions > 0
          return (
            <button key={m.label} onClick={() => onNavigate(m.view)}
              className="w-full flex items-center gap-3 group hover:bg-slate-700/10 rounded-xl px-2 py-1.5 transition-colors -mx-2">
              <Icon size={15} className={`flex-shrink-0 ${m.color}`} />
              <span className="text-slate-300 text-sm w-28 text-left truncate group-hover:text-white transition-colors">
                {m.label}
              </span>
              {hasData ? (
                <>
                  <AccuracyBar pct={m.accuracy!} />
                  <div className="flex flex-col items-end flex-shrink-0 w-24">
                    <span className="text-slate-400 text-xs">{m.sessions} {m.sessions === 1 ? 'sesión' : 'sesiones'}</span>
                    <span className="text-slate-600 text-[10px]">{relativeDate(m.lastDate)}</span>
                  </div>
                </>
              ) : m.sessions === 0 ? (
                <span className="text-slate-600 text-xs ml-auto">Sin sesiones aún</span>
              ) : (
                <span className="text-slate-600 text-xs ml-auto">Sin seguimiento</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Browse resources */}
      <div className="border-t border-slate-700/30 pt-3">
        <div className="text-slate-600 text-[10px] uppercase tracking-wider mb-2">Recursos de estudio</div>
        <div className="grid grid-cols-2 gap-2">
          {RESOURCES.map(r => {
            const Icon = r.icon
            return (
              <button key={r.label} onClick={() => onNavigate(r.view)}
                className="flex items-center gap-2 bg-slate-700/20 hover:bg-slate-700/35 rounded-xl
                           px-3 py-2.5 text-left transition-colors group">
                <Icon size={14} className="text-emerald-400/70 flex-shrink-0" />
                <div>
                  <div className="text-slate-300 text-xs group-hover:text-white transition-colors truncate">
                    {r.label}
                  </div>
                  <div className="text-slate-600 text-[10px]">{r.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActivityHeatmap({ log, streak }: { log: Record<string, number>; streak: number }) {
  const WEEKS = 16
  const today = new Date()
  const days: { date: string; count: number }[] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({ date: key, count: log[key] ?? 0 })
  }

  // Pad start so first week begins on Monday
  const firstDay = new Date(days[0].date)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0
  const padded = [...Array(startOffset).fill(null), ...days]
  const weeks: (typeof days[0] | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const DAY_LABELS = ['L','M','X','J','V','S','D']

  function cellColor(count: number) {
    if (count === 0) return 'bg-slate-700/40'
    if (count === 1) return 'bg-emerald-800/80'
    if (count < 4) return 'bg-emerald-600/80'
    return 'bg-emerald-400'
  }

  return (
    <div className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          <h2 className="text-white font-medium text-sm">Actividad de estudio</h2>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
            <Zap size={12} className="text-amber-400" />
            <span className="text-amber-400 text-xs font-semibold">{streak} {streak === 1 ? 'día' : 'días'} seguidos</span>
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="w-3 h-3 flex items-center justify-center text-[9px] text-slate-600 leading-none">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks grid */}
        {weeks.map((week, wi) => {
          // Month label: show if first day of month appears in this week
          const monthLabel = week.find(d => d && d.date.endsWith('-01'))
          const month = monthLabel
            ? MONTH_LABELS[parseInt(monthLabel.date.split('-')[1]) - 1]
            : null

          return (
            <div key={wi} className="relative">
              {month && (
                <div className="absolute -top-4 left-0 text-[9px] text-slate-600 whitespace-nowrap">
                  {month}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div key={di}
                    title={day ? `${day.date}: ${day.count} ${day.count === 1 ? 'sesión' : 'sesiones'}` : ''}
                    className={`w-3 h-3 rounded-sm transition-colors ${day ? cellColor(day.count) : 'bg-transparent'}`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-slate-600 text-[10px]">Menos</span>
        {['bg-slate-700/40','bg-emerald-800/80','bg-emerald-600/80','bg-emerald-400'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-slate-600 text-[10px]">Más</span>
      </div>
    </div>
  )
}
