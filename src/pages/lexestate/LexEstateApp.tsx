import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, BookOpen, Layers, PenLine, GraduationCap, RotateCcw,
  TrendingUp, Heart, Shield, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import lexEstateLogo from '@/assets/lexestate-icon.png'
import type { LexUser, LexView, LexTerm, LexCategory } from './types'
import { checkLexAuth } from './api'
import { fetchCategories, fetchTerms } from './api'
import LexEstateHome from './components/LexEstateHome'
import VocabularySection from './components/VocabularySection'
import TermDetail from './components/TermDetail'
import FlashcardsSection from './components/FlashcardsSection'
import WritePracticeSection from './components/WritePracticeSection'
import QuizSection from './components/QuizSection'
import ReviewMistakesSection from './components/ReviewMistakesSection'
import ProgressSection from './components/ProgressSection'
import FavoritesSection from './components/FavoritesSection'
import AdminSection from './components/AdminSection'

interface NavItem {
  id: LexView
  label: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',       label: 'Inicio',     icon: Home },
  { id: 'vocabulary', label: 'Vocabulario', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'write',      label: 'Escribir',   icon: PenLine },
  { id: 'quiz',       label: 'Test',       icon: GraduationCap },
  { id: 'review',     label: 'Repaso',     icon: RotateCcw },
  { id: 'progress',   label: 'Progreso',   icon: TrendingUp },
  { id: 'favorites',  label: 'Favoritos',  icon: Heart },
]

export default function LexEstateApp() {
  const navigate = useNavigate()
  const [user, setUser] = useState<LexUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#060d1a'
    return () => { document.body.style.background = prev }
  }, [])

  const [view, setView] = useState<LexView>('home')
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [reviewTermIds, setReviewTermIds] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [categories, setCategories] = useState<LexCategory[]>([])
  const [terms, setTerms] = useState<LexTerm[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    checkLexAuth()
      .then(d => setUser({ email: d.email, role: d.role, display_name: d.display_name }))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [cats, trms] = await Promise.all([fetchCategories(), fetchTerms()])
      setCategories(cats)
      setTerms(trms)
    } catch (e) {
      console.error(e)
    } finally {
      setDataLoaded(true)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleLogout() {
    await fetch('/api.php?path=%2Fapi%2Fauth%2Flogout', { method: 'POST', credentials: 'include' }).catch(() => {})
    navigate('/lexestate/login', { replace: true })
  }

  function navigate2(v: LexView, termId?: string) {
    setView(v)
    if (termId) setSelectedTermId(termId)
    setSidebarOpen(false)
  }

  function startReview(termIds: string[]) {
    setReviewTermIds(termIds)
    setView('review')
    setSidebarOpen(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060d1a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? [...NAV_ITEMS, { id: 'admin' as LexView, label: 'Admin', icon: Shield }] : NAV_ITEMS

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-56'}`}>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-emerald-500/10">
        <div className="flex items-center gap-3">
          <img src={lexEstateLogo} alt="LexEstate"
               className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-md" />
          <div>
            <div className="text-white font-bold text-sm leading-tight">LexEstate</div>
            <div className="text-emerald-400/70 text-[10px]">Real Estate English</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => navigate2(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
                ${active
                  ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <Icon size={17} className={active ? 'text-emerald-400' : ''} />
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto text-emerald-500" />}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-emerald-500/10 space-y-1">
        <div className="px-3 py-2">
          <div className="text-white text-xs font-medium truncate">{user?.display_name ?? user?.email ?? 'Invitado'}</div>
          <div className="text-slate-500 text-[11px]">{user ? 'Conectado' : 'Sin sesión'}</div>
        </div>
        {user && (
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm
                       text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all">
            <LogOut size={15} />
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  )

  const currentSection = () => {
    const shared = { user, categories, terms, dataLoaded, onRefreshData: loadData }
    switch (view) {
      case 'home':       return <LexEstateHome {...shared} onNavigate={navigate2} onReview={startReview} />
      case 'vocabulary': return <VocabularySection {...shared} onSelectTerm={id => navigate2('term-detail', id)} />
      case 'term-detail': return selectedTermId
        ? <TermDetail termId={selectedTermId} user={user} terms={terms} categories={categories}
                      onBack={() => setView('vocabulary')} onNavigate={navigate2} />
        : <VocabularySection {...shared} onSelectTerm={id => navigate2('term-detail', id)} />
      case 'flashcards': return <FlashcardsSection {...shared} />
      case 'write':      return <WritePracticeSection {...shared} />
      case 'quiz':       return <QuizSection {...shared} onReview={startReview} />
      case 'review':     return <ReviewMistakesSection {...shared} termIds={reviewTermIds} />
      case 'progress':   return <ProgressSection {...shared} onNavigate={navigate2} />
      case 'favorites':  return <FavoritesSection {...shared} onSelectTerm={id => navigate2('term-detail', id)} />
      case 'admin':      return isAdmin ? <AdminSection {...shared} /> : null
      default:           return null
    }
  }

  return (
    <div className="min-h-screen bg-[#060d1a] flex text-slate-200">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-[#0a1628] border-r border-emerald-500/10 h-screen sticky top-0">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 h-full bg-[#0a1628] border-r border-emerald-500/10 flex flex-col">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3
                           bg-[#0a1628] border-b border-emerald-500/10 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src={lexEstateLogo} alt="LexEstate"
                 className="w-7 h-7 rounded-lg object-cover shadow-sm" />
            <span className="text-white font-semibold text-sm">LexEstate</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white p-1">
            {sidebarOpen ? <X size={20} /> : null}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          {currentSection()}
        </main>
      </div>
    </div>
  )
}
