'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileUp, Map as MapIcon, Plus, Search, Upload, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

type RouteRecord = {
  id: string
  public_code: string
  display_name: string
  status: string
}

type ImportPreview = {
  code: string
  name: string
  city: string
  country: string
  paths: number
  status: string
}

function parseImport(content: string): ImportPreview[] {
  const data = JSON.parse(content) as { routes?: Array<Record<string, unknown>>; features?: Array<Record<string, unknown>> }
  if (Array.isArray(data.routes)) {
    return data.routes.map((route) => ({
      code: String(route.code ?? 'RK-pendiente'),
      name: String(route.name ?? 'Ruta sin nombre'),
      city: String(route.city ?? 'Ciudad pendiente'),
      country: String(route.country_code ?? 'País pendiente'),
      paths: Array.isArray(route.directions) ? route.directions.length : 0,
      status: String(route.approval_status ?? 'pending'),
    }))
  }

  if (Array.isArray(data.features)) {
    const grouped = new Map<string, ImportPreview>()
    data.features.forEach((feature) => {
      const properties = (feature.properties ?? {}) as Record<string, unknown>
      const code = String(properties.route_code ?? 'RK-pendiente')
      const current = grouped.get(code) ?? { code, name: String(properties.route_name ?? `Ruta ${code}`), city: String(properties.city ?? 'Ciudad pendiente'), country: String(properties.country_code ?? 'País pendiente'), paths: 0, status: 'pending' }
      current.paths += 1
      grouped.set(code, current)
    })
    return [...grouped.values()]
  }

  throw new Error('El archivo debe contener routes o features GeoJSON.')
}

const statusLabel: Record<string, string> = { draft: 'Borrador', pending: 'Pendiente', pending_review: 'En revisión', approved: 'Aprobada', published: 'Publicada', inactive: 'Inactiva' }

