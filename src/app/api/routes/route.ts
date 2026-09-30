import { NextRequest, NextResponse } from 'next/server'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const MAX_RADIUS_METERS = 5_000

function numberParam(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latitude = numberParam(searchParams.get('lat'), 20)
  const longitude = numberParam(searchParams.get('lng'), 0)
  const requestedRadius = numberParam(searchParams.get('radius'), 2_500)
  const radius = Math.min(Math.max(requestedRadius, 1_000), MAX_RADIUS_METERS)

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 400 })
  }

  const query = `[out:json][timeout:20];relation[route=bus](around:${radius},${latitude},${longitude});out body geom;`

  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Kabbure/0.1 (mobility information)',
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'La fuente de rutas no respondió.' }, { status: 502 })
    }

    const payload = (await response.json()) as {
      elements?: Array<{
        id: number
        tags?: Record<string, string>
        members?: Array<{ type: string; geometry?: Array<{ lat: number; lon: number }> }>
      }>
    }

    const routes = (payload.elements ?? [])
      .map((relation) => {
        const tags = relation.tags ?? {}
        const geometry = (relation.members ?? []).flatMap((member) =>
          member.type === 'way' && member.geometry
            ? member.geometry.map((point) => [point.lat, point.lon] as [number, number])
            : [],
        )
        const code = tags.ref || tags.route_ref || ''
        const rawName = tags.name || (code ? `Ruta ${code}` : 'Ruta de autobús')
        const name = rawName.replace(/^l[ií]nea\s+/i, 'Ruta ')

        return {
          id: `osm-${relation.id}`,
          name,
          code,
          network: tags.network || null,
          geometry,
          source: 'openstreetmap' as const,
          updatedAt: new Date().toISOString(),
        }
      })
      .filter((route) => route.geometry.length > 1)
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ routes, source: 'OpenStreetMap / Overpass API' })
  } catch (error) {
    console.error('OpenStreetMap route query failed:', error)
    return NextResponse.json({ error: 'No se pudo consultar OpenStreetMap.' }, { status: 502 })
  }
}
