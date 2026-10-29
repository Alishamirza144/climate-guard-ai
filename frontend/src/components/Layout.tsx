import { useEffect, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Droplets,
  Thermometer,
  Flame,
  Sprout,
  GitBranch,
  LayoutDashboard,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useTheme } from '../lib/theme'
import { ButtonLink } from './ui/Button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const MODULE_LINKS = [
  {
    to: '/flood',
    title: 'FloodGuard AI',
    desc: 'Flash flood forecasting & drainage blockage tracking',
    icon: Droplets,
    color: 'text-brand-teal',
    bg: 'bg-brand-teal/10',
    border: 'border-brand-teal/20',
  },
  {
    to: '/heat',
    title: 'HeatGuard AI',
    desc: 'Urban heat islands & extreme temperature alerts',
    icon: Thermometer,
    color: 'text-brand-orange',
    bg: 'bg-brand-orange/10',
    border: 'border-brand-orange/20',
  },
  {
    to: '/fire',
    title: 'FireGuard AI',
    desc: 'Thermal anomalies & wildfire propagation models',
    icon: Flame,
    color: 'text-brand-red',
    bg: 'bg-brand-red/10',
    border: 'border-brand-red/20',
  },
  {
    to: '/crop',
    title: 'CropShield AI',
    desc: 'Microclimate crop stress & disease vulnerability',
    icon: Sprout,
    color: 'text-lime',
    bg: 'bg-lime/10',
    border: 'border-lime/20',
  },
  {
    to: '/drainage',
    title: 'Drainage Network',
    desc: 'Municipal stormwater conduit telemetry',
    icon: GitBranch,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
]

