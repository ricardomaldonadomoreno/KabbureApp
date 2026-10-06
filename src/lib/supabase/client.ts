import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function getSupabaseConfigurationError() {
  if (!supabaseUrl && !supabaseAnonKey) return 'Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública de Supabase en este deployment.'
  if (!supabaseUrl) return 'Falta NEXT_PUBLIC_SUPABASE_URL en este deployment.'
  if (!supabaseAnonKey) return 'Falta NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en este deployment.'
  return null
}

export function getSupabaseClient() {
  const normalizedUrl = supabaseUrl?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
  const normalizedKey = supabaseAnonKey?.trim()

  if (!normalizedUrl || !normalizedKey) {
    return null
  }

  try {
    return createClient(normalizedUrl, normalizedKey)
  } catch {
    return null
  }
}
