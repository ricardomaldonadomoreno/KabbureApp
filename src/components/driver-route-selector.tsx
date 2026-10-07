'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { BusFront, CheckCircle2, Crosshair, LoaderCircle, MapPin, X } from 'lucide-react'
import type { MapRoute } from '@/types/mobility'
import { getSupabaseClient } from '@/lib/supabase/client'
import HomeMapControls from '@/components/home-map-controls'

const MobilityMap = dynamic(() => import('@/components/mobility-map'), { ssr: false })

const DEFAULT_CENTER: [number, number] = [20, 0]
const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'indefinite', label: 'Indefinido' },
] as const

type PeriodType = (typeof PERIOD_OPTIONS)[number]['value']

type DriverRouteSelectorProps = {
  driverUserId: string
  onClose: () => void
  onJoined: (route: MapRoute, periodType: PeriodType, endedAt: string | null) => void
}

function routeGroupId(route: MapRoute) {
  return route.source === 'kabbure' ? route.id.replace(/^kabbure-/, '').replace(/-[AB]$/, '') : route.id
}

function periodEnd(start: Date, periodType: PeriodType) {
  const end = new Date(start)
  if (periodType === 'daily') end.setDate(end.getDate() + 1)
  if (periodType === 'weekly') end.setDate(end.getDate() + 7)
  if (periodType === 'monthly') end.setMonth(end.getMonth() + 1)
  return periodType === 'indefinite' ? null : end.toISOString()
}