const NAV_LINKS = [
  { to: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
  { to: '/simulation', label: 'Simulations' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/data-sources', label: 'Data Sources' },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/about', label: 'About Team' },
]

export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null)
  const location = useLocation()

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      setInstallPrompt({ prompt: () => promptEvent.prompt() })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('climateguard-lang', lang)
  }

  return (
    <div className="min-h-screen flex flex-col bg-navy text-white selection:bg-lime/30 selection:text-lime">
      {/* ── Sticky Glass Navbar ── */}
      <header
        className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 transition-colors"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <Link
            to="/"
            className="flex items-center gap-3 no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded-lg p-1"
          >
            {/* Hexagon icon emblem */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <div
                className="absolute inset-0 bg-primary group-hover:bg-primary-light transition-colors clip-hexagon shadow-glow-primary"
                aria-hidden="true"
              />
              <svg
                viewBox="0 0 24 24"
                className="relative z-10 w-5 h-5 text-lime fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base tracking-wider text-white flex items-center gap-1 leading-none">
                CLIMATEGUARD<span className="text-lime">.AI</span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.25em] text-lime mt-0.5 uppercase">
                PREDICT. PREPARE. PROTECT.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center gap-1.5"
            aria-label="Primary Navigation"
          >
            {/* Module Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setModuleDropdownOpen(true)}
              onMouseLeave={() => setModuleDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  moduleDropdownOpen || location.pathname.match(/\/(flood|heat|fire|crop|drainage)/)
                    ? 'text-lime bg-white/10'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
                aria-expanded={moduleDropdownOpen}
                aria-haspopup="true"
                id="modules-menu-button"
              >
                <Layers className="w-3.5 h-3.5 text-lime" aria-hidden="true" />
                <span>Modules</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    moduleDropdownOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {moduleDropdownOpen && (
                  <div
                    className="absolute left-0 top-full pt-2 w-80 z-50 pointer-events-auto motion-safe:animate-fade-in"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="modules-menu-button"
                  >
                    <div className="rounded-2xl border border-white/15 bg-navy-card/95 backdrop-blur-xl p-3 shadow-2xl space-y-1">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Multi-Risk Prediction Engines
                      </div>
                      {MODULE_LINKS.map((mod) => {
                        const Icon = mod.icon
                        return (
                          <Link
                            key={mod.to}
                            to={mod.to}
                            role="menuitem"
                            onClick={() => setModuleDropdownOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group text-left"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg ${mod.bg} ${mod.border} border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}
                            >
                              <Icon className={`w-4 h-4 ${mod.color}`} aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white group-hover:text-lime transition-colors">
                                {mod.title}
                              </div>
                              <div className="text-[11px] text-white/50 truncate">
                                {mod.desc}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
              )}
            </div>

            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? 'text-lime bg-white/10 font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{t(`nav.${to === '/dashboard' ? 'dashboard' : to === '/simulation' ? 'simulations' : to === '/methodology' ? 'methodology' : to === '/data-sources' ? 'sources' : to === '/alerts' ? 'alerts' : 'about'}`)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
              <span className="sr-only">{t('app.language')}</span>
              <select
                value={i18n.language}
                onChange={(event) => setLanguage(event.target.value)}
                className="bg-transparent text-xs text-white outline-none"
                aria-label={t('app.language')}
              >
                <option value="en" className="text-slate-900">EN</option>
                <option value="hi" className="text-slate-900">हिं</option>
                <option value="mr" className="text-slate-900">मर</option>
              </select>
            </label>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-brand-orange" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-brand-teal" aria-hidden="true" />
              )}
            </button>

            {installPrompt && (
              <button
                type="button"
                onClick={() => void installPrompt.prompt()}
                className="hidden rounded-xl border border-lime/40 bg-lime/10 px-3 py-2 text-xs font-semibold text-lime sm:inline-flex"
              >
                {t('app.install')}
              </button>
            )}

            {/* Launch Dashboard Button */}
            <ButtonLink
              to="/dashboard"
              variant="lime"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Open Dashboard
            </ButtonLink>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation drawer"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Sliding Drawer ── */}
      {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm -z-10 motion-safe:animate-fade-in"
            />

            {/* Drawer */}
            <div
              className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-navy-dark border-l border-white/15 p-6 flex flex-col justify-between overflow-y-auto motion-safe:animate-slide-in-right"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="font-display font-extrabold text-base text-white">
                    CLIMATEGUARD<span className="text-lime">.AI</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modules list */}
                <div className="mb-6">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-lime/80 mb-2">
                    Core Risk Modules
                  </div>
                  <div className="space-y-1">
                    {MODULE_LINKS.map((mod) => {
                      const Icon = mod.icon
                      return (
                        <Link
                          key={mod.to}
                          to={mod.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-xl text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Icon className={`w-4 h-4 ${mod.color}`} aria-hidden="true" />
                          <span>{mod.title}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Pages list */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                    Platform Navigation
                  </div>
                  <div className="space-y-1">
                    {NAV_LINKS.map(({ to, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3">
                <ButtonLink
                  to="/dashboard"
                  variant="lime"
                  size="md"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  Open Live Dashboard
                </ButtonLink>
                <div className="text-center text-[10px] text-white/40">
                  Team Spartans · KKWIEER Nashik
                </div>
              </div>
            </div>
          </div>
      )}

      {/* ── Main Content Outlet ── */}
      <main className="flex-1 flex flex-col" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      {/* ── Institutional Footer ── */}
      <footer
        className="border-t border-white/10 bg-navy-dark/90 text-white/70 py-12 px-4 sm:px-6 lg:px-8 mt-auto"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand & Tagline */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center clip-hexagon">
                  <span className="text-lime text-xs font-bold">CG</span>
                </div>
                <span className="font-display font-extrabold text-base tracking-wider text-white">
                  CLIMATEGUARD<span className="text-lime">.AI</span>
                </span>
              </div>
              <p className="text-xs text-lime/90 font-bold tracking-[0.2em]">
                PREDICT. PREPARE. PROTECT.
              </p>
              <p className="text-xs text-white/75 leading-relaxed">
                AI-Powered Multi-Hazard Climate Risk Prediction &amp; Early Warning System for India.
              </p>
              <div className="text-xs text-white/60">
                Crafted by <strong className="text-white/90">Team Spartans</strong><br />
                K K Wagh Institute of Engineering Education &amp; Research, Nashik
              </div>
            </div>

            {/* Col 2: Risk Modules */}
            <div className="space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                Prediction Engines
              </h3>
              <ul className="space-y-1 text-xs text-white/80">
                <li><Link to="/flood" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">FloodGuard AI</Link></li>
                <li><Link to="/heat" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">HeatGuard AI</Link></li>
                <li><Link to="/fire" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">FireGuard AI</Link></li>
                <li><Link to="/crop" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">CropShield AI</Link></li>
                <li><Link to="/drainage" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Drainage Telemetry</Link></li>
              </ul>
            </div>

            {/* Col 3: Intelligence Platform */}
            <div className="space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                Intelligence Platform
              </h3>
              <ul className="space-y-1 text-xs text-white/80">
                <li><Link to="/dashboard" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Live Dashboard</Link></li>
                <li><Link to="/simulation" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Risk Simulator</Link></li>
                <li><Link to="/methodology" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Math &amp; Science Methodology</Link></li>
                <li><Link to="/alerts" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Early Warning Broadcasts</Link></li>
                <li><Link to="/data-sources" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Data Source Registry</Link></li>
                <li><Link to="/roadmap" className="hover:text-lime transition-colors inline-block py-1.5 px-0.5">Product Roadmap</Link></li>
              </ul>
            </div>

            {/* Col 4: Data Sources & Integrity */}
            <div className="space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                Open Data Sources
              </h3>
              <p className="text-xs text-white/75 leading-relaxed">
                Powered strictly by verified open APIs: Open-Meteo, NASA POWER, NASA FIRMS, NASA GIBS, and OpenStreetMap Overpass.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/40 text-lime border border-lime/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                  Open-Data Platform
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Regulatory & Decision Support Disclaimer */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <p className="text-xs text-brand-orange/90 font-medium">
              ⚠️ <strong>Decision-support tool.</strong> Not a replacement for official IMD / CWC / NDMA warnings.
            </p>
            <p className="text-[11px] text-white/40">
              © {new Date().getFullYear()} Team Spartans · All rights reserved · Academic &amp; Research Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
