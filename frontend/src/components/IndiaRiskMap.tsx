import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet'
import { MapPin, Navigation, Info } from 'lucide-react'
import { useLocationContext } from './LocationProvider'
import type { CityData } from '../data/cities'

// Fix standard Leaflet default icon issues in bundled React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 8), { duration: 1.2 })
  }, [center, map])
  return null
}

function createMarkerIcon(isSelected: boolean, isCore: boolean) {
  const color = isSelected ? '#E45B62' : isCore ? '#2784D8' : '#16A6A3'
  const size = isSelected ? 18 : 13

  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2.5px solid white;
        border-radius: 50%;
        box-shadow: 0 0 ${isSelected ? '12px #E45B62' : '6px rgba(0,0,0,0.3)'};
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

interface IndiaRiskMapProps {
  selectedHazard?: string
}

export default function IndiaRiskMap({ selectedHazard = 'flood' }: IndiaRiskMapProps) {
  const { location, selectCity, cities, currentCity } = useLocationContext()

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-[22px] border border-[#B9D9F5] shadow-inner bg-[#EDF7FF]">
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <MapCenterController center={[location.lat, location.lon]} />

        {/* Clean Carto / OpenStreetMap Base Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* City Markers across India */}
        {cities.map((city: CityData) => {
          const isSelected = currentCity?.id === city.id
          const isCore = ['mumbai', 'pune', 'nashik'].includes(city.id)
          const icon = createMarkerIcon(isSelected, isCore)

          return (
            <Marker
              key={city.id}
              position={[city.lat, city.lon]}
              icon={icon}
              eventHandlers={{
                click: () => selectCity(city.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs font-bold text-[#20364D]">
                  {city.name} ({city.state})
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1 space-y-1.5 text-xs text-[#20364D] min-w-[160px]">
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
                    <span className="font-extrabold text-sm text-[#2784D8]">{city.name}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                      {city.state}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600">
                    Coords: {city.lat.toFixed(2)}°N, {city.lon.toFixed(2)}°E
                  </p>

                  {city.rivers.length > 0 && (
                    <div className="text-[10px] text-gray-700">
                      <span className="font-bold">Water Body:</span> {city.rivers[0].station} ({city.rivers[0].river})
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => selectCity(city.id)}
                    className="mt-1 w-full rounded-lg bg-[#2784D8] px-2 py-1 text-center text-[11px] font-bold text-white hover:bg-[#1c6bb5] transition"
                  >
                    {isSelected ? '✓ Active City' : 'Select City for Dashboard'}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Floating Map Legend & Help Note */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2 rounded-2xl border border-[#B9D9F5] bg-[#F0F8FF]/95 p-2 shadow-md backdrop-blur-sm text-[10px] font-bold text-[#20364D]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E45B62] ring-2 ring-red-200 animate-pulse" />
          <span>Active City</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2784D8]" />
          <span>Compulsory Hubs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#16A6A3]" />
          <span>Indian Cities (50+)</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-[400] rounded-xl border border-[#B9D9F5] bg-[#F0F8FF]/90 px-2 py-1 text-[10px] font-bold text-[#5B7188] shadow-sm">
        Click any marker to switch telemetry
      </div>
    </div>
  )
}
