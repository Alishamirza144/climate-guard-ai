import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { INDIA_CITIES, findCityByCoords, findCityById, type CityData } from '../data/cities'

export type LocationResult = {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string | null
  admin1?: string | null
  timezone?: string | null
}

export type LocationValue = {
  lat: number
  lon: number
  label: string
  source: 'browser' | 'preset' | 'search' | 'fallback' | 'city_select'
  cityId?: string
  state?: string
  region?: string
}

export const presetLocations = [
  { label: 'Mumbai, Maharashtra', lat: 19.076, lon: 72.8777, cityId: 'mumbai' },
  { label: 'Pune, Maharashtra', lat: 18.5204, lon: 73.8567, cityId: 'pune' },
  { label: 'Nashik, Maharashtra', lat: 19.9975, lon: 73.7898, cityId: 'nashik' },
  { label: 'Delhi, NCT', lat: 28.6139, lon: 77.209, cityId: 'delhi' },
  { label: 'Bengaluru, Karnataka', lat: 12.9716, lon: 77.5946, cityId: 'bengaluru' },
  { label: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707, cityId: 'chennai' },
  { label: 'Kolkata, West Bengal', lat: 22.5726, lon: 88.3639, cityId: 'kolkata' },
  { label: 'Hyderabad, Telangana', lat: 17.385, lon: 78.4867, cityId: 'hyderabad' },
  { label: 'Ahmedabad, Gujarat', lat: 23.0225, lon: 72.5714, cityId: 'ahmedabad' },
  { label: 'Guwahati, Assam', lat: 26.1445, lon: 91.7362, cityId: 'guwahati' },
  { label: 'Bhopal, Madhya Pradesh', lat: 23.2599, lon: 77.4126, cityId: 'bhopal' },
  { label: 'Nagpur, Maharashtra', lat: 21.1458, lon: 79.0882, cityId: 'nagpur' },
] as const

const DEFAULT_LOCATION: LocationValue = {
  lat: 19.9975,
  lon: 73.7898,
  label: 'Nashik, Maharashtra',
  source: 'preset',
  cityId: 'nashik',
  state: 'Maharashtra',
  region: 'Maharashtra',
}

const STORAGE_KEY = 'climateguard-location'

interface LocationContextValue {
  location: LocationValue
  setLocation: (next: LocationValue) => void
  selectCity: (cityId: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: LocationResult[]
  isSearching: boolean
  error: string | null
  locateMe: () => Promise<void>
  presets: typeof presetLocations
  cities: CityData[]
  currentCity: CityData
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<LocationValue>(DEFAULT_LOCATION)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const persistLocation = useCallback((next: LocationValue) => {
    setLocationState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const selectCity = useCallback(
    (cityId: string) => {
      const city = findCityById(cityId)
      if (city) {
        persistLocation({
          lat: city.lat,
          lon: city.lon,
          label: `${city.name}, ${city.state}`,
          source: 'city_select',
          cityId: city.id,
          state: city.state,
          region: city.region,
        })
      }
    },
    [persistLocation],
  )

  const currentCity = useMemo(() => {
    if (location.cityId) {
      const byId = findCityById(location.cityId)
      if (byId) return byId
    }
    return findCityByCoords(location.lat, location.lon)
  }, [location.cityId, location.lat, location.lon])

  const locateMe = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.')
      persistLocation(DEFAULT_LOCATION)
      return
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      })
    }).catch(() => {
      setError('Location permission was denied, so the app is using default location.')
      persistLocation({
        ...DEFAULT_LOCATION,
        source: 'fallback',
      })
      return null
    })

    if (!position) {
      return
    }

    const closest = findCityByCoords(position.coords.latitude, position.coords.longitude)
    const next: LocationValue = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      label: `${closest.name}, ${closest.state}`,
      source: 'browser',
      cityId: closest.id,
      state: closest.state,
      region: closest.region,
    }
    persistLocation(next)
    setError(null)
  }, [persistLocation])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LocationValue
        if (parsed?.lat && parsed?.lon) {
          setLocationState(parsed)
          return
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await api.locationSearch(searchQuery)
        setSearchResults(response.results ?? [])
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [searchQuery])

  const contextValue = useMemo<LocationContextValue>(
    () => ({
      location,
      setLocation: persistLocation,
      selectCity,
      searchQuery,
      setSearchQuery,
      searchResults,
      isSearching,
      error,
      locateMe,
      presets: presetLocations,
      cities: INDIA_CITIES,
      currentCity,
    }),
    [error, isSearching, locateMe, location, persistLocation, searchQuery, searchResults, selectCity, currentCity],
  )

  return <LocationContext.Provider value={contextValue}>{children}</LocationContext.Provider>
}

export function useLocationContext() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider')
  }
  return context
}
