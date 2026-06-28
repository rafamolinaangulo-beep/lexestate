import { useEffect, useState } from 'react'
import { BookOpen, Layers, PenLine, GraduationCap, TrendingUp, Heart, RotateCcw, Zap } from 'lucide-react'
import type { LexUser, LexView, LexTerm, LexCategory, LexStats } from '../types'
import { fetchStats } from '../api'
import { computeLocalStats } from '../localStorage'

interface Props {
  user: LexUser | null
  terms: LexTerm[]
  categories: LexCategory[]
  dataLoaded: boolean
  onNavigate: (v: LexView) => void
  onReview: (termIds: string[]) => void
  onRefreshData: () => void
}

const CARDS = [
  { view: 'vocabulary' as LexView, label: 'Vocabulario',  desc: 'Explora todos los términos', icon: BookOpen,      color: 'from-emerald-500 to-teal-600' },
  { view: 'flashcards' as LexView, label: 'Flashcards',   desc: 'Estudio con tarjetas',       icon: Layers,        color: 'from-blue-500 to-indigo-600' },
  { view: 'write'      as LexView, label: 'Escribir',     desc: 'Escribe la respuesta',       icon: PenLine,       color: 'from-violet-500 to-purple-600' },
  { view: 'quiz'       as LexView, label: 'Test',         desc: 'Examen de opciones',         icon: GraduationCap, color: 'from-amber-500 to-orange-600' },
  { view: 'progress'  as LexView, label: 'Progreso',     desc: 'Tu evolución',               icon: TrendingUp,    color: 'from-rose-500 to-red-600' },
  { view: 'favorites' as LexView, label: 'Favoritos',    desc: 'Palabras guardadas',         icon: Heart,         color: 'from-pink-500 to-rose-600' },
]

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#0f2040] rounded-xl p-4 border border-slate-700/30">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-0.5">{label}</div>
    </div>
  )
}

export default function LexEstateHome({ user, terms, dataLoaded, onNavigate }: Props) {
  const [stats, setStats] = useState<LexStats | null>(null)

  useEffect(() => {
    if (!dataLoaded) return
    if (user) {
      fetchStats().then(setStats).catch(() => {
        setStats(computeLocalStats(terms.length))
      })
    } else {
      setStats(computeLocalStats(terms.length))
    }
  }, [user, dataLoaded, terms.length])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}{user?.display_name ? `, ${user.display_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {stats?.due_today ? `${stats.due_today} términos para repasar hoy` : 'Practica vocabulario inmobiliario en inglés'}
          </p>
        </div>
        {stats?.streak && stats.streak > 1 ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20
                          rounded-xl px-3 py-1.5">
            <Zap size={14} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-semibold">{stats.streak} días</span>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBadge label="Total" value={stats.total} color="text-white" />
          <StatBadge label="Aprendiendo" value={stats.learning} color="text-blue-400" />
          <StatBadge label="Difíciles" value={stats.difficult} color="text-amber-400" />
          <StatBadge label="Dominadas" value={stats.mastered} color="text-emerald-400" />
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.total > 0 && (
        <div className="bg-[#0f2040] rounded-xl p-4 border border-slate-700/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300 font-medium">Progreso global</span>
            <span className="text-emerald-400 font-bold">
              {Math.round((stats.mastered / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${Math.round((stats.mastered / stats.total) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span>{stats.mastered} / {stats.total} dominadas</span>
          </div>
        </div>
      )}

      {/* Quick access grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CARDS.map(card => {
            const Icon = card.icon
            return (
              <button
                key={card.view}
                onClick={() => onNavigate(card.view)}
                className="group bg-[#0f2040] hover:bg-[#132952] border border-slate-700/30
                           hover:border-emerald-500/30 rounded-2xl p-5 text-left transition-all
                           hover:shadow-lg hover:shadow-emerald-500/5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color}
                                 flex items-center justify-center mb-3 shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="text-white font-semibold text-sm group-hover:text-emerald-300 transition-colors">
                  {card.label}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">{card.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick tip */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <RotateCcw size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-emerald-300 text-sm font-medium">Consejo del día</div>
            <div className="text-slate-400 text-xs mt-0.5">
              La repetición espaciada es la técnica más efectiva. Estudia los términos difíciles
              cada día y los que dominas cada dos semanas.
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
          <div className="text-blue-300 text-sm font-medium mb-1">Modo sin sesión</div>
          <div className="text-slate-400 text-xs">
            Tu progreso se guarda localmente. Inicia sesión para sincronizar con la nube.
          </div>
        </div>
      )}
    </div>
  )
}
