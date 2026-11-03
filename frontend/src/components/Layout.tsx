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
  ChevronDown,
  Layers,
  ArrowRight,
  FlaskConical,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import DataLatencyIndicator from './DataLatencyIndicator'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/flood', label: 'Flood Guard AI', icon: Droplets },
  { to: '/heat', label: 'Heat Guard AI', icon: Thermometer },
  { to: '/fire', label: 'Fire Guard AI', icon: Flame },
  { to: '/crop', label: 'Crop Shield AI', icon: Sprout },
  { to: '/drainage', label: 'Drainage Network', icon: GitBranch },
  { to: '/simulation', label: 'Scenario Lab', icon: FlaskConical },
]

const SECONDARY_NAV = [
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/data-sources', label: 'Data Sources' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About Team' },
]

export default function Layout() {
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('climateguard-lang', lang)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#DFF1FF] text-[#20364D] selection:bg-[#2784D8]/20 selection:text-[#2784D8]">
      {/* ── Top Horizontal Sky-Blue Navigation Bar ── */}
      <header
        className="sticky top-0 z-40 w-full bg-[#B9DEFF]/95 backdrop-blur-md border-b border-[#B9D9F5] shadow-sm transition-colors"
        role="banner"
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Tagline */}
          <Link
            to="/"
            className="flex items-center gap-2.5 no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2784D8] rounded-xl p-1 shrink-0"
          >
            {/* Emblem */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <div
                className="absolute inset-0 bg-[#2784D8] group-hover:bg-[#1c6bb5] transition-colors clip-hexagon shadow-sm"
                aria-hidden="true"
              />
              <svg
                viewBox="0 0 24 24"
                className="relative z-10 w-5 h-5 text-white fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="font-display font-black text-sm sm:text-base tracking-wider text-[#20364D] flex items-center gap-0.5 leading-none">
                CLIMATEGUARD<span className="text-[#2784D8]">.AI</span>
              </span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-[#16A6A3] mt-0.5 uppercase">
                DEMO • SKY-BLUE
              </span>
            </div>
          </Link>

          {/* Desktop Horizontal Navigation (All 5 Modules + Overview + Scenario Lab) */}
          <nav
            className="hidden xl:flex items-center gap-1 overflow-x-auto py-1"
            aria-label="Primary Navigation"
          >
            {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2784D8] text-white shadow-sm'
                      : 'text-[#20364D] hover:bg-[#CDE8FF] hover:text-[#1c6bb5]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}

            {/* "More" Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setMoreDropdownOpen(true)}
              onMouseLeave={() => setMoreDropdownOpen(false)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  moreDropdownOpen || location.pathname.match(/\/(alerts|data-sources|methodology|about)/)
                    ? 'bg-[#2784D8]/20 text-[#2784D8]'
                    : 'text-[#20364D] hover:bg-[#CDE8FF]'
                }`}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                <span>More</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {moreDropdownOpen && (
                <div className="absolute right-0 top-full pt-1.5 w-44 z-50 animate-fade-in">
                  <div className="rounded-xl border border-[#B9D9F5] bg-[#F0F8FF] p-1.5 shadow-lg space-y-0.5">
                    {SECONDARY_NAV.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#20364D] hover:bg-[#CDE8FF] hover:text-[#2784D8] rounded-lg transition-colors"
                      >
                        {item.icon && <item.icon className="w-3.5 h-3.5 text-[#2784D8]" />}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2">
            {/* System Status Compact Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#D9F5E8] border border-[#299765]/30 text-[#20364D] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#299765] animate-pulse" />
              <span>Normal Baseline</span>
            </div>

            {/* Language Switcher */}
            <label className="flex items-center gap-1 rounded-xl border border-[#B9D9F5] bg-[#F0F8FF] px-2 py-1 text-xs text-[#20364D] font-bold">
              <span className="sr-only">{t('app.language')}</span>
              <select
                value={i18n.language}
                onChange={(event) => setLanguage(event.target.value)}
                className="bg-transparent text-xs text-[#20364D] font-bold outline-none cursor-pointer"
                aria-label={t('app.language')}
              >
                <option value="en">EN</option>
                <option value="hi">हिं</option>
                <option value="mr">मर</option>
              </select>
            </label>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation drawer"
              aria-expanded={mobileMenuOpen}
              className="xl:hidden p-2 rounded-xl text-[#20364D] hover:bg-[#CDE8FF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2784D8]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Sliding Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-[#20364D]/50 backdrop-blur-sm -z-10 animate-fade-in"
          />

          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-full bg-[#DFF1FF] border-l border-[#B9D9F5] p-6 flex flex-col justify-between overflow-y-auto animate-slide-in-right text-[#20364D]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#B9D9F5] mb-4">
                <div className="font-display font-extrabold text-base text-[#20364D]">
                  CLIMATEGUARD<span className="text-[#2784D8]">.AI</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg text-[#20364D] hover:bg-[#CDE8FF]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1 mb-6">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5B7188] px-2 mb-2">
                  Navigation & AI Modules
                </div>
                {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-[#2784D8] text-white shadow-sm'
                          : 'text-[#20364D] hover:bg-[#CDE8FF]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-4 border-t border-[#B9D9F5] space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#5B7188] px-2 mb-2">
                  Intelligence & Documentation
                </div>
                {SECONDARY_NAV.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#20364D] hover:bg-[#CDE8FF]"
                  >
                    {Icon && <Icon className="w-4 h-4 text-[#2784D8]" />}
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#B9D9F5] text-center text-xs text-[#5B7188]">
              Team Spartans • KKWIEER Nashik
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Outlet ── */}
      <main className="flex-1 flex flex-col" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      {/* ── Live Data Delay & Latency Indicator (Bottom Right Corner) ── */}
      <DataLatencyIndicator />

      {/* ── Sky-Blue Institutional Footer ── */}
      <footer
        className="border-t border-[#B9D9F5] bg-[#CDE8FF] text-[#20364D] py-10 px-4 sm:px-6 lg:px-8 mt-auto"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#2784D8] rounded-lg flex items-center justify-center clip-hexagon text-white text-[10px] font-black">
                  CG
                </div>
                <span className="font-display font-black text-sm tracking-wider text-[#20364D]">
                  CLIMATEGUARD<span className="text-[#2784D8]">.AI</span>
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#16A6A3] tracking-widest">
                PREDICT. PREPARE. PROTECT.
              </p>
              <p className="text-xs text-[#5B7188] leading-relaxed">
                AI-Powered Multi-Hazard Climate Risk Prediction &amp; Early Warning System for Maharashtra, India.
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-[#20364D] uppercase tracking-wider text-[11px]">Prediction Engines</h4>
              <ul className="space-y-1 text-[#5B7188] font-medium">
                <li><Link to="/flood" className="hover:text-[#2784D8]">FloodGuard AI</Link></li>
                <li><Link to="/heat" className="hover:text-[#2784D8]">HeatGuard AI</Link></li>
                <li><Link to="/fire" className="hover:text-[#2784D8]">FireGuard AI</Link></li>
                <li><Link to="/crop" className="hover:text-[#2784D8]">CropShield AI</Link></li>
                <li><Link to="/drainage" className="hover:text-[#2784D8]">Drainage Network</Link></li>
              </ul>
            </div>

            <div className="space-y-1.5 text-xs">
              <h4 className="font-bold text-[#20364D] uppercase tracking-wider text-[11px]">Platform Tools</h4>
              <ul className="space-y-1 text-[#5B7188] font-medium">
                <li><Link to="/dashboard" className="hover:text-[#2784D8]">Live Command Dashboard</Link></li>
                <li><Link to="/simulation" className="hover:text-[#2784D8]">Scenario Validation Lab</Link></li>
                <li><Link to="/methodology" className="hover:text-[#2784D8]">Hydrologic &amp; ML Methodology</Link></li>
                <li><Link to="/alerts" className="hover:text-[#2784D8]">Early Warning Broadcasts</Link></li>
                <li><Link to="/data-sources" className="hover:text-[#2784D8]">Verified Open Data Registry</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#20364D] uppercase tracking-wider text-[11px]">Data Attribution</h4>
              <p className="text-[#5B7188] leading-relaxed text-[11px]">
                Open-Meteo, NASA POWER, NASA FIRMS, OpenStreetMap Overpass, and WRD Maharashtra.
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#299765] bg-[#D9F5E8] px-2 py-1 rounded-lg border border-[#299765]/30 w-fit">
                <CheckCircle2 className="w-3 h-3 text-[#299765]" />
                <span>Verified Scientific Framework</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#B9D9F5] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#5B7188]">
            <p className="font-medium text-[#20364D]">
              ⚠️ Decision-support system. Follow official IMD / CWC / NDMA warnings.
            </p>
            <p>© {new Date().getFullYear()} Team Spartans • KKWIEER Nashik • Academic Research Project</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
