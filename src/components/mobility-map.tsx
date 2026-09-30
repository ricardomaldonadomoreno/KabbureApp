'use client'

import { useEffect } from 'react'
import { MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { MapRoute } from '@/types/mobility'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type MobilityMapProps = {
  center: [number, number]
  userLocation: [number, number] | null
  routes: MapRoute[]
  selectedRouteId: string | null
  onRouteSelect: (routeId: string) => void
}

function MapViewport({ center, userLocation }: Pick<MobilityMapProps, 'center' | 'userLocation'>) {
  const map = useMap()

  useEffect(() => {
    map.flyTo(userLocation ?? center, userLocation ? 14 : 12, { duration: 0.8 })
  }, [center, map, userLocation])

  return null
}

function LocationMarker({ position }: { position: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    const marker = L.circleMarker(position, {
      radius: 8,
      color: '#000000',
      weight: 3,
      fillColor: '#06D6A0',
      fillOpacity: 1,
    }).addTo(map)

    return () => {
      marker.remove()
    }
  }, [map, position])

  return null
}

export default function MobilityMap({
  center,
  userLocation,
  routes,
  selectedRouteId,
  onRouteSelect,
}: MobilityMapProps) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full min-h-[560px] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} userLocation={userLocation} />
      {userLocation ? <LocationMarker position={userLocation} /> : null}
      {routes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.geometry}
          pathOptions={{
            color: selectedRouteId === route.id ? '#E5C76B' : '#CB9546',
            weight: selectedRouteId === route.id ? 7 : 4,
            opacity: selectedRouteId === route.id ? 1 : 0.78,
          }}
          eventHandlers={{ click: () => onRouteSelect(route.id) }}
        />
      ))}
    </MapContainer>
  )
}
