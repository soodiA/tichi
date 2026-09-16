import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zwtzojirkinznjljxxcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_edFQ9MG-oEZ3_lC82fX7Mg_AoiqMRfW';

// Explicit auth options (these match supabase-js v2 defaults, but are made
// explicit here because the profiles/node_progress RLS policies depend on
// `auth.uid()` staying stable across reloads for a given browser/device —
// see src/lib/sync.ts for the failure mode when a session doesn't persist).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
