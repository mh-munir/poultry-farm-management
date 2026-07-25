import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  // This check is important because the service role key is required for server-side operations.
  // We don't throw an error here to allow the client-side part of the app to build,
  // but server-side functions requiring it will fail.
  console.warn('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. Server-side Supabase operations will fail.');
}

// Create a single, server-side Supabase client with the service role
// This client can bypass RLS and is meant for admin-level operations.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '');