'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BusFront,
  Check,
  Crosshair,
  LoaderCircle,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import type { MapRoute } from '@/types/mobility'
import HomeMapControls from '@/components/home-map-controls'

const MobilityMap = dynamic(() => import('@/components/mobility-map'), { ssr: false })

const DEFAULT_CENTER: [number, number] = [20, 0]

type LocationStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error'

function getRouteGroupId(route: MapRoute) {
  return route.source === 'kabbure' ? route.id.replace(/-[AB]$/, '') : route.id
}

export default function MobilityHome() {
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapPoint, setMapPoint] = useState<[number, number] | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [routes, setRoutes] = useState<MapRoute[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [nearbyRadius, setNearbyRadius] = useState(100)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [visibleRouteIds, setVisibleRouteIds] = useState<Set<string>>(new Set())
  const [driverPanelOpen, setDriverPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const fetchRoutes = useCallback(async (position: [number, number], radius = 2_500) => {
    setRoutesLoading(true)
    setRoutesError(null)

    try {
      const response = await fetch(`/api/routes?lat=${position[0]}&lng=${position[1]}&radius=${radius}`)
      const data = (await response.json()) as { routes?: MapRoute[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las rutas.')
      setRoutes(data.routes ?? [])
    } catch (error) {
      setRoutesError(error instanceof Error ? error.message : 'No se pudieron cargar las rutas.')
    } finally {
      setRoutesLoading(false)
    }
  }, [])

  const filteredRoutes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const grouped = new Map<string, MapRoute>()
    routes.forEach((route) => {
      const groupId = getRouteGroupId(route)
      if (!grouped.has(groupId)) grouped.set(groupId, route)
    })
    const uniqueRoutes = Array.from(grouped.values())
    if (!normalizedSearch) return uniqueRoutes
    return uniqueRoutes.filter((route) => `${route.name} ${route.code} ${route.network ?? ''}`.toLowerCase().includes(normalizedSearch))
  }, [routes, search])

  const visibleRoutes = useMemo(
    () => routes.filter((route) => visibleRouteIds.has(route.id)),
    [routes, visibleRouteIds],
  )

  function toggleRoute(routeId: string) {
    const selectedRoute = routes.find((route) => route.id === routeId)
    const groupId = selectedRoute ? getRouteGroupId(selectedRoute) : routeId
    const groupRouteIds = routes.filter((route) => getRouteGroupId(route) === groupId).map((route) => route.id)
    setVisibleRouteIds((current) => {
      const next = new Set(current)
      if (groupRouteIds.every((id) => next.has(id))) groupRouteIds.forEach((id) => next.delete(id))
      else groupRouteIds.forEach((id) => next.add(id))
      return next
    })
    setSelectedRouteId(routeId)
  }

  function showAllRoutes() {
    setVisibleRouteIds(new Set(routes.map((route) => route.id)))
    setSelectedRouteId(null)
  }

  function clearMap() {
    setVisibleRouteIds(new Set())
    setSelectedRouteId(null)
  }

  function isolateRoute(routeId: string) {
    const selectedRoute = routes.find((route) => route.id === routeId)
    const groupId = selectedRoute ? getRouteGroupId(selectedRoute) : routeId
    setVisibleRouteIds(new Set(routes.filter((route) => getRouteGroupId(route) === groupId).map((route) => route.id)))
    setSelectedRouteId(routeId)
  }

  function updateLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error')
      return
    }

    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextLocation: [number, number] = [coords.latitude, coords.longitude]
        setUserLocation(nextLocation)
        setMapPoint(null)
        setCenter(nextLocation)
        setLocationStatus('ready')
        void fetchRoutes(nextLocation, nearbyRadius)
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  function searchNearbyRoutes() {
    const point = mapPoint ?? userLocation
    if (point) void fetchRoutes(point, nearbyRadius)
  }

  function handleMapMove(nextCenter: [number, number]) {
    setCenter(nextCenter)
  }

  function handleMapPick(point: [number, number]) {
    setMapPoint(point)
    setUserLocation(null)
    setCenter(point)
    setSelectedRouteId(null)
    setVisibleRouteIds(new Set())
    setSearch('')
    void fetchRoutes(point, nearbyRadius)
  }

  const selectedRoute = routes.find((route) => route.id === selectedRouteId)

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="fixed inset-x-0 top-0 z-[1000] border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-5 sm:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Kabbure, inicio">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[#CB9546]/60 bg-[#111111]">
              <Image src="/assets/brand/logo.ico" alt="" width={40} height={40} priority />
            </span>
            <span>
              <span className="kabbure-display block text-xl font-bold tracking-[0.16em] text-[#E5C76B]">KABBURE</span>
              <span className="hidden text-[10px] uppercase tracking-[0.26em] text-[#888888] sm:block">Información de movilidad</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-[#B7B7B7] md:flex">
            <a className="transition hover:text-white" href="#mapa">Mapa</a>
            <a className="transition hover:text-white" href="#como-funciona">Cómo funciona</a>
            <button className="text-[#E5C76B] transition hover:text-white" onClick={() => setDriverPanelOpen(true)}>
              Ser conductor
            </button>
          </nav>

          <button className="kabbure-focus rounded-lg border border-[#222222] p-2 text-[#B7B7B7] md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Abrir menú">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="border-t border-[#222222] bg-[#111111] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm text-[#B7B7B7]">
              <a href="#mapa" onClick={() => setMenuOpen(false)}>Mapa</a>
              <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
              <button className="text-left text-[#E5C76B]" onClick={() => { setMenuOpen(false); setDriverPanelOpen(true) }}>Ser conductor</button>
            </div>
          </nav>
        ) : null}
      </header>

      <section id="inicio" className="mx-auto max-w-[1600px] px-5 pb-10 pt-32 sm:px-8 lg:pb-14 lg:pt-40">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#CB9546]/40 bg-[#CB9546]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#E5C76B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#06D6A0]" /> Movilidad visible
            </div>
            <h1 className="kabbure-display max-w-2xl text-5xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-7xl">
              Mira cómo se mueve <span className="text-[#CB9546]">tu ciudad.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#A5A5A5] sm:text-lg">
              Consulta rutas existentes y descubre la actividad de vehículos que comparten su ubicación en tiempo real.
              Kabbure informa; no asigna viajes ni opera el transporte.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={updateLocation} className="kabbure-focus inline-flex items-center gap-2 rounded-xl bg-[#CB9546] px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-[#E5C76B]">
                {locationStatus === 'loading' ? <LoaderCircle className="animate-spin" size={18} /> : <Crosshair size={18} />}
                {locationStatus === 'ready' ? 'Ubicación actualizada' : 'Actualizar mi ubicación'}
              </button>
              <button onClick={() => setDriverPanelOpen(true)} className="kabbure-focus inline-flex items-center gap-2 rounded-xl border border-[#CB9546] px-5 py-3.5 text-sm font-semibold text-[#E5C76B] transition hover:bg-[#CB9546] hover:text-black">
                Publicar como conductor <ArrowRight size={17} />
              </button>
            </div>
            {locationStatus === 'denied' ? <p className="mt-3 flex items-center gap-2 text-xs text-[#E5C76B]"><AlertCircle size={14} /> Permite la ubicación del navegador para buscar rutas cercanas.</p> : null}
            {locationStatus === 'error' ? <p className="mt-3 flex items-center gap-2 text-xs text-[#E63946]"><AlertCircle size={14} /> No fue posible obtener tu ubicación en este momento.</p> : null}
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-[#222222] pt-5 text-sm lg:border-t-0 lg:pt-0">
            <div><p className="text-2xl font-semibold text-[#E5C76B]">{visibleRoutes.length}</p><p className="mt-1 text-[#888888]">rutas visibles</p></div>
            <div><p className="text-2xl font-semibold text-[#06D6A0]">GPS</p><p className="mt-1 text-[#888888]">en tiempo real</p></div>
            <div><p className="text-2xl font-semibold text-white">OSM</p><p className="mt-1 text-[#888888]">fuente abierta</p></div>
          </div>
        </div>
      </section>

      <section id="mapa" className="mx-auto max-w-[1600px] px-5 pb-20 sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-[#222222] bg-[#111111] shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-4 border-b border-[#222222] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><BusFront size={20} /></div>
              <div><h2 className="font-semibold">Rutas cercanas</h2><p className="text-xs text-[#888888]">Rutas públicas de Kabbure y datos abiertos</p></div>
            </div>
            <HomeMapControls nearbyRadius={nearbyRadius} onRadiusChange={setNearbyRadius} onShowAll={showAllRoutes} onClearMap={clearMap} search={search} onSearchChange={setSearch} onSearchNearby={searchNearbyRoutes} nearbySearchDisabled={!mapPoint && !userLocation} />
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="relative min-h-[560px] bg-[#d9d3c5]">
              <MobilityMap center={center} userLocation={userLocation} mapPoint={mapPoint} routes={visibleRoutes} selectedRouteId={selectedRouteId} onRouteSelect={setSelectedRouteId} onMapMove={handleMapMove} onMapPick={handleMapPick} />
              <div className="absolute left-4 top-4 z-[500] rounded-lg border border-[#CB9546]/50 bg-black/85 px-3 py-2 text-xs text-[#E5C76B] shadow-lg backdrop-blur-sm">Haz clic en el mapa para buscar rutas aquí</div><div className="absolute bottom-4 left-4 z-[500] rounded-lg bg-white/90 px-3 py-2 text-[10px] text-black shadow-lg backdrop-blur-sm">© OpenStreetMap contributors</div>
            </div>
            <aside className="border-t border-[#222222] lg:border-l lg:border-t-0">
              <div className="border-b border-[#222222] px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#888888]">Rutas</p><p className="mt-1 text-sm text-[#B7B7B7]">El mapa inicia limpio. Selecciona una ruta para mostrarla.</p></div>
              <div className="max-h-[500px] overflow-y-auto p-3">
                {routesLoading ? <div className="flex items-center gap-2 px-3 py-5 text-sm text-[#888888]"><LoaderCircle className="animate-spin" size={17} /> Consultando rutas reales...</div> : null}
                {!routesLoading && routesError ? <div className="rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-4 text-sm text-[#FF9CA5]"><AlertCircle className="mb-2" size={18} /><p>{routesError}</p><button onClick={() => void fetchRoutes(userLocation ?? DEFAULT_CENTER)} className="mt-3 font-semibold underline">Intentar de nuevo</button></div> : null}
                {!routesLoading && !routesError && filteredRoutes.length === 0 ? <div className="px-3 py-6 text-sm text-[#888888]"><MapPin className="mb-3 text-[#CB9546]" size={21} /><p className="font-medium text-[#B7B7B7]">Busca una ciudad para consultar sus rutas.</p><p className="mt-2 leading-6">Mueve el mapa a otra ciudad o país y Kabbure consultará los recorridos disponibles en esa zona.</p></div> : null}
                {!routesLoading && !routesError ? filteredRoutes.map((route) => <div key={route.id} className={`mb-2 rounded-xl border p-3 transition ${selectedRouteId === route.id ? 'border-[#CB9546] bg-[#CB9546]/10' : 'border-[#222222] bg-black/30 hover:border-[#555555]'}`}><button onClick={() => toggleRoute(route.id)} className="kabbure-focus w-full text-left"><div className="flex items-start justify-between gap-3"><span className="font-medium text-white">{route.name}</span><span className={`rounded px-2 py-1 text-[10px] font-semibold ${visibleRouteIds.has(route.id) ? 'bg-[#06D6A0]/15 text-[#06D6A0]' : 'bg-[#CB9546]/15 text-[#E5C76B]'}`}>{visibleRouteIds.has(route.id) ? 'VISIBLE' : route.code || 'BUS'}</span></div><span className="mt-2 block text-xs text-[#888888]">Fuente: {route.source === 'kabbure' ? 'Kabbure' : 'OpenStreetMap'} · {visibleRouteIds.has(route.id) ? 'Ocultar ruta' : 'Mostrar ruta'}</span></button>{visibleRouteIds.has(route.id) ? <button onClick={() => isolateRoute(route.id)} className="mt-3 text-xs font-semibold text-[#E5C76B] hover:text-white">Apartar esta ruta</button> : null}</div>) : null}
              </div>
              {selectedRoute ? <div className="border-t border-[#222222] bg-[#CB9546]/5 p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#CB9546]">Ruta seleccionada</p><h3 className="mt-2 font-semibold">{selectedRoute.name}</h3><p className="mt-2 text-xs leading-5 text-[#A5A5A5]">Este recorrido forma parte del catálogo público de Kabbure.</p></div> : null}
            </aside>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto grid max-w-[1600px] gap-8 px-5 pb-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CB9546]">Información para conductores</p><h2 className="kabbure-display mt-4 text-4xl font-bold sm:text-5xl">Tu recorrido. Tu visibilidad.</h2></div>
        <div className="flex flex-col justify-between gap-6 border-t border-[#222222] pt-6 sm:flex-row"><p className="max-w-xl leading-7 text-[#A5A5A5]">Si tienes un vehículo y realizas una ruta existente, puedes publicar voluntariamente tu actividad. Kabbure recibe tu GPS y ayuda a que más personas sepan dónde está el vehículo.</p><button onClick={() => setDriverPanelOpen(true)} className="inline-flex shrink-0 items-center gap-2 self-start text-sm font-semibold text-[#E5C76B] hover:text-white">Conocer el programa <ArrowRight size={17} /></button></div>
      </section>

      <footer className="border-t border-[#222222] bg-[#0A0A0A]">
        <div className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CB9546]">Fuentes y atribuciones</p>
            <p className="mt-4 text-sm leading-7 text-[#A5A5A5]">
              Las rutas mostradas en Kabbure provienen de fuentes públicas, datos colaborativos y recorridos incorporados al catálogo de Kabbure. Los datos geográficos abiertos pueden provenir de{' '}
              <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer" className="text-[#E5C76B] hover:text-white">OpenStreetMap</a>{' '}
              y consultarse mediante servicios como{' '}
              <a href="https://overpass-api.de/" target="_blank" rel="noreferrer" className="text-[#E5C76B] hover:text-white">Overpass API</a>. OpenStreetMap® está disponible bajo la licencia{' '}
              <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer" className="text-[#E5C76B] hover:text-white">ODbL</a>. Cuando corresponda, Kabbure también puede utilizar fuentes compatibles con el estándar{' '}
              <a href="https://gtfs.org/" target="_blank" rel="noreferrer" className="text-[#E5C76B] hover:text-white">GTFS</a>.
            </p>
            <p className="mt-4 text-sm leading-7 text-[#888888]">Kabbure es una plataforma de información y visibilidad de movilidad; no opera transporte, no asigna pasajeros y no establece tarifas.</p>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-[#222222] pt-5 text-xs text-[#666666] sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Kabbure</span>
            <span>Datos públicos y colaborativos para una movilidad más visible.</span>
          </div>
        </div>
      </footer>

      {driverPanelOpen ? <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm" onClick={() => setDriverPanelOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="driver-title" onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-[#CB9546]/40 bg-[#111111] p-6 shadow-2xl sm:inset-y-0 sm:left-auto sm:max-w-lg sm:rounded-none sm:border-l sm:border-t-0 sm:p-9"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CB9546]">Kabbure Driver</p><h2 id="driver-title" className="kabbure-display mt-3 text-4xl font-bold">Haz visible tu recorrido.</h2></div><button onClick={() => setDriverPanelOpen(false)} className="kabbure-focus rounded-lg p-2 text-[#888888] hover:bg-[#222222] hover:text-white" aria-label="Cerrar"><X size={21} /></button></div><p className="mt-5 leading-7 text-[#B7B7B7]">Kabbure ofrece herramientas tecnológicas para que publiques tu actividad mientras realizas voluntariamente un recorrido existente.</p><div className="mt-8 space-y-5">{['Registra tu vehículo y selecciona una ruta disponible.', 'Activa la transmisión GPS únicamente cuando inicies el recorrido.', 'Aparece como vehículo activo para las personas que consultan el mapa.', 'Accede a herramientas de publicación e historial básico mediante el plan Driver.'].map((item) => <div key={item} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#06D6A0]/15 text-[#06D6A0]"><Check size={15} /></span><p className="text-sm leading-6 text-[#D5D5D5]">{item}</p></div>)}</div><div className="mt-8 rounded-2xl border border-[#CB9546]/25 bg-[#CB9546]/10 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#E5C76B]" size={21} /><div><h3 className="font-semibold text-[#E5C76B]">Modelo claro</h3><p className="mt-2 text-sm leading-6 text-[#B7B7B7]">Kabbure cobra por las herramientas tecnológicas de publicación y visibilidad. No asigna pasajeros, no reserva viajes y no establece tarifas.</p></div></div></div><a href="/registro" onClick={() => setDriverPanelOpen(false)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#CB9546] px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-[#E5C76B]">Comenzar registro <ArrowRight size={17} /></a><div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#777777]"><Sparkles size={13} /> Verificación de correo antes de continuar.</div></section></div> : null}
    </main>
  )
}
