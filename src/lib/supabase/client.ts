import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const normalizedUrl = supabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')

  try {
    return createClient(normalizedUrl, supabaseAnonKey.trim())
  } catch {
    return null
  }
}
