import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { LocateFixed, MapPinned, Search } from 'lucide-react'
import { useLocationContext } from './LocationProvider'

const heatGradient = ['#2dd4bf', '#84cc16', '#facc15', '#f97316', '#ef4444']

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 10))
  }, [center, map])

  return null
}

function HeatLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return
    const layer = (L as any).heatLayer(points, {
      radius: 20,
      blur: 18,
      maxZoom: 16,
      minOpacity: 0.45,
      gradient: {
        0.0: '#2dd4bf',
        0.25: '#84cc16',
        0.55: '#facc15',
        0.8: '#f97316',
        1.0: '#ef4444',
      },
    })
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map, points])

  return null
}

export default function RiskMap() {
  const {
    location,
    setLocation,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    locateMe,
    presets,
  } = useLocationContext()

  const [selectedPreset, setSelectedPreset] = useState('Pune')

  const heatPoints = useMemo<Array<[number, number, number]>>(
    () => [
      [location.lat + 0.02, location.lon + 0.015, 0.28],
      [location.lat + 0.04, location.lon - 0.005, 0.42],
      [location.lat + 0.018, location.lon + 0.02, 0.6],
      [location.lat - 0.03, location.lon + 0.01, 0.82],
      [location.lat - 0.02, location.lon - 0.03, 0.5],
      [location.lat + 0.01, location.lon - 0.015, 0.72],
    ],
    [location.lat, location.lon],
  )

  return (
    <div className="w-full max-w-[360px] mx-auto">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 mb-3 shadow-lg">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-2 py-2 mb-2">
          <Search className="h-4 w-4 text-lime" aria-hidden="true" />
          <input
            aria-label="Search location"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search city..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
          {isSearching && <span className="text-[10px] uppercase tracking-wide text-lime">Searching…</span>}
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSelectedPreset(preset.label)
                setSearchQuery('')
                setLocation({
                  lat: preset.lat,
                  lon: preset.lon,
                  label: preset.label,
                  source: 'preset',
                })
              }}
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                selectedPreset === preset.label
                  ? 'border-lime bg-lime/10 text-lime'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 max-h-32 overflow-auto rounded-xl border border-white/10 bg-slate-950/80 p-2 text-xs text-slate-200">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setLocation({
                    lat: result.latitude,
                    lon: result.longitude,
                    label: result.name,
                    source: 'search',
                  })
                }}
                className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
              >
                <span className="font-semibold text-white">{result.name}</span>
                <span className="block text-slate-400">
                  {result.admin1 || result.country || 'Location'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        <MapContainer
          center={[location.lat, location.lon]}
          zoom={10}
          scrollWheelZoom
          className="h-[420px] w-full"
          style={{ width: '100%', minWidth: '320px', maxWidth: '360px' }}
        >
          <MapFocus center={[location.lat, location.lon]} />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Carto dark">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Esri satellite">
              <TileLayer
                attribution='Tiles &copy; Esri'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay checked name="Risk heat">
              <HeatLayer points={heatPoints} />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Rain radar">
              <TileLayer
                attribution='RainViewer'
                url="https://tilecache.rainviewer.com/v2/radar/1700000000/256/{z}/{x}/{y}/2/1_0.png"
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="NDVI">
              <TileLayer
                attribution='NASA GIBS'
                url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_8Day/default/2024-01-01/EPSG3857/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
              />
            </LayersControl.Overlay>
          </LayersControl>

          <Marker position={[location.lat, location.lon]} icon={L.divIcon({
            className: 'risk-map-marker',
            html: '<div class="risk-pulse-marker"><span class="inner"></span></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}>
            <Popup>
              <div className="text-sm font-medium text-slate-900">
                <div className="font-bold">{location.label}</div>
                <div className="text-xs text-slate-600">
                  {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        <button
          type="button"
          onClick={() => void locateMe()}
          className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur"
        >
          <LocateFixed className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
          Locate me
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-300">
        <span>Low</span>
        <div className="flex gap-1">
          {heatGradient.map((color) => (
            <span key={color} className="h-2.5 w-8 rounded-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>High</span>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
        <MapPinned className="h-4 w-4 text-lime" aria-hidden="true" />
        <span>{location.label}</span>
      </div>
    </div>
  )
}
