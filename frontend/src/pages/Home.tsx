import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Droplets,
  Thermometer,
  Flame,
  Sprout,
  Activity,
  ShieldAlert,
  Cpu,
  Radar,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  TrendingDown,
  Layers,
  Sparkles,
} from 'lucide-react'
import { api } from '../lib/api'
import { ButtonLink } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Badge } from '../components/ui/Badge'
import { RiskGauge } from '../components/ui/RiskGauge'
import { DataSourceBadge } from '../components/ui/DataSourceBadge'

// ── Stepper Steps (Proposed Solution) ──
const SOLUTION_STEPS = [
  {
    id: 'sense',
    step: '01',
    name: 'SENSE',
    subtitle: 'Multi-Source Telemetry Ingestion',
    desc: 'Continuously ingest live environmental telemetry from on-ground IoT sensors, meteorological satellites (NASA FIRMS, NASA POWER), and real-time open weather APIs.',
    metrics: ['IoT Conduit Depth', 'Open-Meteo API', 'NASA FIRMS Modis/Viirs'],
    color: 'text-brand-teal',
    border: 'border-brand-teal/40',
    bg: 'bg-brand-teal/10',
    icon: Radar,
  },
  {
    id: 'learn',
    step: '02',
    name: 'LEARN',
    subtitle: 'Feature Extraction & Anomaly Models',
    desc: 'Normalize SI telemetry units, detect microclimate anomalies, and evaluate localized risk patterns using trained machine learning models (XGBoost, Random Forest).',
    metrics: ['SI Unit Normalization', 'Rolling Baselines', 'Anomaly Clustering'],
    color: 'text-lime',
    border: 'border-lime/40',
    bg: 'bg-lime/10',
    icon: Cpu,
  },
  {
    id: 'predict',
    step: '03',
    name: 'PREDICT',
    subtitle: 'Standardized 0–100 Risk Scoring',
    desc: 'Compute unified 0–100 risk indices categorized strictly into Low (0–29), Moderate (30–59), High (60–84), and Critical (85–100) alongside 24–72 h trajectory forecasts.',
    metrics: ['0–100 Risk Score', '4-Tier Risk Index', '24–72 h Trend Analysis'],
    color: 'text-brand-orange',
    border: 'border-brand-orange/40',
    bg: 'bg-brand-orange/10',
    icon: Activity,
  },
  {
    id: 'warn',
    step: '04',
    name: 'WARN',
    subtitle: 'Automated Early Warning Dispatch',
    desc: 'Instantly broadcast localized alerts via interactive geospatial map overlays, SMS/Telegram channels, and web push notifications before hazard thresholds are crossed.',
    metrics: ['Instant Telegram Bot', 'Geospatial Heatmaps', 'Multi-Hazard Web Push'],
    color: 'text-brand-red',
    border: 'border-brand-red/40',
    bg: 'bg-brand-red/10',
    icon: BellRing,
  },
  {
    id: 'act',
    step: '05',
    name: 'ACT',
    subtitle: 'Preventive Intervention Directives',
    desc: 'Recommend concrete municipal and grassroots actions — from dispatching stormwater clearing crews to advising farmer irrigation and vulnerable citizen heat protection.',
    metrics: ['SOP Checklists', 'Resource Allocation', 'Citizen Advisories'],
    color: 'text-lime',
    border: 'border-lime/40',
    bg: 'bg-lime/10',
    icon: CheckCircle2,
  },
]

