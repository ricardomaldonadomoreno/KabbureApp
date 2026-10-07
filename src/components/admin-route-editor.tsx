'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Crosshair, MapPinned, MousePointer2, Rocket, Search } from 'lucide-react'
import { MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getSupabaseClient } from '@/lib/supabase/client'

type ImportedRoute = { id: string; public_code: string; display_name: string; country_code: string | null; city_name: string | null; review_status: string }
type ImportedPath = { id: string; import_item_id: string; path_code: 'A' | 'B'; geometry: { type?: string; coordinates?: unknown }; origin_name: string | null; destination_name: string | null }
type Point = [number, number]

function readPoints(geometry: ImportedPath['geometry']): Point[] {
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : []
  return coordinates.flatMap((point) => Array.isArray(point) && point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number' ? [[point[1], point[0]] as Point] : [])
}

function FitBounds({ paths }: { paths: ImportedPath[] }) {
  const map = useMap()
  useEffect(() => {
    const points = paths.flatMap((path) => readPoints(path.geometry))
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40] })
  }, [map, paths])
  return null
}

function MapEditor({ paths, selectedPath, editMode, onMapPoint }: { paths: ImportedPath[]; selectedPath: 'A' | 'B'; editMode: boolean; onMapPoint: (point: Point) => void }) {
  useMapEvents({ click: (event) => { if (editMode) onMapPoint([event.latlng.lat, event.latlng.lng]) } })
  return <><FitBounds paths={paths} />{paths.map((path) => <Polyline key={path.id} positions={readPoints(path.geometry)} pathOptions={{ color: path.path_code === selectedPath ? '#E5C76B' : '#6D5429', weight: path.path_code === selectedPath ? 7 : 4, opacity: path.path_code === selectedPath ? 1 : 0.6 }} />)}</>
}

