'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, MapPin, ShieldCheck } from 'lucide-react'
import { countries } from 'countries-list'
import { getSupabaseClient } from '@/lib/supabase/client'

type RegistrationStatus = 'idle' | 'loading' | 'success' | 'error'

type CountryOption = {
  code: string
  name: string
  phoneCode: string
}

const countryOptions: CountryOption[] = Object.entries(countries)
  .map(([code, country]) => ({
    code,
    name: country.name,
    phoneCode: country.phone?.[0] ? `+${country.phone[0]}` : '',
  }))
  .filter((country) => country.phoneCode)
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))

export default function DriverRegistration() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<RegistrationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const selectedCountry = useMemo(
    () => countryOptions.find((country) => country.code === countryCode),
    [countryCode],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    const supabase = getSupabaseClient()
    if (!supabase) {
      setStatus('error')
      setErrorMessage('Supabase todavía no está conectado en este entorno.')
      return
    }

    const normalizedPhone = `${selectedCountry?.phoneCode ?? ''} ${phone.trim()}`.trim()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/registro?verified=1`,
        data: {
          full_name: fullName.trim(),
          country_code: countryCode,
          country_name: selectedCountry?.name,
          phone: normalizedPhone,
          role: 'driver',
        },
      },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('success')
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <section className="w-full rounded-3xl border border-[#222222] bg-[#111111] p-7 text-center shadow-2xl shadow-black/40 sm:p-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#06D6A0]/15 text-[#06D6A0]"><Mail size={30} /></div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#CB9546]">Verifica tu correo</p>
            <h1 className="kabbure-display mt-3 text-4xl font-bold">Revisa tu bandeja de entrada.</h1>
            <p className="mt-5 leading-7 text-[#A5A5A5]">Enviamos un enlace de verificación a <strong className="text-white">{email}</strong>. Confirma tu correo para continuar con el registro de conductor.</p>
            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-[#888888]"><ShieldCheck size={15} className="text-[#06D6A0]" /> Tu acceso se verificará con Supabase Auth.</div>
            <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#CB9546] px-5 py-3 text-sm font-semibold text-[#E5C76B] transition hover:bg-[#CB9546] hover:text-black"><ArrowLeft size={17} /> Volver al mapa</Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#A5A5A5] transition hover:text-[#E5C76B]"><ArrowLeft size={17} /> Volver a Kabbure</Link>
        <div className="grid gap-10 pb-12 pt-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:pt-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#CB9546]/40 bg-[#CB9546]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#E5C76B]"><span className="h-1.5 w-1.5 rounded-full bg-[#06D6A0]" /> Registro de conductor</div>
            <h1 className="kabbure-display max-w-xl text-5xl font-bold leading-[1.02] sm:text-6xl">Comienza a publicar tu recorrido.</h1>
            <p className="mt-6 max-w-lg leading-7 text-[#A5A5A5]">Crea tu acceso con tus datos básicos. Después podrás registrar tu vehículo, seleccionar una ruta aprobada y activar tu ubicación cuando inicies el recorrido.</p>
            <div className="mt-8 space-y-4 text-sm text-[#B7B7B7]"><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-[#06D6A0]" size={19} /><span>Tu correo será verificado antes de continuar.</span></div><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-[#06D6A0]" size={19} /><span>Tu país y teléfono nos ayudan a preparar tu perfil.</span></div><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-[#06D6A0]" size={19} /><span>Kabbure no asigna pasajeros ni establece tarifas.</span></div></div>
          </div>

          <section className="rounded-3xl border border-[#222222] bg-[#111111] p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><MapPin size={20} /></div><div><h2 className="font-semibold">Datos de acceso</h2><p className="text-xs text-[#888888]">Solo necesitamos lo esencial para comenzar.</p></div></div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Nombre completo</span><input required minLength={3} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ej. Carlos Ramírez" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Correo electrónico</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" className="kabbure-input" /></label>
              <div className="grid gap-4 sm:grid-cols-[1fr_1.25fr]"><label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">País</span><select required value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="kabbure-input"><option value="">Selecciona un país</option>{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.phoneCode})</option>)}</select></label><label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Número telefónico</span><div className="flex"><span className="flex min-w-[62px] items-center justify-center rounded-l-xl border border-r-0 border-[#333333] bg-black px-2 text-sm text-[#E5C76B]">{selectedCountry?.phoneCode || '+—'}</span><input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="700 000 000" className="kabbure-input rounded-l-none" /></div></label></div>
              {status === 'error' ? <div className="rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 px-4 py-3 text-sm leading-6 text-[#FFB0B7]">{errorMessage}</div> : null}
              <button type="submit" disabled={status === 'loading'} className="kabbure-focus flex w-full items-center justify-center gap-2 rounded-xl bg-[#CB9546] px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-[#E5C76B] disabled:cursor-not-allowed disabled:opacity-60">{status === 'loading' ? <LoaderCircle className="animate-spin" size={18} /> : <Mail size={18} />}Enviar verificación</button>
              <p className="text-center text-xs leading-5 text-[#777777]">Al continuar, recibirás un correo para confirmar tu cuenta. No creamos una contraseña en este paso.</p>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
