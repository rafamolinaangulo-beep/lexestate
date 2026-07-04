import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import lexEstateLogo from '@/assets/lexestate-icon.png'
import { authLoginPath, checkLexAuth } from './api'

export default function LexEstateLogin() {
  const navigate = useNavigate()

  useEffect(() => {
    function applyIcon() {
      document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]').forEach(l => { l.href = lexEstateLogo })
    }
    const prevTitle = document.title
    applyIcon()
    document.title = 'LexEstate'
    const t = setTimeout(applyIcon, 0)

    // PWA manifest swap
    const manifestEl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    const prevManifest = manifestEl?.href ?? ''
    if (manifestEl) manifestEl.href = '/lexestate-manifest.json'
    const themeEl = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const prevTheme = themeEl?.content ?? ''
    if (themeEl) themeEl.content = '#10b981'
    const appTitleEl = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
    const prevAppTitle = appTitleEl?.content ?? ''
    if (appTitleEl) appTitleEl.content = 'LexEstate'
    const touchIconEl = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    const prevTouchIcon = touchIconEl?.href ?? ''
    if (touchIconEl) touchIconEl.href = '/icons/lexestate-192.png'

    return () => {
      clearTimeout(t)
      document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]').forEach(l => { l.href = '/favicon.png' })
      document.title = prevTitle
      if (manifestEl) manifestEl.href = prevManifest
      if (themeEl) themeEl.content = prevTheme
      if (appTitleEl) appTitleEl.content = prevAppTitle
      if (touchIconEl) touchIconEl.href = prevTouchIcon
    }
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(authLoginPath(), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Error de acceso')
      }
      // Verify lexestate access
      await checkLexAuth()
      navigate('/lexestate/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1a]"
         style={{ backgroundImage: 'radial-gradient(ellipse at 60% 20%, #0a2240 0%, transparent 60%)' }}>
      <div className="w-full max-w-sm px-4">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors text-sm mb-8"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={lexEstateLogo} alt="LexEstate"
               className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-emerald-500/20 mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-tight">LexEstate</h1>
          <p className="text-slate-400 text-sm mt-1">Real Estate English</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1e38] border border-emerald-500/20 rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-2.5
                           text-white placeholder-slate-600 text-sm
                           focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-[#0a1628] border border-slate-700 rounded-xl px-4 py-2.5
                             text-white placeholder-slate-600 text-sm pr-10
                             focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30
                             transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3
                              text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
                         text-white font-semibold py-2.5 rounded-xl transition-colors
                         shadow-lg shadow-emerald-500/20">
              {loading ? 'Accediendo...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Acceso exclusivo. Si necesitas credenciales,{' '}
            <a href="/#contacto" className="text-emerald-400 underline hover:text-emerald-300 transition-colors">
              contacta conmigo
            </a>.
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © LexEstate · Real Estate English Platform
        </p>
      </div>
    </div>
  )
}
