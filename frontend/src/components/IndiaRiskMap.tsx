import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const color = isSelected ? '#F06470' : isCore ? '#25C5DC' : '#2389D7'
  const size = isSelected ? 20 : 14

  return L.divIcon({
    className: 'custom-city-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2.5px solid #071A33;
        border-radius: 50%;
        box-shadow: 0 0 ${isSelected ? '14px #F06470' : '8px #25C5DC'};
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
  const { t } = useTranslation()
  const { location, selectCity, cities, currentCity } = useLocationContext()

  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-3xl border border-[#285274] shadow-2xl bg-[#071A33]">
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <MapCenterController center={[location.lat, location.lon]} />

        {/* High-Contrast Navy/Dark Base Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-xs font-bold text-white bg-[#071A33] px-2 py-1 rounded border border-[#285274]">
                  {city.name} ({city.state})
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1 space-y-1.5 text-xs text-white min-w-[160px] bg-[#0E2B49] rounded-xl">
                  <div className="flex items-center justify-between gap-2 border-b border-[#285274] pb-1">
                    <span className="font-extrabold text-sm text-[#25C5DC]">{city.name}</span>
                    <span className="text-[10px] bg-[#102F50] text-[#8ED8F5] px-1.5 py-0.5 rounded font-bold border border-[#285274]">
                      {city.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#B6C9DC]">
                    {t('common.coordinates', 'Coordinates')}: {city.lat.toFixed(2)}°N, {city.lon.toFixed(2)}°E
                  </div>
                  {city.rivers.length > 0 && (
                    <div className="text-[11px] text-[#8ED8F5]">
                      {t('common.catchment', 'Catchment')}: {city.rivers.map((r) => r.river).join(', ')}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => selectCity(city.id)}
                    className="w-full mt-2 rounded-lg bg-[#2389D7] hover:bg-[#25C5DC] hover:text-[#071A33] py-1 text-center font-bold text-white transition text-[11px]"
                  >
                    {t('common.selectCity', 'Select City')}
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Floating Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-2xl border border-[#285274] bg-[#0E2B49]/90 px-3 py-2 shadow-lg backdrop-blur-md text-[10px] text-[#F3F8FF] space-y-1">
        <div className="font-bold uppercase tracking-wider text-[#25C5DC] flex items-center gap-1.5">
          <Navigation className="h-3 w-3" />
          <span>{t('common.monitoringGrid', 'India Monitoring Grid')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F06470] border border-[#071A33]" />
            <span className="text-[#B6C9DC]">{t('common.selected', 'Selected')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#25C5DC] border border-[#071A33]" />
            <span className="text-[#B6C9DC]">{t('common.compulsoryCore', 'Compulsory Core')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#2389D7] border border-[#071A33]" />
            <span className="text-[#B6C9DC]">{t('common.monitoredNode', 'Monitored Node')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
