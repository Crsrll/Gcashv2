import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Lazily create client so missing env vars don't crash the build
let _client = null

export function getSupabase() {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase env vars. Add them to .env.local')
    }
    _client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

// Named export kept for backwards compat — resolves lazily at call time
export const supabase = new Proxy({}, {
  get(_, prop) {
    return getSupabase()[prop]
  }
})
