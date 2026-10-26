// The one connection to our Supabase project, shared by the whole app.
// URL and anon key are public (they end up in the bundle); RLS protects the data.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing, see .env.example')
}

export const supabase = createClient(url, anonKey)

// The whole flat shares one login (docs/decisions/0007). Only the password is
// typed in, this address is never shown and never receives mail.
export const WG_EMAIL = 'wg@wehrgasse.com'
