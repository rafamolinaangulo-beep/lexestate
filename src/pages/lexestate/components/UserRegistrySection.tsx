import { useState, useEffect } from 'react'
import { Users, RefreshCw, Clock, BookOpen, Zap, BookType, Wifi, WifiOff } from 'lucide-react'
import type { LexAdminUserStat, LexUser } from '../types'
import { fetchAdminUsersStats, fetchMyStats } from '../api'

interface Props { user: LexUser | null; isSuperAdmin: boolean }

function formatMinutes(min: number): string {
  if (min < 1) return 'Menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 2) return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `Hace ${d} día${d !== 1 ? 's' : ''}`
  const w = Math.floor(d / 7)
  if (w < 5) return `Hace ${w} semana${w !== 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
}

function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    return displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500',
]

function avatarColor(email: string): string {
  let hash = 0
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function lastSeenLabel(stat: LexAdminUserStat): { label: string; recent: boolean } {
  const t = stat.last_seen || stat.last_login
  if (!t) return { label: 'Sin actividad', recent: false }
  const diffH = (Date.now() - new Date(t).getTime()) / 3_600_000
  return { label: formatRelative(t), recent: diffH < 24 }
}

function StatBar({ label, mastered, learning, difficult = 0, total }: {
  label: string; mastered: number; learning: number; difficult?: number; total: number
}) {
  if (mastered + learning + difficult === 0) return null
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-[11px]">{label}</span>
        <span className="text-slate-400 text-[11px]">
          <span className="text-emerald-400 font-semibold">{mastered}</span>
          {learning > 0 && <span className="text-sky-400"> · {learning} apr.</span>}
          {difficult > 0 && <span className="text-red-400"> · {difficult} dif.</span>}
          <span className="text-slate-600"> /{total}</span>
        </span>
      </div>
      <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden flex gap-px">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        {learning > 0 && total > 0 && (
          <div className="h-full bg-sky-500/60 rounded-full" style={{ width: `${Math.round((learning / total) * 100)}%` }} />
        )}
        {difficult > 0 && total > 0 && (
          <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${Math.round((difficult / total) * 100)}%` }} />
        )}
      </div>
    </div>
  )
}

export default function UserRegistrySection({ user, isSuperAdmin }: Props) {
  const [stats, setStats] = useState<LexAdminUserStat[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function load() {
    setLoading(true)
    try {
      if (isSuperAdmin) {
        const data = await fetchAdminUsersStats()
        setStats(data)
      } else {
        const data = await fetchMyStats()
        setStats([data])
      }
      setLastRefresh(new Date())
    } catch {
      setStats([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [isSuperAdmin])

  const totalTerms = 100  // approximate totals for progress bars
  const totalVerbs = 80
  const totalPhraSal = 152

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users size={20} className="text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">
            {isSuperAdmin ? 'Registro de usuarios' : 'Mi progreso'}
          </h1>
          <p className="text-slate-500 text-xs">
            {isSuperAdmin ? 'Progreso y tiempo de uso de todos los usuarios' : 'Tu progreso y tiempo de uso en LexEstate'}
            {lastRefresh && (
              <span className="ml-2 text-slate-600">
                · Actualizado {formatRelative(lastRefresh.toISOString())}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl
                     bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20
                     transition-all disabled:opacity-40">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Stats summary — only for superadmin (all-users view) */}
      {!loading && isSuperAdmin && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Usuarios activos', value: stats.length },
            { label: 'Total tiempo', value: formatMinutes(stats.reduce((s, u) => s + u.total_minutes, 0)) },
            { label: 'Términos dominados', value: stats.reduce((s, u) => s + u.terms_mastered, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0f2040] border border-slate-700/30 rounded-xl px-4 py-3 text-center">
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty */}
      {!loading && stats.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          No hay datos de usuarios todavía.
        </div>
      )}

      {/* User cards */}
      {!loading && stats.length > 0 && (
        <div className="space-y-3">
          {stats.map(stat => {
            const { label: seenLabel, recent } = lastSeenLabel(stat)
            const initials = getInitials(stat.display_name, stat.user_id)
            const color = avatarColor(stat.user_id)

            return (
              <div key={stat.user_id}
                className="bg-[#0f2040] border border-slate-700/30 rounded-2xl p-5 space-y-4">
                {/* User header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                  text-white font-bold text-sm flex-shrink-0 ${color}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        {stat.display_name || stat.user_id}
                      </span>
                      {recent ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <Wifi size={9} /> Activo hoy
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded-full">
                          <WifiOff size={9} /> Inactivo
                        </span>
                      )}
                    </div>
                    {stat.display_name && (
                      <p className="text-slate-500 text-xs truncate">{stat.user_id}</p>
                    )}
                  </div>
                  {/* Time + last seen */}
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <div className="flex items-center gap-1 text-slate-300 text-sm font-semibold justify-end">
                      <Clock size={12} className="text-slate-500" />
                      {formatMinutes(stat.total_minutes)}
                    </div>
                    <div className="text-slate-600 text-[11px]">{seenLabel}</div>
                    {stat.last_login && (
                      <div className="text-slate-700 text-[10px]">
                        Login: {formatRelative(stat.last_login)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress section */}
                {(stat.terms_mastered + stat.terms_learning + stat.terms_difficult +
                  stat.verbs_mastered + stat.verbs_learning +
                  stat.phrasal_mastered + stat.phrasal_learning) > 0 ? (
                  <div className="space-y-2 border-t border-slate-700/30 pt-3">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen size={11} className="text-slate-600 flex-shrink-0" />
                        <div className="flex-1">
                          <StatBar
                            label="Vocabulario"
                            mastered={stat.terms_mastered}
                            learning={stat.terms_learning}
                            difficult={stat.terms_difficult}
                            total={totalTerms}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookType size={11} className="text-slate-600 flex-shrink-0" />
                        <div className="flex-1">
                          <StatBar
                            label="Verbos"
                            mastered={stat.verbs_mastered}
                            learning={stat.verbs_learning}
                            total={totalVerbs}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap size={11} className="text-slate-600 flex-shrink-0" />
                        <div className="flex-1">
                          <StatBar
                            label="Phrasal Verbs"
                            mastered={stat.phrasal_mastered}
                            learning={stat.phrasal_learning}
                            total={totalPhraSal}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-700/30 pt-3">
                    <p className="text-slate-600 text-xs">Sin actividad de aprendizaje aún.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
