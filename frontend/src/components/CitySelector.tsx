import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Search, ChevronDown, Check, Compass, X } from 'lucide-react'
import { useLocationContext } from './LocationProvider'
import type { CityRegion, CityData } from '../data/cities'
import { useLocaleFormatter } from '../i18n/formatters'
import { localizeCity, localizeState } from '../i18n/locations'

const REGIONS: CityRegion[] = [
  'All',
  'Maharashtra',
  'North India',
  'South India',
  'West India',
  'East India',
  'Central India',
  'Union Territories',
]

export default function CitySelector() {
  const { t, i18n } = useTranslation()
  const { location, selectCity, locateMe, cities, currentCity } = useLocationContext()
  const { lang, formatNumber, formatDigits, formatCoordinates } = useLocaleFormatter()

  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<CityRegion>('All')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      searchInputRef.current?.focus()
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredCities = useMemo(() => {
    return cities.filter((city) => {
      const matchesRegion = selectedRegion === 'All' || city.region === selectedRegion
      const query = searchTerm.toLowerCase().trim()
      if (!query) return matchesRegion

      const locCityName = localizeCity(city.id || city.name, lang).toLowerCase()
      const locStateName = localizeState(city.state, lang).toLowerCase()

      const matchesSearch =
        city.name.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query) ||
        locCityName.includes(query) ||
        locStateName.includes(query) ||
        city.rivers.some((r) => r.river.toLowerCase().includes(query) || r.station.toLowerCase().includes(query))

      return matchesRegion && matchesSearch
    })
  }, [cities, selectedRegion, searchTerm, lang])

  const handleSelect = (city: CityData) => {
    selectCity(city.id)
    setIsOpen(false)
    setSearchTerm('')
  }

  const currentCityName = localizeCity(currentCity?.id || currentCity?.name || location.label.split(',')[0], lang)
  const currentCityState = localizeState(currentCity?.state || location.state, lang)

  return (
    <div className="relative min-w-0 w-full" ref={dropdownRef}>
      {/* City Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex w-full items-center justify-between gap-2 rounded-2xl border border-[#285274] bg-[#12385C] px-3.5 py-2 text-left shadow-md transition-all hover:border-[#2389D7] hover:bg-[#0E2B49] focus:outline-none focus:ring-2 focus:ring-[#2389D7]"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#2389D7]/20 text-[#25C5DC] group-hover:bg-[#2389D7] group-hover:text-white transition-colors">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-extrabold text-[#F3F8FF]">
                {currentCityName}
              </span>
              <span className="rounded-full bg-[#102F50] border border-[#285274] px-2 py-0.2 text-[10px] font-bold text-[#8ED8F5]">
                {currentCityState || 'India'}
              </span>
            </div>
            <p className="truncate text-[10px] font-semibold text-[#B6C9DC]">
              {formatCoordinates(location.lat, location.lon)} • {currentCity?.region || 'Monitored'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#25C5DC] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[340px] sm:min-w-[480px] max-w-[560px] rounded-3xl border-2 border-[#285274] bg-[#0E2B49] p-4 shadow-2xl animate-fade-in backdrop-blur-xl">
          {/* Header & Search */}
          <div className="space-y-3 pb-3 border-b border-[#285274]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-[#F3F8FF] uppercase tracking-wide">
                  {t('city.selectCity', 'Select Indian City')}
                </h4>
                <p className="text-[11px] text-[#B6C9DC]">
                  {t('city.monitoredCities', 'Covering 50+ municipal & river catchment centers across India')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => locateMe()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#2389D7]/20 border border-[#2389D7]/40 px-2.5 py-1 text-xs font-bold text-[#25C5DC] hover:bg-[#2389D7]/30 transition"
                title="Use browser GPS geolocation"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>{t('city.currentLocation', 'Locate Me')}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B6C9DC]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('city.searchPlaceholder', 'Search 50+ Indian cities, states, rivers...')}
                className="w-full rounded-2xl border border-[#285274] bg-[#12385C] py-2 pl-9 pr-9 text-xs text-[#F3F8FF] placeholder-[#B6C9DC]/60 focus:border-[#2389D7] focus:outline-none focus:ring-1 focus:ring-[#2389D7]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B6C9DC] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Region Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setSelectedRegion(region)}
                  className={`rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all ${
                    selectedRegion === region
                      ? 'bg-[#2389D7] text-white shadow-glow'
                      : 'bg-[#12385C] text-[#B6C9DC] hover:bg-[#102F50] hover:text-[#F3F8FF] border border-[#285274]/50'
                  }`}
                >
                  {region === 'All' ? t('city.allIndia', 'All') : region === 'Maharashtra' ? localizeState('Maharashtra', lang) : region}
                </button>
              ))}
            </div>
          </div>

          {/* Cities List */}
          <div className="mt-3 max-h-[320px] overflow-y-auto pr-1 space-y-1.5">
            {filteredCities.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-[#B6C9DC]">
                No cities found matching &ldquo;{searchTerm}&rdquo; in {selectedRegion}.
              </div>
            ) : (
              filteredCities.map((city) => {
                const isSelected = currentCity?.id === city.id
                const locName = localizeCity(city.id || city.name, lang)
                const locState = localizeState(city.state, lang)

                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className={`group flex w-full items-center justify-between rounded-2xl p-2.5 text-left transition ${
                      isSelected
                        ? 'bg-[#2389D7] text-white shadow-glow border border-[#8ED8F5]/30'
                        : 'bg-[#12385C] hover:bg-[#102F50] text-[#F3F8FF] border border-[#285274]/40'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">{locName}</span>
                        {locName !== city.name && (
                          <span className="text-[11px] text-[#B6C9DC]/70">({city.name})</span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#102F50] text-[#8ED8F5] border border-[#285274]'
                          }`}
                        >
                          {locState}
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-medium ${
                          isSelected ? 'text-white/80' : 'text-[#B6C9DC]'
                        }`}
                      >
                        {city.rivers.length > 0 && (
                          <span>
                            🌊 {city.rivers.map((r) => r.river.split(' ')[0]).join(', ')}
                          </span>
                        )}
                        <span>
                          📍 {formatDigits(`${city.lat.toFixed(2)}°N, ${city.lon.toFixed(2)}°E`, lang)}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-white" />}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="mt-3 pt-2.5 border-t border-[#285274] flex items-center justify-between text-[10px] font-bold text-[#B6C9DC]">
            <span>Showing {formatNumber(filteredCities.length)} of {formatNumber(cities.length)} Indian cities</span>
            <span className="text-[#25C5DC]">{t('dashboard.verifiedOnline', 'Live Telemetry Driven')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
