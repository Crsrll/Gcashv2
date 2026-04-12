import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://ucbmeuyyvvtfoptnvtey.supabase.co'
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjYm1ldXl5dnZ0Zm9wdG52dGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDk0MTgsImV4cCI6MjA5MTQ4NTQxOH0.o_f5P0KCcdGLxshpWGazqRnAxCns9baQcOrWv5fAjps'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
