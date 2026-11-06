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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FlaskConical,
  CheckCircle2,
  Database,
  BookOpen,
  Users,
  Shield,
  Activity,
} from 'lucide-react'
import DataLatencyIndicator from './DataLatencyIndicator'
import CitySelector from './CitySelector'
import LanguageSelector from './LanguageSelector'
import { isRTL } from '../i18n/languages'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const AI_MODULES = [
  {
    to: '/flood',
    label: 'Flood Guard AI',
    icon: Droplets,
    statusText: 'Hydrology Online',
    statusDot: 'bg-[#35C58B]',
    accentColor: '#2389D7',
  },
  {
    to: '/heat',
    label: 'Heat Guard AI',
    icon: Thermometer,
    statusText: 'Thermal Watch',
    statusDot: 'bg-[#F4BC4D]',
    accentColor: '#F4BC4D',
  },
  {
    to: '/fire',
    label: 'Fire Guard AI',
    icon: Flame,
    statusText: 'FWI Active',
    statusDot: 'bg-[#F06470]',
    accentColor: '#F06470',
  },
  {
    to: '/crop',
    label: 'Crop Shield AI',
    icon: Sprout,
    statusText: 'Agri-Vigor',
    statusDot: 'bg-[#35C58B]',
    accentColor: '#35C58B',
  },
  {
    to: '/drainage',
    label: 'Drainage Network AI',
    icon: GitBranch,
    statusText: 'IoT Monitored',
    statusDot: 'bg-[#25C5DC]',
    accentColor: '#25C5DC',
  },
  {
    to: '/simulation',
    label: 'Scenario Validation Lab',
    icon: FlaskConical,
    statusText: 'Simulation Ready',
    statusDot: 'bg-[#8ED8F5]',
    accentColor: '#8ED8F5',
  },
] as const

