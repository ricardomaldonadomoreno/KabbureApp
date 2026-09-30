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
  onMapMove: (center: [number, number], zoom: number) => void
}

function MapViewport({ center, userLocation, onMapMove }: Pick<MobilityMapProps, 'center' | 'userLocation' | 'onMapMove'>) {
  const map = useMap()

  useEffect(() => {
    if (userLocation) map.flyTo(userLocation, 14, { duration: 0.8 })
  }, [map, userLocation])

  useEffect(() => {
    const handleMoveEnd = () => {
      const mapCenter = map.getCenter()
      onMapMove([mapCenter.lat, mapCenter.lng], map.getZoom())
    }

    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onMapMove])

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
  onMapMove,
}: MobilityMapProps) {
  return (
    <MapContainer center={center} zoom={2} scrollWheelZoom className="h-full min-h-[560px] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} userLocation={userLocation} onMapMove={onMapMove} />
      {userLocation ? <LocationMarker position={userLocation} /> : null}
      {routes.map((route) => (
        <>
          {selectedRouteId === route.id ? <Polyline key={`${route.id}-outline`} positions={route.geometry} pathOptions={{ color: '#FFFFFF', weight: 11, opacity: 0.95 }} eventHandlers={{ click: () => onRouteSelect(route.id) }} /> : null}
          <Polyline key={route.id} positions={route.geometry} pathOptions={{ color: selectedRouteId === route.id ? '#CB9546' : '#CB9546', weight: selectedRouteId === route.id ? 6 : 4, opacity: selectedRouteId === route.id ? 1 : 0.68 }} eventHandlers={{ click: () => onRouteSelect(route.id) }} />
        </>
      ))}
    </MapContainer>
  )
}