// ── Modules Data (Exact from Deck) ──
const MODULES = [
  {
    id: 'flood',
    title: 'FloodGuard AI',
    badge: 'Core Use Case',
    badgeVariant: 'primary' as const,
    riskType: 'Flood prediction + drainage blockage detection',
    to: '/flood',
    icon: Droplets,
    color: 'text-brand-teal',
    accentColor: '#008074',
    bg: 'bg-brand-teal/10',
    inputs: [
      'Rainfall intensity (mm/h) & cumulative precipitation',
      'River basin stage & runoff gauge readings',
      'Digital elevation model (DEM) & slope terrain',
      'IoT ultrasonic stormwater conduit depth telemetry',
      'Choke ratio & soil saturation index',
    ],
    demoMetric: { label: 'Peak Drainage Depth', value: '1.42 m', status: 'Normal' },
  },
  {
    id: 'heat',
    title: 'HeatGuard AI',
    badge: 'Thermal Risk',
    badgeVariant: 'moderate' as const,
    riskType: 'Heatwave risk & urban heat island tracking',
    to: '/heat',
    icon: Thermometer,
    color: 'text-brand-orange',
    accentColor: '#FDB52B',
    bg: 'bg-brand-orange/10',
    inputs: [
      'Ambient 2m dry-bulb temperature (°C)',
      'Relative humidity (%) & dewpoint spread',
      'Wet-bulb globe temperature (WBGT) index',
      'Surface solar irradiance (W/m²)',
      'Consecutive anomaly days above 95th percentile',
    ],
    demoMetric: { label: 'WBGT Heat Index', value: '31.2 °C', status: 'Moderate' },
  },
  {
    id: 'fire',
    title: 'FireGuard AI',
    badge: 'Vegetation Risk',
    badgeVariant: 'critical' as const,
    riskType: 'Forest & vegetation wildfire risk',
    to: '/fire',
    icon: Flame,
    color: 'text-brand-red',
    accentColor: '#E5484D',
    bg: 'bg-brand-red/10',
    inputs: [
      'NASA FIRMS thermal anomaly hotspots (MODIS/VIIRS)',
      'Vegetation dryness index & fuel moisture content',
      'Wind velocity (m/s) & prevailing azimuth heading',
      'Vapor pressure deficit (VPD in kPa)',
      'Drought index & fine fuel moisture code (FFMC)',
    ],
    demoMetric: { label: 'Fire Radiative Power', value: '0.0 MW', status: 'Low Risk' },
  },
  {
    id: 'crop',
    title: 'CropShield AI',
    badge: 'Agritech Guard',
    badgeVariant: 'low' as const,
    riskType: 'Crop stress and disease/health risk',
    to: '/crop',
    icon: Sprout,
    color: 'text-lime',
    accentColor: '#AFD17F',
    bg: 'bg-lime/10',
    inputs: [
      'Multi-layer soil moisture (0–10 cm, 10–40 cm)',
      'Actual vs reference evapotranspiration (ET₀)',
      'Thermal stress degree days (SDD)',
      '7-day precipitation deficit anomalies',
      'Crop phenological stage & fungal pathogen humidity index',
    ],
    demoMetric: { label: 'Root Soil Moisture', value: '28.4 %', status: 'Adequate' },
  },
]

// ── Team Spartans Roster (Exact from Deck) ──
const TEAM_MEMBERS = [
  {
    name: 'Umesh R Jadhav',
    role: 'Team Leader',
    expertise: 'System Architecture & Risk Orchestration',
    initials: 'UJ',
    color: 'from-primary to-lime',
  },
  {
    name: 'Aniket S Patil',
    role: 'AI/ML Lead',
    expertise: 'Predictive Modeling & Feature Engineering',
    initials: 'AP',
    color: 'from-brand-teal to-lime',
  },
  {
    name: 'Ashish S Dandage',
    role: 'Software Developer',
    expertise: 'Full-Stack Architecture & API Resiliency',
    initials: 'AD',
    color: 'from-primary-light to-brand-orange',
  },
  {
    name: 'Alisha A Mirza',
    role: 'UI & Research Lead',
    expertise: 'User Experience & Climate Science Research',
    initials: 'AM',
    color: 'from-lime to-brand-teal',
  },
  {
    name: 'Madhulika R Muthal',
    role: 'Hardware & IoT Lead',
    expertise: 'Conduit Telemetry & Edge Sensing Nodes',
    initials: 'MM',
    color: 'from-brand-orange to-brand-red',
  },
]

// ── Potential Impact Lines (Exact from Deck) ──
const IMPACT_ITEMS = [
  {
    id: '1',
    metric: '24–72 h',
    title: 'Lead-Time Prediction Window',
    desc: 'Empowering disaster response authorities and communities with actionable forecasts before climate shocks escalate.',
    color: 'text-lime',
  },
  {
    id: '2',
    metric: '100% Free',
    title: 'Open Science & Public APIs',
    desc: 'Operating exclusively with validated zero-cost telemetry from Open-Meteo, NASA POWER, NASA FIRMS, and OpenStreetMap.',
    color: 'text-brand-teal',
  },
  {
    id: '3',
    metric: '0–100',
    title: 'Unified Scientific Risk Scale',
    desc: 'Eliminating ambiguous warnings with mathematically grounded tiers: Low (0–29), Moderate (30–59), High (60–84), and Critical (85–100).',
    color: 'text-brand-orange',
  },
  {
    id: '4',
    metric: '5-in-1',
    title: 'Integrated Multi-Hazard Platform',
    desc: 'Consolidating flood, heatwave, forest fire, crop stress, and stormwater drainage monitoring into one intelligence center.',
    color: 'text-lime',
  },
]