export default function DriverRouteSelector({ driverUserId, onClose, onJoined }: DriverRouteSelectorProps) {
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapPoint, setMapPoint] = useState<[number, number] | null>(null)
  const [routes, setRoutes] = useState<MapRoute[]>([])
  const [nearbyRadius, setNearbyRadius] = useState(900)
  const [search, setSearch] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [visibleRouteIds, setVisibleRouteIds] = useState<Set<string>>(new Set())
  const [periodType, setPeriodType] = useState<PeriodType>('indefinite')
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const uniqueRoutes = useMemo(() => {
    const grouped = new Map<string, MapRoute>()
    routes.forEach((route) => {
      if (!grouped.has(routeGroupId(route))) grouped.set(routeGroupId(route), route)
    })
    const normalizedSearch = search.trim().toLowerCase()
    return Array.from(grouped.values()).filter((route) => !normalizedSearch || `${route.name} ${route.code}`.toLowerCase().includes(normalizedSearch))
  }, [routes, search])

  const visibleRoutes = useMemo(() => routes.filter((route) => visibleRouteIds.has(route.id)), [routes, visibleRouteIds])
  const selectedRoute = uniqueRoutes.find((route) => routeGroupId(route) === selectedRouteId) ?? null

  async function fetchRoutes(position: [number, number], radius = nearbyRadius) {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const response = await fetch(`/api/routes?lat=${position[0]}&lng=${position[1]}&radius=${radius}`)
      const data = (await response.json()) as { routes?: MapRoute[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudieron consultar las rutas.')
      setRoutes((data.routes ?? []).filter((route) => route.source === 'kabbure'))
      setVisibleRouteIds(new Set())
      setSelectedRouteId(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron consultar las rutas.')
    } finally {
      setLoading(false)
    }
  }

  function searchNearby() {
    const point = mapPoint ?? userLocation
    if (point) void fetchRoutes(point)
  }

  function updateLocation() {
    if (!navigator.geolocation) {
      setErrorMessage('Este navegador no permite consultar tu ubicación.')
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point: [number, number] = [coords.latitude, coords.longitude]
        setUserLocation(point)
        setMapPoint(null)
        setCenter(point)
        setLocationLoading(false)
        void fetchRoutes(point)
      },
      () => {
        setLocationLoading(false)
        setErrorMessage('No fue posible obtener tu ubicación. También puedes hacer clic en el mapa.')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  function handleMapPick(point: [number, number]) {
    setMapPoint(point)
    setUserLocation(null)
    setCenter(point)
    void fetchRoutes(point)
  }

  function toggleRoute(route: MapRoute) {
    const groupId = routeGroupId(route)
    const ids = routes.filter((item) => routeGroupId(item) === groupId).map((item) => item.id)
    setVisibleRouteIds((current) => {
      const next = new Set(current)
      if (ids.every((id) => next.has(id))) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
    setSelectedRouteId(groupId)
  }

  function showAllRoutes() {
    setVisibleRouteIds(new Set(routes.map((route) => route.id)))
  }

  function clearMap() {
    setVisibleRouteIds(new Set())
    setSelectedRouteId(null)
  }

  async function joinSelectedRoute() {
    if (!selectedRoute) return
    const supabase = getSupabaseClient()
    if (!supabase) {
      setErrorMessage('Supabase no está disponible en este deployment.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    const startedAt = new Date()
    const endedAt = periodEnd(startedAt, periodType)

    try {
      const { error: closeError } = await supabase
        .from('driver_route_assignments')
        .update({ status: 'ended', ended_at: startedAt.toISOString() })
        .eq('driver_user_id', driverUserId)
        .eq('status', 'active')

      if (closeError) throw closeError

      const { error: insertError } = await supabase.from('driver_route_assignments').insert({
        driver_user_id: driverUserId,
        route_id: routeGroupId(selectedRoute),
        period_type: periodType,
        status: 'active',
        started_at: startedAt.toISOString(),
        ended_at: endedAt,
      })

      if (insertError) throw insertError
      setSuccessMessage(`Ahora estás asociado a ${selectedRoute.code || selectedRoute.name}.`)
      onJoined(selectedRoute, periodType, endedAt)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar la ruta de trabajo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-[#CB9546]/30 bg-[#111111] shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-4 border-b border-[#222222] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><BusFront size={20} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#CB9546]">Elegir ruta de trabajo</p><h2 className="mt-1 font-semibold">Encuentra una ruta publicada</h2><p className="mt-1 text-sm text-[#888888]">Selecciona la ruta completa; sus direcciones A y B se mantienen dentro de ella.</p></div>
        </div>
        <button onClick={onClose} className="inline-flex items-center gap-2 self-start text-sm text-[#A5A5A5] hover:text-white"><X size={17} /> Cerrar selector</button>
      </div>

      <div className="border-b border-[#222222] bg-[#0D0D0D] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={updateLocation} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#CB9546] px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#E5C76B]"><Crosshair size={17} /> {locationLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación'}</button>
          <p className="flex items-center gap-2 text-xs leading-5 text-[#888888]"><MapPin size={14} className="shrink-0 text-[#E5C76B]" /> También puedes hacer clic directamente en el mapa.</p>
        </div>
        <div className="mt-4"><HomeMapControls nearbyRadius={nearbyRadius} onRadiusChange={setNearbyRadius} onShowAll={showAllRoutes} onClearMap={clearMap} search={search} onSearchChange={setSearch} onSearchNearby={searchNearby} nearbySearchDisabled={!mapPoint && !userLocation} /></div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="relative min-h-[420px] bg-[#d9d3c5] sm:min-h-[500px] lg:min-h-[560px]">
          <MobilityMap center={center} userLocation={userLocation} mapPoint={mapPoint} routes={visibleRoutes} selectedRouteId={null} onRouteSelect={(routeId) => setSelectedRouteId(routeGroupId(routes.find((route) => route.id === routeId) ?? routes[0]))} onMapMove={setCenter} onMapPick={handleMapPick} />
          <div className="absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-lg border border-[#CB9546]/50 bg-black/85 px-3 py-2 text-xs text-[#E5C76B] shadow-lg backdrop-blur-sm">Elige una ruta cercana para trabajar</div>
        </div>

        <aside className="border-t border-[#222222] lg:border-l lg:border-t-0">
          <div className="border-b border-[#222222] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888888]">Rutas publicadas</p><p className="mt-1 text-sm text-[#B7B7B7]">Únete a una ruta completa, no a una dirección individual.</p></div>
          <div className="border-b border-[#222222] bg-[#CB9546]/5 p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#CB9546]">1. Periodo de trabajo</p><p className="mt-2 text-sm text-[#B7B7B7]">Define primero cuánto tiempo quieres mantener tu ruta activa.</p><select value={periodType} onChange={(event) => setPeriodType(event.target.value as PeriodType)} className="kabbure-input mt-3"><option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="indefinite">Indefinido</option></select></div>
          <div className="max-h-[390px] overflow-y-auto p-3 sm:max-h-[450px] lg:max-h-[500px]">
            {loading ? <div className="flex items-center gap-2 px-3 py-5 text-sm text-[#888888]"><LoaderCircle className="animate-spin" size={17} /> Consultando rutas...</div> : null}
            {!loading && errorMessage ? <div className="rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-4 text-sm leading-6 text-[#FFB0B7]">{errorMessage}</div> : null}
            {!loading && !errorMessage && uniqueRoutes.length === 0 ? <div className="px-3 py-6 text-sm leading-6 text-[#888888]">Usa tu ubicación o haz clic en el mapa para encontrar rutas Kabbure publicadas cerca.</div> : null}
            {!loading && !errorMessage ? uniqueRoutes.map((route) => {
              const groupId = routeGroupId(route)
              const isSelected = selectedRouteId === groupId
              const isVisible = routes.filter((item) => routeGroupId(item) === groupId).every((item) => visibleRouteIds.has(item.id))
              return <article key={groupId} className={`mb-2 rounded-xl border p-3 transition ${isSelected ? 'border-[#CB9546] bg-[#CB9546]/10' : 'border-[#222222] bg-black/30 hover:border-[#555555]'}`}><button onClick={() => toggleRoute(route)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><span className="font-medium text-white">{route.name}</span><span className="rounded bg-[#CB9546]/15 px-2 py-1 text-[10px] font-semibold text-[#E5C76B]">{route.code}</span></div><span className="mt-2 block text-xs text-[#888888]">Direcciones A y B · {isVisible ? 'Visible en el mapa' : 'Seleccionar esta ruta'}</span></button></article>
            }) : null}
          </div>
          <div className="border-t border-[#222222] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#CB9546]">2. Confirmar ruta</p><p className="mt-2 text-sm text-[#B7B7B7]">{selectedRoute ? `Seleccionaste ${selectedRoute.code || selectedRoute.name}.` : 'Selecciona una ruta del listado para continuar.'}</p><button onClick={joinSelectedRoute} disabled={!selectedRoute || loading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#CB9546] px-3 py-2.5 text-xs font-semibold text-black transition hover:bg-[#E5C76B] disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={15} /> {loading ? 'Guardando...' : 'Unirme a esta ruta'}</button></div>
          {successMessage ? <div className="border-t border-[#06D6A0]/20 bg-[#06D6A0]/10 p-4 text-sm leading-6 text-[#9AF0D4]">{successMessage}</div> : null}
        </aside>
      </div>
    </section>
  )
}
