import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const MAX_RADIUS_METERS = 5_000

type PublicRouteRow = {
  route_id: string
  public_code: string
  display_name: string
  path_code: 'A' | 'B'
  geometry: { coordinates?: unknown } | null
}

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function geometryPoints(geometry: PublicRouteRow['geometry']): [number, number][] {
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : []
  return coordinates.flatMap((point) => Array.isArray(point) && point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number' ? [[point[1], point[0]] as [number, number]] : [])
}

function distanceToPathMeters(points: [number, number][], latitude: number, longitude: number) {
  const latitudeScale = 110_540
  const longitudeScale = 111_320 * Math.cos((latitude * Math.PI) / 180)
  const projected = points.map(([lat, lng]) => [(lng - longitude) * longitudeScale, (lat - latitude) * latitudeScale] as [number, number])
  let minimum = Number.POSITIVE_INFINITY

  for (let index = 0; index < projected.length; index += 1) {
    const [x, y] = projected[index]
    if (index === 0) {
      minimum = Math.min(minimum, Math.hypot(x, y))
      continue
    }
    const [x2, y2] = projected[index - 1]
    const dx = x - x2
    const dy = y - y2
    const lengthSquared = dx * dx + dy * dy
    const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(x2 * dx + y2 * dy) / lengthSquared))
    minimum = Math.min(minimum, Math.hypot(x2 + projection * dx, y2 + projection * dy))
  }

  return minimum
}

async function publishedRoutes(latitude: number, longitude: number, radiusMeters: number) {
  const supabase = getSupabaseClient()
  if (!supabase) return []
  const { data, error } = await supabase.from('published_route_paths').select('route_id, public_code, display_name, path_code, geometry')
  if (error || !data) return []
  return (data as PublicRouteRow[])
    .map((route) => ({
      id: `kabbure-${route.route_id}-${route.path_code}`,
      name: route.display_name,
      code: route.public_code,
      network: `Recorrido ${route.path_code}`,
      geometry: geometryPoints(route.geometry),
      source: 'kabbure' as const,
      updatedAt: new Date().toISOString(),
    }))
    .filter((route) => route.geometry.length > 1 && distanceToPathMeters(route.geometry, latitude, longitude) <= radiusMeters)
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function fallbackOpenStreetMap(latitude: number, longitude: number, radius: number) {
  const query = `[out:json][timeout:20];relation[route=bus](around:${radius},${latitude},${longitude});out body geom;`
  const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json', 'User-Agent': 'Kabbure/0.1 (mobility information)' }, next: { revalidate: 300 } })
  if (!response.ok) throw new Error('La fuente de rutas no respondió.')
  const payload = (await response.json()) as { elements?: Array<{ id: number; tags?: Record<string, string>; members?: Array<{ type: string; geometry?: Array<{ lat: number; lon: number }> }> }> }
  return (payload.elements ?? []).map((relation) => {
    const tags = relation.tags ?? {}
    const geometry = (relation.members ?? []).flatMap((member) => member.type === 'way' && member.geometry ? member.geometry.map((point) => [point.lat, point.lon] as [number, number]) : [])
    const code = tags.ref || tags.route_ref || ''
    const rawName = tags.name || (code ? `Ruta ${code}` : 'Ruta de autobús')
    return { id: `osm-${relation.id}`, name: rawName.replace(/^l[ií]nea\s+/i, 'Ruta '), code, network: tags.network || null, geometry, source: 'openstreetmap' as const, updatedAt: new Date().toISOString() }
  }).filter((route) => route.geometry.length > 1).sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latitude = numberParam(searchParams.get('lat'), 20)
  const longitude = numberParam(searchParams.get('lng'), 0)
  const requestedRadius = numberParam(searchParams.get('radius'), 2_500)
  const radius = Math.min(Math.max(requestedRadius, 10), MAX_RADIUS_METERS)
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 400 })

  try {
    const kabbureRoutes = await publishedRoutes(latitude, longitude, radius)
    if (kabbureRoutes.length) return NextResponse.json({ routes: kabbureRoutes, source: 'Kabbure' })
    if (radius < 1_000) return NextResponse.json({ routes: [], source: 'Kabbure' })
    const routes = await fallbackOpenStreetMap(latitude, longitude, radius)
    return NextResponse.json({ routes, source: 'OpenStreetMap / Overpass API' })
  } catch (error) {
    console.error('Route query failed:', error)
    return NextResponse.json({ error: 'No se pudieron consultar las rutas.' }, { status: 502 })
  }
}
