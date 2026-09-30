import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white sm:px-10">
      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-between gap-16">
        <header className="flex items-center gap-3">
          <Image src="/kabbure-mark.svg" alt="" width={42} height={42} priority />
          <div>
            <p className="kabbure-display text-xl font-bold tracking-wide text-[#E5C76B]">KABBURE</p>
            <p className="text-xs uppercase tracking-[0.24em] text-[#888888]">Información de movilidad</p>
          </div>
        </header>

        <section className="kabbure-surface rounded-3xl p-8 sm:p-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#CB9546]">Base del proyecto</p>
          <h1 className="kabbure-display max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Rutas y vehículos activos, visibles en un solo lugar.
          </h1>
          <p className="mt-6 max-w-2xl leading-7 text-[#B7B7B7]">
            La arquitectura inicial está lista para conectar OpenStreetMap, rutas autorizadas,
            GPS y Supabase Realtime. La primera página pública se construirá sobre esta base.
          </p>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#222222] pt-5 text-sm text-[#888888]">
          <span>Fase 1 · Rutas + vehículos + GPS + información</span>
          <span className="text-[#06D6A0]">Arquitectura lista</span>
        </footer>
      </div>
    </main>
  )
}
