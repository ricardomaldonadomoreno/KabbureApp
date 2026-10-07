'use client'

import { Crosshair, Search } from 'lucide-react'

const RADIUS_OPTIONS = [100, 300, 900]

type HomeMapControlsProps = {
  nearbyRadius: number
  onRadiusChange: (radius: number) => void
  onShowAll: () => void
  onClearMap: () => void
  search: string
  onSearchChange: (value: string) => void
  onSearchNearby: () => void
  nearbySearchDisabled: boolean
}

export default function HomeMapControls({
  nearbyRadius,
  onRadiusChange,
  onShowAll,
  onClearMap,
  search,
  onSearchChange,
  onSearchNearby,
  nearbySearchDisabled,
}: HomeMapControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <span className="flex items-center text-xs font-semibold text-[#B7B7B7]">Radio:</span>
      {RADIUS_OPTIONS.map((radius) => (
        <button
          key={radius}
          onClick={() => onRadiusChange(radius)}
          className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${nearbyRadius === radius ? 'border-[#CB9546] bg-[#CB9546] text-black' : 'border-[#333333] text-[#A5A5A5] hover:border-[#CB9546] hover:text-white'}`}
        >
          {radius} m
        </button>
      ))}
      <button onClick={onShowAll} className="rounded-lg border border-[#CB9546]/60 px-3 py-2 text-xs font-semibold text-[#E5C76B] transition hover:bg-[#CB9546] hover:text-black">
        Mostrar todas
      </button>
      <button onClick={onClearMap} className="rounded-lg border border-[#333333] px-3 py-2 text-xs font-semibold text-[#B7B7B7] transition hover:border-[#CB9546] hover:text-white">
        Mapa limpio
      </button>
      <label className="flex w-full items-center gap-2 rounded-xl border border-[#2B2B2B] bg-black px-3 py-2.5 text-sm text-[#888888] sm:w-56">
        <Search size={17} />
        <span className="sr-only">Buscar ruta</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar ruta o código" className="w-full bg-transparent text-white outline-none placeholder:text-[#666666]" />
      </label>
      <button onClick={onSearchNearby} disabled={nearbySearchDisabled} className="inline-flex items-center gap-2 rounded-lg border border-[#06D6A0]/50 px-3 py-2 text-xs font-semibold text-[#06D6A0] transition hover:bg-[#06D6A0]/10 disabled:cursor-not-allowed disabled:opacity-40">
        <Crosshair size={14} />
        Buscar cercanas
      </button>
    </div>
  )
}
