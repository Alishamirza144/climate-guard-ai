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
  source: 'browser' | 'preset' | 'search' | 'fallback'
}

export const presetLocations = [
  { label: 'Pune', lat: 18.5204, lon: 73.8567 },
  { label: 'Nashik', lat: 19.9975, lon: 73.7898 },
  { label: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { label: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { label: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { label: 'Guwahati', lat: 26.1445, lon: 91.7362 },
  { label: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { label: 'Ludhiana', lat: 30.901, lon: 75.8573 },
  { label: 'Nainital', lat: 29.391, lon: 79.4542 },
] as const

const DEFAULT_LOCATION: LocationValue = {
  lat: 18.5204,
  lon: 73.8567,
  label: 'Pune, Maharashtra',
  source: 'fallback',
}

const STORAGE_KEY = 'climateguard-location'

interface LocationContextValue {
  location: LocationValue
  setLocation: (next: LocationValue) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: LocationResult[]
  isSearching: boolean
  error: string | null
  locateMe: () => Promise<void>
  presets: typeof presetLocations
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
      setError('Location permission was denied, so the app is using Pune as the default location.')
      persistLocation({
        ...DEFAULT_LOCATION,
        source: 'fallback',
      })
      return null
    })

    if (!position) {
      return
    }

    const next: LocationValue = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      label: 'Current location',
      source: 'browser',
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
    void locateMe()
  }, [locateMe])

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
      searchQuery,
      setSearchQuery,
      searchResults,
      isSearching,
      error,
      locateMe,
      presets: presetLocations,
    }),
    [error, isSearching, locateMe, location, persistLocation, searchQuery, searchResults],
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
