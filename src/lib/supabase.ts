import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zwtzojirkinznjljxxcp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_edFQ9MG-oEZ3_lC82fX7Mg_AoiqMRfW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
