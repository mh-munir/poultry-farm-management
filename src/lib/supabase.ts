import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrlHost(supabaseUrl: string | undefined) {
  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).host;
  } catch {
    return 'invalid-url';
  }
}

// Create a single, server-side Supabase client with the service role.
// This client can bypass RLS and is meant for admin-level operations.
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingEnv = [];

  if (!supabaseUrl) {
    missingEnv.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseServiceRoleKey) {
    missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missingEnv.length > 0 || !supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(`Missing Supabase environment variable(s): ${missingEnv.join(', ')}`);
  }

  supabaseAdmin ??= createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseAdmin;
}
