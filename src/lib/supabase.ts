import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

export const configured = Boolean(SUPABASE_URL && SUPABASE_KEY)
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'missing', {
  // PKCE: magic link приходит как ?code=..., а не #access_token (хэш занят HashRouter)
  auth: { flowType: 'pkce' },
})