interface DeferredSectionProps extends React.ComponentPropsWithoutRef<'section'> {
  placeholderHeight: number
}

function DeferredSection({
  children,
  className = '',
  placeholderHeight,
  style,
  ...props
}: DeferredSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={className}
      style={{ ...style, minHeight: isVisible ? undefined : placeholderHeight }}
      aria-busy={!isVisible}
      {...props}
    >
      {isVisible ? children : null}
    </section>
  )
}

export default function Home() {
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  // Auto-cycle through the stepper if user doesn't manually click
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % SOLUTION_STEPS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  // Backend Health Query
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    retry: 2,
    staleTime: 60_000,
  })

  const currentStep = SOLUTION_STEPS[activeStepIndex]

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. HERO SECTION
          ────────────────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[92vh] flex items-center justify-center pt-8 pb-20 px-4 sm:px-6 lg:px-8 bg-cyber-grid bg-radial-vignette"
        aria-labelledby="hero-title"
      >
        {/* Subtle ambient lighting glows */}
        <div
          className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/3 right-10 w-[350px] h-[350px] bg-lime/10 rounded-full blur-[100px] -z-10"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div
            className="lg:col-span-7 flex flex-col items-start text-left space-y-6 motion-safe:animate-fade-in-up"
          >
            {/* Mission Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime/30 bg-primary/30 backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-lime animate-ping" />
              <span className="text-xs font-bold tracking-wider text-lime uppercase">
                Team Spartans · KKWIEER Nashik
              </span>
            </div>

            {/* Brand Title */}
            <div>
              <h1
                id="hero-title"
                className="font-display text-[clamp(1.85rem,8vw,3.75rem)] sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]"
              >
                CLIMATEGUARD<span className="text-lime"> AI</span>
              </h1>
              <p className="text-lime font-bold tracking-[0.15em] sm:tracking-[0.3em] text-sm sm:text-base mt-2 uppercase">
                PREDICT. PREPARE. PROTECT.
              </p>
            </div>

            {/* Subtitle */}
            <h2 className="text-xl sm:text-2xl font-semibold text-white/90 max-w-2xl leading-snug">
              AI-Powered Climate Risk Prediction &amp; Early Warning System
            </h2>

            <p className="text-white/70 text-sm sm:text-base max-w-xl leading-relaxed">
              A unified multi-hazard intelligence engine monitoring localized flood, heatwave, forest fire, and crop stress threats across India in real-time.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <ButtonLink
                to="/dashboard"
                variant="lime"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Open Live Dashboard
              </ButtonLink>

              <ButtonLink to="#how-it-works" variant="outline" size="lg">
                See How It Works
              </ButtonLink>
            </div>

            {/* Live Telemetry Status Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-3 text-xs text-white/60">
              <DataSourceBadge source="simulated" provider="Weather integration coming in Task 11" />
              <span className="hidden sm:inline text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime" />
                Backend API:{' '}
                {healthLoading ? (
                  <span className="text-white/40">probing…</span>
                ) : healthData ? (
                  <strong className="text-lime font-semibold">ONLINE · v{healthData.version}</strong>
                ) : (
                  <strong className="text-brand-orange font-semibold">STANDBY</strong>
                )}
              </span>
            </div>
          </div>

          {/* Right Hero: Subtle Animated Climate Globe */}
          <div
            className="lg:col-span-5 flex items-center justify-center motion-safe:animate-fade-in"
          >
            <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
              {/* Outer pulsing radar ring */}
              <div className="absolute inset-0 rounded-full border border-lime/20 animate-ping opacity-25" />
              <div className="absolute inset-4 rounded-full border border-primary-light/30 animate-pulse" />
              <div className="absolute inset-8 rounded-full border border-dashed border-white/10 animate-[spin_60s_linear_infinite]" />

              {/* Central Glowing Shield / Globe Motif */}
              <div className="hero-globe relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-br from-navy-card/90 via-navy-dark/95 to-primary-dark/80 border border-white/20 shadow-glow-primary p-6 flex flex-col items-center justify-center text-center overflow-hidden">
                {/* SVG Globe Wireframe Grid */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full text-lime/15 stroke-current stroke-[0.8] fill-none"
                  aria-hidden="true"
                >
                  <circle cx="50" cy="50" r="48" />
                  <ellipse cx="50" cy="50" rx="48" ry="24" />
                  <ellipse cx="50" cy="50" rx="48" ry="12" />
                  <ellipse cx="50" cy="50" rx="24" ry="48" />
                  <ellipse cx="50" cy="50" rx="12" ry="48" />
                  <line x1="2" y1="50" x2="98" y2="50" />
                  <line x1="50" y1="2" x2="50" y2="98" />
                </svg>

                {/* Animated Sensor Hotspots on India coordinates projection */}
                <div className="absolute top-[42%] left-[48%] flex items-center justify-center">
                  <span className="animate-ping absolute h-4 w-4 rounded-full bg-lime opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-lime" />
                </div>
                <div className="absolute top-[48%] left-[45%] flex items-center justify-center">
                  <span className="animate-ping absolute h-3 w-3 rounded-full bg-brand-orange opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-brand-orange" />
                </div>
                <div className="absolute top-[35%] left-[52%] flex items-center justify-center">
                  <span className="animate-ping absolute h-3 w-3 rounded-full bg-brand-teal opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-brand-teal" />
                </div>

                {/* Central Floating Gauge */}
                <div className="relative z-10 flex flex-col items-center">
                  <RiskGauge score={24} size={110} strokeWidth={8} showLevel={true} />
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-white/90">
                    <MapPin className="w-3 h-3 text-lime" />
                    Pune City · Default Demo
                  </div>
                  <div className="mt-1">
                    <DataSourceBadge source="simulated" label="SIMULATED" />
                  </div>
                  <span className="mt-0.5 text-[10px] font-semibold text-lime/80">
                    Low Risk (24 / 100)
                  </span>
                </div>
              </div>

              {/* Floating Stat Pill Left */}
              <div
                className="absolute -left-4 top-1/4 glass-panel px-3 py-2 rounded-xl text-left border border-white/15 shadow-xl hidden sm:block animate-float"
              >
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Rainfall Runoff
                </div>
                <div className="text-xs font-black text-lime">0.0 mm/h · Normal</div>
              </div>

              {/* Floating Stat Pill Right */}
              <div
                className="absolute -right-4 bottom-1/4 glass-panel px-3 py-2 rounded-xl text-left border border-white/15 shadow-xl hidden sm:block animate-float [animation-delay:500ms]"
              >
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Urban Heat Index
                </div>
                <div className="text-xs font-black text-brand-orange">31.4 °C · WBGT Safe</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. PROBLEM STATEMENT SECTION
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={900}
        className="content-deferred deferred-problem py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        aria-labelledby="problem-heading"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-red/10 text-brand-red border border-brand-red/20">
            <ShieldAlert className="w-3.5 h-3.5" /> The Climate Challenge
          </span>
          <h2
            id="problem-heading"
            className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
          >
            Climate Risks Are Local, Fast &amp; Difficult to Predict
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed">
            Existing meteorological advisories provide coarse macro-regional forecasts, leaving municipalities, farmers, and disaster responders unprepared for hyper-local flash events.
          </p>
        </div>

        {/* 4 Hexagon Cards (Heatwaves, Flooding, Forest Fires, Crop Stress) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Heatwaves */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange clip-hexagon shadow-glow">
                <Thermometer className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Heatwaves</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Urban heat islands trigger rapid temperature spikes exceeding physiological thresholds, straining power grids and endangering vulnerable populations within hours.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 mt-6 flex items-center justify-between text-[11px] text-brand-orange font-semibold">
              <span>WBGT Stress Thresholds</span>
              <span>45 °C+ Extremes</span>
            </div>
          </GlassCard>

          {/* Card 2: Flooding */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-brand-teal/15 border border-brand-teal/40 flex items-center justify-center text-brand-teal clip-hexagon shadow-glow">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Flooding</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Sudden cloudbursts and choked stormwater drainage networks lead to catastrophic flash floods across urban centers and riverine settlements before emergency gates open.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 mt-6 flex items-center justify-between text-[11px] text-brand-teal font-semibold">
              <span>Drainage Choke Points</span>
              <span>Flash Runoff Surges</span>
            </div>
          </GlassCard>

          {/* Card 3: Forest Fires */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-brand-red/15 border border-brand-red/40 flex items-center justify-center text-brand-red clip-hexagon shadow-glow-red">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Forest Fires</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                High wind velocities, severe vapor pressure deficits, and dry biomass ignite forest fires that spread unpredictably across hilly terrain like Nainital and Western Ghats.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 mt-6 flex items-center justify-between text-[11px] text-brand-red font-semibold">
              <span>Dry Biomass Loading</span>
              <span>Rapid Spread Azimuth</span>
            </div>
          </GlassCard>

          {/* Card 4: Crop Stress */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 bg-lime/15 border border-lime/40 flex items-center justify-center text-lime clip-hexagon shadow-glow">
                <Sprout className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Crop Stress</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Microclimate rainfall deficits, sudden humidity dips, and root-zone soil dryness cause irreversible crop yield collapse and pest infestations before symptoms appear.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 mt-6 flex items-center justify-between text-[11px] text-lime font-semibold">
              <span>Soil Moisture Deficit</span>
              <span>Pathogen Humidity Spikes</span>
            </div>
          </GlassCard>
        </div>

        {/* Deck synthesis callout sentence */}
        <div className="mt-12 p-6 rounded-2xl border border-lime/30 bg-primary/20 backdrop-blur-md text-center max-w-4xl mx-auto">
          <p className="font-display text-base sm:text-lg font-bold text-white leading-relaxed">
            There is a need for an AI-powered system that can predict climate risks early, identify abnormal conditions, and recommend preventive action.
          </p>
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. PROPOSED SOLUTION (SENSE -> LEARN -> PREDICT -> WARN -> ACT)
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={1000}
        id="how-it-works"
        className="content-deferred deferred-solution py-24 px-4 sm:px-6 lg:px-8 bg-cyber-grid bg-radial-vignette border-t border-white/10"
        aria-labelledby="solution-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/40 text-lime border border-lime/30">
              <Sparkles className="w-3.5 h-3.5" /> End-to-End Pipeline
            </span>
            <h2
              id="solution-heading"
              className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
            >
              The ClimateGuard Solution Architecture
            </h2>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              From continuous sensor telemetry to frontline intervention: our scientific pipeline transforms raw satellite and IoT signals into explainable life-saving actions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: Stepper Navigation & Active Step Details */}
            <div className="lg:col-span-7 space-y-8">
              {/* Stepper Pills Navigation */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-navy-card/80 border border-white/10 backdrop-blur-md">
                {SOLUTION_STEPS.map((step, idx) => {
                  const isActive = idx === activeStepIndex
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      aria-pressed={isActive}
                      className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center select-none ${
                        isActive
                          ? 'bg-lime text-navy shadow-glow scale-[1.02]'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="text-[10px] opacity-70 leading-none">{step.step}</div>
                      <div className="leading-tight mt-0.5">{step.name}</div>
                    </button>
                  )
                })}
              </div>

              {/* Active Step Showcase Card */}
                <div
                  key={currentStep.id}
                  className="rounded-2xl border border-white/15 bg-navy-card/95 p-8 shadow-2xl relative overflow-hidden motion-safe:animate-fade-in-up"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl ${currentStep.bg} ${currentStep.border} border flex items-center justify-center shrink-0`}
                      >
                        <currentStep.icon className={`w-6 h-6 ${currentStep.color}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-lime tracking-widest uppercase">
                          STEP {currentStep.step} OF 05
                        </div>
                        <h3 className="font-display text-2xl font-black text-white">
                          {currentStep.name} · {currentStep.subtitle}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-white/80 leading-relaxed mb-6">
                    {currentStep.desc}
                  </p>

                  <div>
                    <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
                      Key Technical Capabilities:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentStep.metrics.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/90"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
            </div>

            {/* Right: Live Mini Phone UI Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-[300px] sm:w-[320px] rounded-[38px] border-4 border-slate-700 bg-navy-dark shadow-2xl p-4 overflow-hidden">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                  <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />
                </div>

                {/* Phone Screen Mockup Content */}
                <div className="space-y-4 text-left">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[10px] text-white/60 font-semibold px-1">
                    <span>Pune Node</span>
                    <span className="text-lime flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" /> Live 5G
                    </span>
                  </div>

                  {/* Top Alert Card */}
                  <div className="rounded-2xl border border-lime/30 bg-primary/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-lime" /> FloodGuard AI
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime text-navy">
                        LOW RISK
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-2xl font-black text-white">24<span className="text-xs text-white/60">/100</span></div>
                        <div className="text-[10px] text-lime">Culverts Flowing Clear</div>
                      </div>
                      <div className="w-12 h-12 flex items-center justify-center">
                        <RiskGauge score={24} size={50} strokeWidth={5} showLevel={false} />
                      </div>
                    </div>

                    <div className="text-[10px] text-white/70 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span>Telemetry: 0.0 mm/h</span>
                      <span>Next Forecast: +24 h Stable</span>
                    </div>
                  </div>

                  {/* Action Directives Card */}
                  <div className="rounded-2xl border border-white/10 bg-navy-card/90 p-4 space-y-2">
                    <div className="text-[11px] font-bold text-white">Preventive Directives</div>
                    <div className="space-y-1.5 text-[10px] text-white/70">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime shrink-0" />
                        <span>Sluice gate sensors calibrated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime shrink-0" />
                        <span>Conduit blockage index: 0.12 (Normal)</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Pill Bar */}
                  <div className="pt-2 flex items-center justify-around border-t border-white/10 text-white/50 text-[10px]">
                    <span className="text-lime font-bold">Monitor</span>
                    <span>Alerts</span>
                    <span>Sensors</span>
                    <span>Config</span>
                  </div>
                </div>

                {/* Bottom Home Indicator */}
                <div className="w-24 h-1 bg-white/20 rounded-full mx-auto mt-4" />
              </div>
            </div>
          </div>
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. ONE AI PLATFORM, MULTIPLE CLIMATE RISKS (4 Core Modules)
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={1300}
        className="content-deferred deferred-modules py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        aria-labelledby="modules-heading"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/40 text-lime border border-lime/30">
            <Layers className="w-3.5 h-3.5" /> Multi-Risk Engine
          </span>
          <h2
            id="modules-heading"
            className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
          >
            One AI Platform, Multiple Climate Risks
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed">
            Modular, explainable machine-learning engines tailored for distinct microclimate hazards, each outputting standardized 0–100 risk assessments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <GlassCard
                key={mod.id}
                className="p-8 flex flex-col justify-between group"
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl ${mod.bg} border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className={`w-6 h-6 ${mod.color}`} />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold text-white group-hover:text-lime transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-white/60 font-medium">
                          {mod.riskType}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mod.badgeVariant} size="sm">
                      {mod.badge}
                    </Badge>
                  </div>

                  {/* Exact Input Data Specifications from Deck */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-lime/90 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Input Telemetry &amp; Features:
                    </div>
                    <ul className="space-y-1.5 text-xs text-white/70">
                      {mod.inputs.map((inp) => (
                        <li key={inp} className="flex items-start gap-2">
                          <span className="text-lime font-bold">•</span>
                          <span>{inp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Link & Live Sample Metric */}
                <div className="pt-6 border-t border-white/10 mt-8 flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-2">
                      <DataSourceBadge source="simulated" label="SIMULATED" />
                    </div>
                    <div className="text-[10px] text-white/75 uppercase font-bold">
                      {mod.demoMetric.label}
                    </div>
                    <div className="text-sm font-black text-white">
                      {mod.demoMetric.value}{' '}
                      <span className="text-xs font-semibold text-lime">({mod.demoMetric.status})</span>
                    </div>
                  </div>

                  <ButtonLink
                    to={mod.to}
                    variant="outline"
                    size="sm"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    Explore {mod.title}
                  </ButtonLink>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. LIVE STRIP (Default City: Pune, Maharashtra; simulated until Task 11)
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={150}
        className="content-deferred deferred-live w-full border-y border-white/10 bg-navy-card/70 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8"
        aria-label="Default city risk preview"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime/10 border border-lime/30 flex items-center justify-center text-lime clip-hexagon">
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">Pune, Maharashtra</span>
                <DataSourceBadge source="simulated" label="SIMULATED" />
              </div>
              <p className="text-[11px] text-white/75">
                Illustrative preview values · Live city-risk data integration planned for Task 11
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-white/75">Air Temp:</span>{' '}
              <strong className="text-white font-semibold">31.4 °C</strong>
            </div>
            <div>
              <span className="text-white/75">Humidity:</span>{' '}
              <strong className="text-white font-semibold">62 %</strong>
            </div>
            <div>
              <span className="text-white/75">Rainfall:</span>{' '}
              <strong className="text-white font-semibold">0.0 mm/h</strong>
            </div>
            <div>
              <span className="text-white/75">Flood Risk:</span>{' '}
              <strong className="text-lime font-bold">24 / 100 (LOW)</strong>
            </div>
            <Link
              to="/dashboard"
              className="text-lime hover:underline font-bold text-xs inline-flex items-center gap-1"
            >
              Inspect City Map <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          6. POTENTIAL IMPACT (4 Impact Lines as Animated Rows)
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={850}
        className="content-deferred deferred-impact py-24 px-4 sm:px-6 lg:px-8 bg-cyber-grid bg-radial-vignette border-t border-white/10"
        aria-labelledby="impact-heading"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-lime/10 text-lime border border-lime/30">
              <TrendingDown className="w-3.5 h-3.5" /> Tangible Outcomes
            </span>
            <h2
              id="impact-heading"
              className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
            >
              Potential Impact Across India
            </h2>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              Designed to safeguard lives, infrastructure, and agricultural livelihoods through verifiable scientific prediction.
            </p>
          </div>

          <div className="space-y-4 max-w-5xl mx-auto">
            {IMPACT_ITEMS.map((item, idx) => (
              <div
                key={item.id}
                style={{ animationDelay: `${idx * 100}ms` }}
                className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-lime/40 transition-colors motion-safe:animate-fade-in-up"
              >
                <div className="flex items-center gap-6">
                  <div className="w-20 text-left shrink-0">
                    <span className={`font-display text-2xl sm:text-3xl font-black ${item.color}`}>
                      {item.metric}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 self-end sm:self-center">
                  <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lime">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          7. TEAM SPARTANS SECTION (Exact 5 Members and Roles)
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection
        placeholderHeight={900}
        className="content-deferred deferred-team py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        aria-labelledby="team-heading"
      >
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/40 text-lime border border-lime/30">
            Team Spartans
          </span>
          <h2
            id="team-heading"
            className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight"
          >
            Engineering Team Spartans
          </h2>
          <p className="text-lime font-bold text-sm tracking-widest uppercase">
            K K Wagh Institute of Engineering Education &amp; Research, Nashik
          </p>
          <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Undergraduate engineers dedicated to building climate resilience through applied artificial intelligence, sensor networks, and accessible risk communication.
          </p>
        </div>

        {/* 5 Member Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {TEAM_MEMBERS.map((member) => (
            <GlassCard
              key={member.name}
              className="p-6 flex flex-col items-center text-center justify-between group"
            >
              <div className="flex flex-col items-center space-y-4 w-full">
                {/* Hexagon Initial Avatar */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${member.color} clip-hexagon shadow-glow group-hover:scale-105 transition-transform`}
                  />
                  <span className="relative z-10 font-display font-black text-xl text-navy">
                    {member.initials}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-white group-hover:text-lime transition-colors">
                    {member.name}
                  </h3>
                  <div className="text-xs font-bold text-lime mt-0.5">
                    {member.role}
                  </div>
                </div>

                <p className="text-xs text-white/80 leading-relaxed">
                  {member.expertise}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 w-full mt-6 text-[10px] text-white/70 uppercase font-bold tracking-widest">
                KKWIEER
              </div>
            </GlassCard>
          ))}
        </div>
      </DeferredSection>

      {/* ──────────────────────────────────────────────────────────────────────────
          FINAL CALL TO ACTION BANNER
          ────────────────────────────────────────────────────────────────────────── */}
      <DeferredSection placeholderHeight={450} className="content-deferred deferred-cta py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-lime/30 bg-gradient-to-r from-primary/80 via-primary-dark/90 to-navy-dark p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Ready to Explore India&apos;s Climate Risk Dashboard?
            </h2>
            <p className="text-sm sm:text-base text-white/80 leading-relaxed">
              Analyze real-time meteorological metrics, run scenario simulations, and view early warning maps for Godavari river floods, urban heatwaves, and agricultural regions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <ButtonLink
                to="/dashboard"
                variant="lime"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Launch Live Dashboard
              </ButtonLink>
              <ButtonLink to="/methodology" variant="outline" size="lg">
                Read Math &amp; Science Methodology
              </ButtonLink>
            </div>
          </div>
        </div>
      </DeferredSection>
    </div>
  )
}