export default function AdminRouteEditor() {
  const [routes, setRoutes] = useState<ImportedRoute[]>([])
  const [paths, setPaths] = useState<ImportedPath[]>([])
  const [selectedRoute, setSelectedRoute] = useState<ImportedRoute | null>(null)
  const [selectedPath, setSelectedPath] = useState<'A' | 'B'>('A')
  const [country, setCountry] = useState('all')
  const [city, setCity] = useState('all')
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('Selecciona una ruta pendiente para verla en el mapa.')

  useEffect(() => {
    let active = true
    async function loadRoutes() {
      const supabase = getSupabaseClient()
      if (!supabase) { setLoading(false); return }
      const { data } = await supabase.from('route_import_items').select('id, public_code, display_name, country_code, city_name, review_status').order('created_at', { ascending: false })
      if (active) { setRoutes((data as ImportedRoute[] | null) ?? []); setLoading(false) }
    }
    void loadRoutes()
    return () => { active = false }
  }, [])

  const countries = useMemo(() => [...new Set(routes.map((route) => route.country_code).filter(Boolean))] as string[], [routes])
  const cities = useMemo(() => [...new Set(routes.filter((route) => country === 'all' || route.country_code === country).map((route) => route.city_name).filter(Boolean))] as string[], [routes, country])
  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const textMatch = `${route.public_code} ${route.display_name}`.toLowerCase().includes(search.toLowerCase())
    return textMatch && (country === 'all' || route.country_code === country) && (city === 'all' || route.city_name === city)
  }), [routes, search, country, city])

  async function selectRoute(route: ImportedRoute) {
    setSelectedRoute(route)
    setEditMode(false)
    setMessage('Cargando recorridos A y B...')
    const supabase = getSupabaseClient()
    if (!supabase) return
    const { data, error } = await supabase.from('route_import_paths').select('id, import_item_id, path_code, geometry, origin_name, destination_name').eq('import_item_id', route.id).order('path_code')
    if (error) { setMessage(error.message); return }
    setPaths((data as ImportedPath[] | null) ?? [])
    setMessage('Ruta cargada. Activa editar para modificar puntos directamente sobre el mapa.')
  }

  function addPoint(point: Point) {
    setPaths((current) => current.map((path) => path.path_code !== selectedPath ? path : { ...path, geometry: { type: 'LineString', coordinates: [...readPoints(path.geometry).map(([lat, lng]) => [lng, lat]), [point[1], point[0]]] } }))
  }

  function removeLastPoint() {
    setPaths((current) => current.map((path) => {
      if (path.path_code !== selectedPath) return path
      const points = readPoints(path.geometry).slice(0, -1)
      return { ...path, geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) } }
    }))
  }

  async function publishRoute() {
    if (!selectedRoute || paths.length === 0) return
    const supabase = getSupabaseClient()
    if (!supabase) return
    setSaving(true)
    setMessage('Publicando ruta y recorridos...')
    try {
      const countryCode = selectedRoute.country_code?.trim().toUpperCase()
      const cityName = selectedRoute.city_name?.trim()
      if (!countryCode || countryCode.length !== 2 || !cityName) throw new Error('La ruta necesita país y ciudad antes de publicarse.')

      const { error: countryError } = await supabase.from('countries').upsert({ code: countryCode, name: countryCode, is_active: true }, { onConflict: 'code' })
      if (countryError) throw new Error(countryError.message)
      const { data: city, error: cityError } = await supabase.from('cities').upsert({ country_code: countryCode, name: cityName, is_active: true }, { onConflict: 'country_code,name' }).select('id').single()
      if (cityError || !city) throw new Error(cityError?.message ?? 'No se pudo preparar la ciudad.')

      const { data: route, error: routeError } = await supabase.from('routes').upsert({ city_id: city.id, public_code: selectedRoute.public_code, display_name: selectedRoute.display_name, status: 'published', updated_at: new Date().toISOString() }, { onConflict: 'city_id,public_code,display_name' }).select('id').single()
      if (routeError || !route) throw new Error(routeError?.message ?? 'No se pudo publicar la ruta.')

      const publicPaths = paths.map((path) => ({ route_id: route.id, path_code: path.path_code, origin_name: path.origin_name || `Origen recorrido ${path.path_code}`, destination_name: path.destination_name || `Destino recorrido ${path.path_code}`, geometry: path.geometry, status: 'published', updated_at: new Date().toISOString() }))
      const { data: savedPaths, error: pathsError } = await supabase.from('route_paths').upsert(publicPaths, { onConflict: 'route_id,path_code' }).select('id, path_code')
      if (pathsError) throw new Error(pathsError.message)

      await Promise.all(paths.map(async (path) => {
        const publicPath = savedPaths?.find((item) => item.path_code === path.path_code)
        return supabase.from('route_import_paths').update({ geometry: path.geometry, review_status: 'approved', final_path_id: publicPath?.id ?? null, updated_at: new Date().toISOString() }).eq('id', path.id)
      }))
      const { error: itemError } = await supabase.from('route_import_items').update({ review_status: 'approved', final_route_id: route.id, updated_at: new Date().toISOString() }).eq('id', selectedRoute.id)
      if (itemError) throw new Error(itemError.message)
      setRoutes((current) => current.map((item) => item.id === selectedRoute.id ? { ...item, review_status: 'approved' } : item))
      setSelectedRoute((current) => current ? { ...current, review_status: 'approved' } : current)
      setEditMode(false)
      setMessage(`${selectedRoute.public_code} fue publicada. Ya puede aparecer en el mapa público.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo publicar la ruta.')
    } finally {
      setSaving(false)
    }
  }

  const visiblePath = paths.find((path) => path.path_code === selectedPath)
  const mapCenter: [number, number] = visiblePath && readPoints(visiblePath.geometry)[0] ? readPoints(visiblePath.geometry)[0] : [0, 0]

  return <main className="min-h-screen bg-black text-white"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] px-5 py-5 sm:px-8"><div className="flex items-center gap-4"><Link href="/admin/rutas" className="text-[#A5A5A5] hover:text-white"><ArrowLeft size={20} /></Link><div><p className="text-xs uppercase tracking-[0.18em] text-[#CB9546]">Panel administrador</p><h1 className="kabbure-display mt-1 text-2xl font-bold">Editor gráfico de rutas</h1></div></div><div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#06D6A0]"><MapPinned size={16} /> Rutas públicas Kabbure</div></header>
    <div className="grid min-h-[calc(100vh-87px)] lg:grid-cols-[360px_1fr]"><aside className="border-r border-[#222222] bg-[#0B0B0B] p-5 sm:p-6"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#CB9546]"><Crosshair size={15} /> Ubicación</div><div className="mt-4 grid gap-3"><select value={country} onChange={(event) => { setCountry(event.target.value); setCity('all') }} className="kabbure-input"><option value="all">Todos los países</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={city} onChange={(event) => setCity(event.target.value)} className="kabbure-input"><option value="all">Todas las ciudades</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="relative"><Search size={16} className="absolute left-3 top-3 text-[#777777]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar RK..." className="kabbure-input pl-9" /></label></div><div className="mt-7 flex items-center justify-between"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Rutas en revisión</p><span className="rounded-full bg-[#CB9546]/15 px-2 py-1 text-xs text-[#E5C76B]">{filteredRoutes.length}</span></div><div className="mt-3 max-h-[calc(100vh-330px)] space-y-2 overflow-y-auto pr-1">{loading ? <p className="py-8 text-sm text-[#777777]">Cargando rutas...</p> : filteredRoutes.map((route) => <button key={route.id} onClick={() => void selectRoute(route)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedRoute?.id === route.id ? 'border-[#CB9546] bg-[#CB9546]/10' : 'border-[#222222] bg-[#111111] hover:border-[#555555]'}`}><div className="flex items-center justify-between gap-2"><span className="font-semibold text-[#E5C76B]">{route.public_code}</span><span className="text-[10px] uppercase tracking-[0.12em] text-[#CB9546]">{route.review_status === 'pending_review' ? 'Pendiente' : route.review_status}</span></div><p className="mt-2 text-sm text-white">{route.display_name}</p><p className="mt-1 text-xs text-[#777777]">{route.country_code ?? 'País'} · {route.city_name ?? 'Ciudad'}</p></button>)}</div></aside><section className="relative min-h-[640px] bg-[#151515]"><MapContainer center={mapCenter} zoom={2} scrollWheelZoom className="h-full min-h-[640px] w-full"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{paths.length ? <MapEditor paths={paths} selectedPath={selectedPath} editMode={editMode} onMapPoint={addPoint} /> : null}</MapContainer><div className="absolute left-5 right-5 top-5 z-[1000] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#333333] bg-[#080808]/95 p-4 shadow-xl"><div><p className="text-xs uppercase tracking-[0.15em] text-[#CB9546]">Mapa de edición</p><p className="mt-1 text-sm text-[#A5A5A5]">{selectedRoute ? `${selectedRoute.public_code} · ${selectedRoute.display_name}` : 'Selecciona una ruta de la lista'}</p></div>{selectedRoute ? <div className="flex flex-wrap items-center gap-2"><button onClick={() => setSelectedPath('A')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedPath === 'A' ? 'bg-[#CB9546] text-black' : 'border border-[#333333] text-[#A5A5A5]'}`}>Recorrido A</button><button onClick={() => setSelectedPath('B')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedPath === 'B' ? 'bg-[#CB9546] text-black' : 'border border-[#333333] text-[#A5A5A5]'}`}>Recorrido B</button><button onClick={() => setEditMode((value) => !value)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${editMode ? 'bg-[#E5C76B] text-black' : 'border border-[#333333] text-white'}`}><MousePointer2 size={14} /> {editMode ? 'Editando' : 'Editar mapa'}</button><button onClick={removeLastPoint} disabled={!editMode || !visiblePath || readPoints(visiblePath.geometry).length === 0} className="rounded-lg border border-[#333333] px-3 py-2 text-xs text-[#A5A5A5] disabled:opacity-40">Quitar último</button><button onClick={() => void publishRoute()} disabled={saving || !visiblePath} className="inline-flex items-center gap-2 rounded-lg bg-[#06D6A0] px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"><Rocket size={14} /> {saving ? 'Publicando' : 'Guardar y publicar'}</button></div> : null}</div><div className="absolute bottom-5 left-5 z-[1000] max-w-sm rounded-xl border border-[#333333] bg-[#080808]/90 px-4 py-3 text-xs leading-5 text-[#A5A5A5]">{editMode ? 'Haz clic sobre el mapa para añadir puntos al recorrido seleccionado.' : message}</div></section></div></main>
}
