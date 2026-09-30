export type RouteStatus = 'active' | 'inactive' | 'pending'

export type MobilityRoute = {
  id: string
  name: string
  code: string
  cityId: string
  description: string | null
  geometry: GeoJSON.LineString | null
  direction: string | null
  origin: string | null
  destination: string | null
  status: RouteStatus
  sourceType: 'official' | 'organization' | 'community' | 'imported' | 'manual'
  sourceName: string | null
  lastUpdated: string | null
}

export type VehicleLocation = {
  vehicleId: string
  routeId: string
  latitude: number
  longitude: number
  accuracy: number | null
  speed: number | null
  heading: number | null
  recordedAt: string
}

export type MapRoute = {
  id: string
  name: string
  code: string
  network: string | null
  geometry: [number, number][]
  source: 'openstreetmap'
  updatedAt: string
}