export default function AdminRoutes() {
  const [routes, setRoutes] = useState<RouteRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([])

  useEffect(() => {
    let active = true
    async function loadRoutes() {
      const supabase = getSupabaseClient()
      if (!supabase) {
        if (active) setLoading(false)
        return
      }
      const { data } = await supabase.from('routes').select('id, public_code, display_name, status').order('updated_at', { ascending: false })
      if (active) {
        setRoutes((data as RouteRecord[] | null) ?? [])
        setLoading(false)
      }
    }
    void loadRoutes()
    return () => { active = false }
  }, [])

  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const matchesSearch = `${route.public_code} ${route.display_name}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter
    return matchesSearch && matchesStatus
  }), [routes, search, statusFilter])

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const preview = parseImport(await file.text())
      setImportPreview(preview)
      setMessage(`${preview.length} rutas listas para revisar. Todavía no se han guardado.`)
    } catch (error) {
      setImportPreview([])
      setMessage(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    }
    event.target.value = ''
  }

  const counts = { total: routes.length, pending: routes.filter((route) => ['pending', 'pending_review', 'draft'].includes(route.status)).length, published: routes.filter((route) => route.status === 'published').length }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] pb-6"><div className="flex items-center gap-4"><Link href="/admin" className="text-[#A5A5A5] transition hover:text-white"><ArrowLeft size={20} /></Link><div><p className="text-xs uppercase tracking-[0.18em] text-[#CB9546]">Panel administrador</p><h1 className="kabbure-display mt-1 text-2xl font-bold">Rutas Kabbure</h1></div></div><div className="flex gap-3"><a href="#importar" className="inline-flex items-center gap-2 rounded-xl border border-[#333333] px-4 py-2.5 text-sm font-semibold text-[#E5C76B]"><Upload size={16} /> Importar</a><button disabled className="inline-flex items-center gap-2 rounded-xl bg-[#CB9546] px-4 py-2.5 text-sm font-semibold text-black opacity-60"><Plus size={16} /> Crear ruta</button></div></header>

        <section className="grid gap-4 py-8 sm:grid-cols-3"><div className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Total catalogadas</p><p className="mt-3 text-3xl font-bold text-[#E5C76B]">{counts.total}</p></div><div className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Pendientes</p><p className="mt-3 text-3xl font-bold text-[#CB9546]">{counts.pending}</p></div><div className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Publicadas</p><p className="mt-3 text-3xl font-bold text-[#06D6A0]">{counts.published}</p></div></section>

        <section id="importar" className="scroll-mt-6 rounded-3xl border border-[#CB9546]/30 bg-[#CB9546]/10 p-6 sm:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/20 text-[#E5C76B]"><FileUp size={20} /></div><div><h2 className="font-semibold">Importar rutas públicas</h2><p className="text-sm text-[#A5A5A5]">Carga un paquete JSON o GeoJSON. El sistema leerá país, ciudad, código RK y recorridos.</p></div></div><p className="mt-4 text-xs leading-5 text-[#A5A5A5]">La importación queda en revisión. No se publica automáticamente y no depende de una ciudad o proveedor específico.</p></div><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#CB9546] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E5C76B]"><Upload size={17} /> Seleccionar archivo<input type="file" accept=".json,.geojson,application/json,application/geo+json" onChange={handleImport} className="hidden" /></label></div>{message ? <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#06D6A0]/30 bg-[#06D6A0]/10 px-4 py-3 text-sm text-[#9FF1D5]"><CheckCircle2 size={17} /> {message}</div> : null}</section>

        {importPreview.length > 0 ? <section className="mt-6 rounded-3xl border border-[#222222] bg-[#111111] p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Vista previa de importación</h2><p className="mt-1 text-sm text-[#888888]">{importPreview.length} rutas detectadas; podrás editar y aprobar en el siguiente paso.</p></div><button onClick={() => setImportPreview([])} className="text-[#888888] hover:text-white" aria-label="Cerrar vista previa"><X size={18} /></button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[#2A2A2A] text-xs uppercase tracking-[0.12em] text-[#777777]"><tr><th className="px-3 py-3">Código</th><th className="px-3 py-3">Nombre</th><th className="px-3 py-3">País</th><th className="px-3 py-3">Ciudad</th><th className="px-3 py-3">Recorridos</th><th className="px-3 py-3">Estado</th></tr></thead><tbody>{importPreview.slice(0, 100).map((route) => <tr key={`${route.code}-${route.name}`} className="border-b border-[#1D1D1D]"><td className="px-3 py-3 font-semibold text-[#E5C76B]">{route.code}</td><td className="px-3 py-3 text-white">{route.name}</td><td className="px-3 py-3 text-[#A5A5A5]">{route.country}</td><td className="px-3 py-3 text-[#A5A5A5]">{route.city}</td><td className="px-3 py-3 text-[#A5A5A5]">{route.paths}</td><td className="px-3 py-3 text-[#CB9546]">Pendiente</td></tr>)}</tbody></table></div></section> : null}

        <section className="mt-8 rounded-3xl border border-[#222222] bg-[#111111] p-6 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Catálogo de rutas</h2><p className="mt-1 text-sm text-[#888888]">Administra rutas públicas con códigos propios de Kabbure.</p></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-[#777777]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar RK..." className="kabbure-input w-full pl-9 sm:w-64" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="kabbure-input sm:w-48"><option value="all">Todos los estados</option><option value="draft">Borradores</option><option value="pending_review">En revisión</option><option value="approved">Aprobadas</option><option value="published">Publicadas</option></select></div></div>{loading ? <p className="py-12 text-center text-sm text-[#888888]">Cargando rutas...</p> : filteredRoutes.length === 0 ? <div className="py-12 text-center"><MapIcon className="mx-auto text-[#555555]" size={30} /><p className="mt-4 text-sm text-[#888888]">No hay rutas guardadas todavía. Importa un archivo para preparar el catálogo.</p></div> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-[#2A2A2A] text-xs uppercase tracking-[0.12em] text-[#777777]"><tr><th className="px-3 py-3">Código</th><th className="px-3 py-3">Ruta</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Acción</th></tr></thead><tbody>{filteredRoutes.map((route) => <tr key={route.id} className="border-b border-[#1D1D1D]"><td className="px-3 py-4 font-semibold text-[#E5C76B]">{route.public_code}</td><td className="px-3 py-4 text-white">{route.display_name}</td><td className="px-3 py-4"><span className="rounded-full bg-[#CB9546]/10 px-2.5 py-1 text-xs text-[#E5C76B]">{statusLabel[route.status] ?? route.status}</span></td><td className="px-3 py-4 text-right"><button disabled className="text-xs font-semibold text-[#777777]">Editar próximamente</button></td></tr>)}</tbody></table></div>}</section>
      </div>
    </main>
  )
}
