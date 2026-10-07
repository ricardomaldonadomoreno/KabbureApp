'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, FileImage, IdCard, LockKeyhole, Save, ShieldCheck, UserRound } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

type PhotoFieldProps = {
  name: string
  label: string
  description: string
  required?: boolean
}

function PhotoField({ name, label, description, required = true }: PhotoFieldProps) {
  return (
    <label className="block rounded-2xl border border-[#2B2B2B] bg-black/40 p-4 transition hover:border-[#CB9546]/60">
      <span className="flex items-center gap-2 text-sm font-semibold text-[#D5D5D5]"><FileImage size={17} className="text-[#E5C76B]" /> {label}</span>
      <span className="mt-2 block text-xs leading-5 text-[#777777]">{description}</span>
      <input required={required} name={name} type="file" accept="image/*" className="mt-4 block w-full text-xs text-[#A5A5A5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CB9546] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-[#E5C76B]" />
    </label>
  )
}

export default function DriverMyProfile() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [saved, setSaved] = useState(false)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    let active = true
    const supabase = getSupabaseClient()
    if (!supabase) {
      router.replace('/registro')
      return () => undefined
    }

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return
      if (!data.user) {
        router.replace('/registro')
        return
      }
      const { data: profile } = await supabase.from('profiles').select('cargo').eq('id', data.user.id).maybeSingle()
      if (!active) return
      if (!profile || profile.cargo !== 'conductor') router.replace('/conductor')
      else setCheckingSession(false)
    })

    return () => {
      active = false
    }
  }, [router])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFileError('')
    setSaved(true)
  }

  if (checkingSession) {
    return <main className="grid min-h-screen place-items-center bg-black text-sm text-[#A5A5A5]">Verificando tu sesión...</main>
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222222] pb-6">
          <Link href="/conductor" className="inline-flex items-center gap-2 text-sm text-[#A5A5A5] transition hover:text-[#E5C76B]"><ArrowLeft size={17} /> Volver al dashboard</Link>
          <div className="flex items-center gap-2 text-xs text-[#06D6A0]"><LockKeyhole size={15} /> Información privada</div>
        </header>

        <section className="pb-10 pt-12 lg:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CB9546]">Mi perfil de conductor</p>
          <div className="mt-4 max-w-3xl"><h1 className="kabbure-display text-4xl font-bold leading-tight sm:text-6xl">Activa tu cuenta para publicar.</h1><p className="mt-5 leading-7 text-[#A5A5A5]">Completa tu información personal, los datos del vehículo y las evidencias necesarias. Esta información será revisada antes de activar tu cuenta.</p></div>
          <div className="mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-[#CB9546]/25 bg-[#CB9546]/10 p-4 text-sm leading-6 text-[#B7B7B7]"><ShieldCheck className="mt-0.5 shrink-0 text-[#E5C76B]" size={20} /><p>Tu nombre, teléfono, documentos, rostro, placa y fotografías no se mostrarán públicamente en el mapa. Serán datos privados para verificación y seguridad.</p></div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-3xl border border-[#222222] bg-[#111111] p-5 sm:p-8">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><UserRound size={20} /></div><div><p className="text-xs uppercase tracking-[0.18em] text-[#CB9546]">Paso 1</p><h2 className="mt-1 font-semibold">Información personal</h2></div></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Nombre completo</span><input required name="full_name" type="text" placeholder="Nombre y apellidos" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Correo electrónico</span><input required name="email" type="email" placeholder="tu-correo@ejemplo.com" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">País</span><input required name="country" type="text" placeholder="País de residencia" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Número telefónico</span><input required name="phone" type="tel" inputMode="tel" placeholder="Código y número telefónico" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Tipo de documento</span><select required name="document_type" className="kabbure-input"><option value="">Selecciona una opción</option><option value="ci">Carnet de identidad</option><option value="passport">Pasaporte</option></select></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Número de documento</span><input required name="document_number" type="text" placeholder="Número de carnet o pasaporte" className="kabbure-input" /></label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#222222] bg-[#111111] p-5 sm:p-8">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#CB9546]/15 text-[#E5C76B]"><IdCard size={20} /></div><div><p className="text-xs uppercase tracking-[0.18em] text-[#CB9546]">Paso 2</p><h2 className="mt-1 font-semibold">Datos del vehículo y licencia</h2></div></div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Tipo de vehículo</span><select required name="vehicle_type" className="kabbure-input"><option value="">Selecciona el tipo</option><option>Motocicleta</option><option>Automóvil de 2 puertas</option><option>Automóvil de 4 puertas</option><option>Camioneta</option><option>Camioneta adaptada con asientos</option><option>Van</option><option>Minibús</option><option>Autobús</option><option>Triciclo</option><option>Otro</option></select></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Número de placa</span><input required name="plate_number" type="text" placeholder="Placa del vehículo" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Color del vehículo</span><input required name="vehicle_color" type="text" placeholder="Color principal" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Cantidad aproximada de asientos</span><input required name="seat_count" type="number" min="1" max="100" placeholder="Ej. 4" className="kabbure-input" /></label>
              <label className="block text-sm sm:col-span-2"><span className="mb-2 block font-medium text-[#D5D5D5]">Descripción del vehículo</span><textarea name="vehicle_description" rows={3} placeholder="Describe brevemente el vehículo o la adaptación de sus asientos" className="kabbure-input resize-y" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Número de licencia de conducción</span><input required name="license_number" type="text" placeholder="Número de licencia" className="kabbure-input" /></label>
              <label className="block text-sm"><span className="mb-2 block font-medium text-[#D5D5D5]">Fecha de vencimiento de licencia</span><input required name="license_expiry" type="date" className="kabbure-input" /></label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#222222] bg-[#111111] p-5 sm:p-8">
            <div><p className="text-xs uppercase tracking-[0.18em] text-[#CB9546]">Paso 3</p><h2 className="mt-1 font-semibold">Fotografías de verificación</h2><p className="mt-2 text-sm leading-6 text-[#888888]">Sube imágenes nítidas, completas y con buena iluminación. Serán almacenadas como información privada.</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2"><PhotoField name="vehicle_front" label="Vehículo — frontal" description="Vista completa de frente." /><PhotoField name="vehicle_back" label="Vehículo — trasera" description="Vista completa de la parte trasera." /><PhotoField name="vehicle_right" label="Vehículo — lado derecho" description="Vista lateral derecha completa." /><PhotoField name="vehicle_left" label="Vehículo — lado izquierdo" description="Vista lateral izquierda completa." /><PhotoField name="face_photo" label="Fotografía del rostro" description="Rostro visible, sin filtros ni objetos que lo cubran." /><PhotoField name="document_front" label="Documento — anverso" description="Frente del carnet de identidad o pasaporte." /><PhotoField name="document_back" label="Documento — reverso" description="Reverso del carnet de identidad. Para pasaporte, usa la página indicada." /><PhotoField name="license_front" label="Licencia — anverso" description="Frente de la licencia de conducción." /><PhotoField name="license_back" label="Licencia — reverso" description="Reverso de la licencia de conducción." /></div>
          </section>

          {fileError ? <div className="rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-4 text-sm leading-6 text-[#FFB0B7]">{fileError}</div> : null}
          {saved ? <div className="flex items-start gap-3 rounded-2xl border border-[#06D6A0]/30 bg-[#06D6A0]/10 p-4 text-sm leading-6 text-[#9AF0D4]"><CheckCircle2 className="mt-0.5 shrink-0" size={19} /><p>El formulario visual está listo. El guardado real se conectará cuando creemos la tabla y el almacenamiento privado de Supabase.</p></div> : null}
          <div className="flex flex-col items-stretch justify-between gap-4 border-t border-[#222222] pt-6 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-[#777777]">Al enviar, aceptas que Kabbure revise esta información para activar tu cuenta.</p><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#CB9546] px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-[#E5C76B]"><Save size={18} /> Grabar datos</button></div>
        </form>
      </div>
    </main>
  )
}
