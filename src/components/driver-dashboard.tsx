'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BusFront, CheckCircle2, LogOut, MapPin, Radio, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

type Profile = {
  full_name: string
  email: string | null
  country_code: string | null
  phone: string | null
  cargo: 'conductor' | 'organizacion'
}

type Driver = {
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  driver_status: 'inactive' | 'active' | 'paused'
}

export default function DriverDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    const supabase = getSupabaseClient()

    async function loadDriver() {
      if (!supabase) {
        if (active) {
          setErrorMessage('Supabase no está disponible en este deployment.')
          setLoading(false)
        }
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) {
        router.replace('/registro')
        return
      }

      const [{ data: profileData, error: profileError }, { data: driverData, error: driverError }] = await Promise.all([
        supabase.from('profiles').select('full_name, email, country_code, phone, cargo').eq('id', user.id).maybeSingle(),
        supabase.from('drivers').select('verification_status, driver_status').eq('user_id', user.id).maybeSingle(),
      ])

      if (!active) return

      if (profileError || driverError || !profileData || profileData.cargo !== 'conductor' || !driverData) {
        setErrorMessage('No encontramos un perfil de conductor asociado a esta cuenta.')
        setLoading(false)
        return
      }

      setProfile(profileData as Profile)
      setDriver(driverData as Driver)
      setLoading(false)
    }

    void loadDriver()
    return () => {
      active = false
    }
  }, [router])

  async function signOut() {
    const supabase = getSupabaseClient()
    await supabase?.auth.signOut()
    router.replace('/registro')
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-black text-sm text-[#A5A5A5]">Cargando tu espacio de conductor...</main>
  }

  if (errorMessage || !profile || !driver) {
    return <main className="grid min-h-screen place-items-center bg-black px-5 text-white"><section className="max-w-md rounded-3xl border border-[#E63946]/30 bg-[#111111] p-8 text-center"><p className="text-sm leading-6 text-[#FFB0B7]">{errorMessage}</p><Link href="/registro" className="mt-6 inline-flex rounded-xl border border-[#CB9546] px-5 py-3 text-sm font-semibold text-[#E5C76B]">Volver al registro</Link></section></main>
  }

  const verificationLabel = {
    pending: 'Pendiente de revisión',
    approved: 'Perfil aprobado',
    rejected: 'Perfil rechazado',
    suspended: 'Perfil suspendido',
  }[driver.verification_status]

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-[#222222] pb-6">
          <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[#CB9546]/60 bg-[#111111]"><img src="/assets/brand/logo.ico" alt="" className="h-10 w-10" /></span><span className="kabbure-display text-xl font-bold tracking-[0.16em] text-[#E5C76B]">KABBURE</span></Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 text-sm text-[#A5A5A5] transition hover:text-white"><LogOut size={17} /> Cerrar sesión</button>
        </header>

        <section className="pb-12 pt-12 lg:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CB9546]">Espacio de conductor</p>
          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="kabbure-display text-5xl font-bold">Hola, {profile.full_name.split(' ')[0]}.</h1><p className="mt-4 max-w-xl leading-7 text-[#A5A5A5]">Desde aquí podrás administrar tu perfil, seleccionar el recorrido en el que trabajas y activar tu ubicación cuando comiences.</p></div><div className="flex items-center gap-2 rounded-full border border-[#06D6A0]/30 bg-[#06D6A0]/10 px-3 py-2 text-xs font-semibold text-[#06D6A0]"><CheckCircle2 size={15} /> {verificationLabel}</div></div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><UserRound size={20} /></div><p className="mt-5 text-xs uppercase tracking-[0.16em] text-[#888888]">Mi perfil</p><h2 className="mt-2 font-semibold">{profile.full_name}</h2><p className="mt-2 break-all text-sm text-[#888888]">{profile.email}</p><p className="mt-1 text-sm text-[#888888]">{profile.phone || 'Teléfono pendiente'}</p></article>
          <article className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><BusFront size={20} /></div><p className="mt-5 text-xs uppercase tracking-[0.16em] text-[#888888]">Ruta de trabajo</p><h2 className="mt-2 font-semibold">Aún no seleccionada</h2><p className="mt-2 text-sm leading-6 text-[#888888]">Aquí aparecerá el recorrido que elijas para trabajar.</p><button disabled className="mt-4 rounded-lg border border-[#333333] px-3 py-2 text-xs font-semibold text-[#777777]">Elegir ruta próximamente</button></article>
          <article className="rounded-2xl border border-[#222222] bg-[#111111] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#06D6A0]/15 text-[#06D6A0]"><Radio size={20} /></div><p className="mt-5 text-xs uppercase tracking-[0.16em] text-[#888888]">Ubicación</p><h2 className="mt-2 font-semibold">Transmisión inactiva</h2><p className="mt-2 text-sm leading-6 text-[#888888]">Actívala únicamente cuando estés realizando tu recorrido.</p><button disabled className="mt-4 rounded-lg border border-[#333333] px-3 py-2 text-xs font-semibold text-[#777777]">Activar GPS próximamente</button></article>
        </section>

        <section className="mt-8 rounded-3xl border border-[#CB9546]/25 bg-[#CB9546]/10 p-6 sm:p-8"><div className="flex gap-4"><MapPin className="mt-1 shrink-0 text-[#E5C76B]" size={23} /><div><h2 className="font-semibold text-[#E5C76B]">Tu siguiente paso</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#B7B7B7]">Cuando el catálogo de rutas esté disponible, podrás elegir un recorrido aprobado, renovarlo cuando lo necesites y comenzar a publicar tu ubicación de forma voluntaria.</p></div></div></section>
      </div>
    </main>
  )
}
