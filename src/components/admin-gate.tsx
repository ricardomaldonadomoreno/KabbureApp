'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading')

  useEffect(() => {
    let active = true
    const adminUserId = process.env.NEXT_PUBLIC_ADMIN_USER_ID
    const supabase = getSupabaseClient()

    async function checkAccess() {
      if (!adminUserId || !supabase) {
        if (active) setState('denied')
        return
      }

      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/registro')
        return
      }

      if (active) setState(data.user.id === adminUserId ? 'allowed' : 'denied')
    }

    void checkAccess()
    return () => {
      active = false
    }
  }, [router])

  if (state === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-black text-sm text-[#A5A5A5]">Verificando acceso administrativo...</main>
  }

  if (state === 'denied') {
    return <main className="grid min-h-screen place-items-center bg-black px-5 text-white"><section className="max-w-lg rounded-3xl border border-[#E63946]/30 bg-[#111111] p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E63946]/10 text-[#FFB0B7]"><ShieldAlert size={26} /></div><h1 className="kabbure-display mt-6 text-3xl font-bold">Acceso restringido</h1><p className="mt-3 text-sm leading-6 text-[#A5A5A5]">Esta sección solo está disponible para la cuenta administradora configurada en Kabbure.</p><button onClick={() => router.replace('/')} className="mt-6 rounded-xl border border-[#CB9546] px-5 py-3 text-sm font-semibold text-[#E5C76B]">Volver al inicio</button></section></main>
  }

  return <>{children}</>
}
