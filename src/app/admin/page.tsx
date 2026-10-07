'use client'

import Link from 'next/link'
import { ArrowRight, BusFront, FileUp, MapPinned, ShieldCheck, UsersRound } from 'lucide-react'

const cards = [
  { title: 'Rutas', description: 'Importa y recibe datos de rutas públicas con códigos RK.', href: '/admin/rutas', icon: MapPinned, accent: '#E5C76B' },
  { title: 'Editor de mapa', description: 'Selecciona país, ciudad y ruta para editar recorridos sobre el mapa.', href: '/admin/rutas/editor', icon: MapPinned, accent: '#E5C76B' },
  { title: 'Importar datos', description: 'Carga paquetes JSON o GeoJSON para preparar nuevas rutas.', href: '/admin/rutas#importar', icon: FileUp, accent: '#06D6A0' },
  { title: 'Conductores', description: 'Consulta posteriormente los conductores registrados en Kabbure.', href: '/admin', icon: UsersRound, accent: '#A5A5A5' },
]

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] pb-6"><Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[#CB9546]/60 bg-[#111111]"><img src="/assets/brand/logo.ico" alt="" className="h-10 w-10" /></span><span className="kabbure-display text-xl font-bold tracking-[0.16em] text-[#E5C76B]">KABBURE</span></Link><div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#06D6A0]"><ShieldCheck size={16} /> Panel administrador</div></header>
        <section className="pb-12 pt-12 lg:pt-16"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CB9546]">Administración</p><h1 className="kabbure-display mt-4 text-5xl font-bold">Controla la información de Kabbure.</h1><p className="mt-5 max-w-2xl leading-7 text-[#A5A5A5]">Aquí administrarás rutas públicas, ciudades, conductores y la información que Kabbure muestra a sus usuarios.</p></section>
        <section className="grid gap-5 md:grid-cols-3">{cards.map(({ title, description, href, icon: Icon, accent }) => <Link key={title} href={href} className="group rounded-3xl border border-[#222222] bg-[#111111] p-6 transition hover:-translate-y-1 hover:border-[#CB9546]/60"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5" style={{ color: accent }}><Icon size={23} /></div><h2 className="mt-7 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-[#888888]">{description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#E5C76B]">Abrir sección <ArrowRight size={16} className="transition group-hover:translate-x-1" /></span></Link>)}</section>
        <section className="mt-8 grid gap-5 sm:grid-cols-3"><div className="rounded-2xl border border-[#222222] bg-[#0B0B0B] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Catálogo</p><p className="mt-3 text-3xl font-bold text-[#E5C76B]">RK</p><p className="mt-2 text-sm text-[#888888]">Nomenclatura propia de Rutas Kabbure.</p></div><div className="rounded-2xl border border-[#222222] bg-[#0B0B0B] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Fuente</p><p className="mt-3 text-3xl font-bold text-[#06D6A0]">Pública</p><p className="mt-2 text-sm text-[#888888]">La categoría visible para las rutas administradas.</p></div><div className="rounded-2xl border border-[#222222] bg-[#0B0B0B] p-5"><p className="text-xs uppercase tracking-[0.16em] text-[#777777]">Estado</p><p className="mt-3 text-3xl font-bold text-white">Revisión</p><p className="mt-2 text-sm text-[#888888]">Nada se publica sin aprobación administrativa.</p></div></section>
      </div>
    </main>
  )
}