const SECONDARY_NAV = [
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/data-sources', label: 'Data Sources', icon: Database },
  { to: '/methodology', label: 'Methodology', icon: BookOpen },
  { to: '/about', label: 'About Team', icon: Users },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
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

  const getModuleMeta = (to: string, defaultLabel: string, defaultStatus: string) => {
    switch (to) {
      case '/flood':
        return { label: t('nav.flood', defaultLabel), status: t('dashboard.badgeFlood', defaultStatus) }
      case '/heat':
        return { label: t('nav.heat', defaultLabel), status: t('dashboard.badgeHeat', defaultStatus) }
      case '/fire':
        return { label: t('nav.fire', defaultLabel), status: t('dashboard.badgeFire', defaultStatus) }
      case '/crop':
        return { label: t('nav.crop', defaultLabel), status: t('dashboard.badgeCrop', defaultStatus) }
      case '/drainage':
        return { label: t('nav.drainage', defaultLabel), status: t('dashboard.badgeDrainage', defaultStatus) }
      case '/simulation':
        return { label: t('nav.simulation', defaultLabel), status: t('dashboard.badgeSimulation', defaultStatus) }
      default:
        return { label: defaultLabel, status: defaultStatus }
    }
  }

  const getSecondaryLabel = (to: string, defaultLabel: string) => {
    switch (to) {
      case '/alerts': return t('nav.alerts', defaultLabel)
      case '/data-sources': return t('nav.sources', defaultLabel)
      case '/methodology': return t('nav.methodology', defaultLabel)
      case '/about': return t('nav.about', defaultLabel)
      default: return defaultLabel
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#071A33] text-[#F3F8FF] selection:bg-[#2389D7]/30 selection:text-[#8ED8F5]">
      {/* ── Top Header Navigation Bar ── */}
      <header
        className="sticky top-0 z-40 w-full bg-[#102F50]/95 backdrop-blur-md border-b border-[#285274] shadow-md transition-colors"
        role="banner"
      >
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo & Collapse Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand module sidebar' : 'Collapse module sidebar'}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-[#B6C9DC] hover:text-[#F3F8FF] hover:bg-[#12385C] border border-[#285274] transition-colors"
              title={sidebarCollapsed ? 'Expand module panel' : 'Collapse module panel'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4 text-[#25C5DC]" /> : <ChevronLeft className="w-4 h-4 text-[#25C5DC]" />}
            </button>

            <Link
              to="/"
              className="flex items-center gap-2.5 no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2389D7] rounded-xl p-1 shrink-0"
            >
              {/* Defense-Grade Hex Emblem */}
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <div
                  className="absolute inset-0 bg-[#2389D7] group-hover:bg-[#25C5DC] transition-colors clip-hexagon shadow-glow"
                  aria-hidden="true"
                />
                <Shield className="relative z-10 w-5 h-5 text-white" />
              </div>

              <div className="flex flex-col">
                <span className="font-display font-black text-sm sm:text-base tracking-wider text-[#F3F8FF] flex items-center gap-0.5 leading-none">
                  CLIMATEGUARD<span className="text-[#25C5DC]">.AI</span>
                </span>
                <span className="text-[9px] font-bold tracking-[0.2em] text-[#8ED8F5] mt-0.5 uppercase">
                  {t('app.nationalIntelligence', 'NATIONAL CLIMATE INTELLIGENCE')}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: City Selector Bar */}
          <div className="hidden md:flex max-w-xs lg:max-w-md w-full">
            <CitySelector />
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* Direct Dashboard Link */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#2389D7] text-white shadow-glow'
                    : 'text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF] border border-[#285274]'
                }`
              }
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#25C5DC]" />
              <span>{t('nav.mainDashboard', 'Main Dashboard')}</span>
            </NavLink>

            {/* "More" Intelligence Dropdown */}
            <div
              className="relative hidden sm:block"
              onMouseEnter={() => setMoreDropdownOpen(true)}
              onMouseLeave={() => setMoreDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors border border-[#285274] ${
                  moreDropdownOpen || location.pathname.match(/\/(alerts|data-sources|methodology|about)/)
                    ? 'bg-[#12385C] text-[#25C5DC]'
                    : 'text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF]'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>{t('app.docs', 'Docs')}</span>
                <ChevronDown className="w-3 h-3 text-[#25C5DC]" />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 top-full pt-1.5 w-48 z-50 animate-fade-in">
                  <div className="rounded-2xl border border-[#285274] bg-[#0E2B49] p-1.5 shadow-2xl space-y-0.5">
                    {SECONDARY_NAV.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF] rounded-xl transition-colors"
                      >
                        <item.icon className="w-3.5 h-3.5 text-[#25C5DC]" />
                        <span>{getSecondaryLabel(item.to, item.label)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Operational Status */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0B2545] border border-[#285274] text-[#8ED8F5] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#35C58B] animate-pulse" />
              <span>{t('app.telemetryVerified', 'Telemetry Verified')}</span>
            </div>

            {/* Language Switcher Modal / Dropdown */}
            <LanguageSelector />

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation drawer"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-xl text-[#F3F8FF] hover:bg-[#12385C] border border-[#285274] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout Body: Left Sidebar + Right Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT VERTICAL COLUMN: CLIMATE INTELLIGENCE MODULES ── */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[#285274] bg-[#0B2545] transition-all duration-300 ease-in-out shrink-0 select-none ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
          aria-label="Climate Intelligence Modules"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-[#285274] flex items-center justify-between">
            {!sidebarCollapsed ? (
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#25C5DC]">
                  CLIMATE INTELLIGENCE MODULES
                </h3>
                <p className="text-[10px] text-[#B6C9DC] mt-0.5">
                  Real-time multi-hazard risk array
                </p>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#25C5DC]">AI</span>
              </div>
            )}
          </div>

          {/* Module Links Vertical List */}
          <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
            {/* Overview item */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                  isActive
                    ? 'bg-[#2389D7] text-white shadow-glow border border-[#8ED8F5]/30'
                    : 'text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF] border border-transparent'
                } ${sidebarCollapsed ? 'justify-center px-2' : ''}`
              }
              title={t('nav.mainDashboard', 'Overview Dashboard')}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 text-[#25C5DC] group-hover:text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-xs font-black truncate">{t('nav.mainDashboard', 'Main Overview')}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#102F50] text-[#8ED8F5] font-bold">
                    Core
                  </span>
                </div>
              )}
            </NavLink>

            <div className="pt-2 pb-1">
              {!sidebarCollapsed && (
                <div className="text-[9px] font-black uppercase tracking-widest text-[#B6C9DC]/60 px-3">
                  {t('dashboard.modulesTitle', 'Autonomous Modules')}
                </div>
              )}
            </div>

            {/* The 6 AI Modules */}
            {AI_MODULES.map(({ to, label, icon: Icon, statusText, statusDot, accentColor }) => {
              const { label: localizedLabel, status: localizedStatus } = getModuleMeta(to, label, statusText)
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-[#12385C] text-white border-2 border-[#2389D7] shadow-glow'
                        : 'text-[#B6C9DC] hover:bg-[#102F50] hover:text-[#F3F8FF] border border-[#285274]/50'
                    } ${sidebarCollapsed ? 'justify-center px-2' : ''}`
                  }
                  title={localizedLabel}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active left indicator bar */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r bg-[#25C5DC]"
                          aria-hidden="true"
                        />
                      )}

                      <div
                        className={`relative flex items-center justify-center shrink-0 w-8 h-8 rounded-xl transition-colors ${
                          isActive ? 'bg-[#2389D7]/20 text-[#25C5DC]' : 'bg-[#0E2B49] text-[#B6C9DC] group-hover:text-[#25C5DC]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black truncate text-[#F3F8FF] group-hover:text-white">
                              {localizedLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot} shrink-0`} />
                            <span className="text-[10px] font-semibold text-[#B6C9DC] truncate">
                              {localizedStatus}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          {!sidebarCollapsed && (
            <div className="p-3 border-t border-[#285274] bg-[#071A33]/50 text-[11px] text-[#B6C9DC] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#8ED8F5]">
                <span>{t('common.operational', 'Platform State')}</span>
                <span className="text-[#35C58B]">{t('risk.verifiedOnline', '24/7 Verified')}</span>
              </div>
              <p className="text-[10px] leading-tight text-[#B6C9DC]/80">
                Government-grade climate telemetry across Indian catchments.
              </p>
            </div>
          )}
        </aside>

        {/* ── RIGHT MAIN DASHBOARD WORKSPACE ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto" id="main-content" tabIndex={-1}>
          {/* Mobile City Selector on Small Screens */}
          <div className="md:hidden px-4 pt-4">
            <CitySelector />
          </div>

          <Outlet />

          {/* ── Navy Institutional Footer ── */}
          <footer
            className="border-t border-[#285274] bg-[#0B2545] text-[#F3F8FF] py-10 px-4 sm:px-6 lg:px-8 mt-auto"
            role="contentinfo"
          >
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#2389D7] rounded-lg flex items-center justify-center clip-hexagon text-white text-[10px] font-black">
                      CG
                    </div>
                    <span className="font-display font-black text-sm tracking-wider text-[#F3F8FF]">
                      CLIMATEGUARD<span className="text-[#25C5DC]">.AI</span>
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#25C5DC] tracking-widest uppercase">
                    PREDICT. PREPARE. PROTECT.
                  </p>
                  <p className="text-xs text-[#B6C9DC] leading-relaxed">
                    High-accuracy climate monitoring, hydrological modeling, and disaster prediction platform across India.
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-[#F3F8FF] uppercase tracking-wider text-[11px]">{t('dashboard.modulesTitle', 'Prediction Engines')}</h4>
                  <ul className="space-y-1 text-[#B6C9DC] font-medium">
                    <li><Link to="/flood" className="hover:text-[#25C5DC]">{t('nav.flood', 'Flood Guard AI')}</Link></li>
                    <li><Link to="/heat" className="hover:text-[#25C5DC]">{t('nav.heat', 'Heat Guard AI')}</Link></li>
                    <li><Link to="/fire" className="hover:text-[#25C5DC]">{t('nav.fire', 'Fire Guard AI')}</Link></li>
                    <li><Link to="/crop" className="hover:text-[#25C5DC]">{t('nav.crop', 'Crop Shield AI')}</Link></li>
                    <li><Link to="/drainage" className="hover:text-[#25C5DC]">{t('nav.drainage', 'Drainage Network AI')}</Link></li>
                  </ul>
                </div>

                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-[#F3F8FF] uppercase tracking-wider text-[11px]">{t('nav.sidebarSubtitle', 'Platform Tools')}</h4>
                  <ul className="space-y-1 text-[#B6C9DC] font-medium">
                    <li><Link to="/dashboard" className="hover:text-[#25C5DC]">{t('nav.mainDashboard', 'Command Dashboard')}</Link></li>
                    <li><Link to="/simulation" className="hover:text-[#25C5DC]">{t('nav.simulation', 'Scenario Validation Lab')}</Link></li>
                    <li><Link to="/methodology" className="hover:text-[#25C5DC]">{t('nav.methodology', 'Scientific Methodology')}</Link></li>
                    <li><Link to="/alerts" className="hover:text-[#25C5DC]">{t('nav.alerts', 'Emergency Broadcasts')}</Link></li>
                    <li><Link to="/data-sources" className="hover:text-[#25C5DC]">{t('nav.sources', 'Data Registry')}</Link></li>
                  </ul>
                </div>

                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-[#F3F8FF] uppercase tracking-wider text-[11px]">{t('common.authoritativeSources', 'Authoritative Sources')}</h4>
                  <p className="text-[#B6C9DC] leading-relaxed text-[11px]">
                    Open-Meteo ECMWF/GFS, CWC River Basins, WRD Maharashtra, and NASA FIRMS.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#35C58B] bg-[#0E2B49] px-2.5 py-1 rounded-xl border border-[#35C58B]/30 w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#35C58B]" />
                    <span>Scientific Explainable AI</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#285274] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#B6C9DC]">
                <p className="font-medium text-[#F3F8FF]">
                  {t('alerts.decisionSupport', '⚠️ Decision-support system. Follow official IMD / CWC / NDMA bulletins during severe events.')}
                </p>
                <p>© {new Date().getFullYear()} ClimateGuard AI • Government-Grade Resilience Platform</p>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* ── Mobile Sliding Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#071A33]/80 backdrop-blur-sm -z-10 animate-fade-in"
          />

          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-[#0B2545] border-l border-[#285274] p-6 flex flex-col justify-between overflow-y-auto animate-slide-in-right text-[#F3F8FF]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#285274] mb-4">
                <div className="font-display font-extrabold text-base text-[#F3F8FF]">
                  CLIMATEGUARD<span className="text-[#25C5DC]">.AI</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg text-[#F3F8FF] hover:bg-[#12385C]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Language Selector */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#285274]">
                <span className="text-xs font-bold text-[#8ED8F5]">{t('app.language', 'Language')}</span>
                <LanguageSelector compact />
              </div>

              <div className="space-y-1 mb-6">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#25C5DC] px-2 mb-2">
                  {t('nav.sidebarTitle', 'CLIMATE INTELLIGENCE MODULES')}
                </div>

                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-[#2389D7] text-white shadow-glow'
                        : 'text-[#B6C9DC] hover:bg-[#12385C]'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-[#25C5DC]" />
                  <span>{t('nav.dashboard', 'Main Overview')}</span>
                </NavLink>

                {AI_MODULES.map(({ to, label, icon: Icon, statusText, statusDot }) => {
                  const { label: localizedLabel, status: localizedStatus } = getModuleMeta(to, label, statusText)
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                          isActive
                            ? 'bg-[#12385C] text-white border border-[#2389D7]'
                            : 'text-[#B6C9DC] hover:bg-[#102F50]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0 text-[#25C5DC]" />
                        <span>{localizedLabel}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-[#B6C9DC]">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                        {localizedStatus}
                      </span>
                    </NavLink>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-[#285274] space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#25C5DC] px-2 mb-2">
                  {t('app.docs', 'Documentation & System')}
                </div>
                {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF]"
                  >
                    <Icon className="w-4 h-4 text-[#25C5DC]" />
                    <span>{getSecondaryLabel(to, label)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#285274] text-center text-xs text-[#B6C9DC]">
              Government-Grade Climate Intelligence
            </div>
          </div>
        </div>
      )}

      {/* ── Live Data Delay & Latency Indicator (Bottom Right Corner) ── */}
      <DataLatencyIndicator />
    </div>
  )
}
