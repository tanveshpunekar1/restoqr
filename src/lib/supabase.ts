import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable retrieval for client and server runtimes
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  '';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;

export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; tableCount?: number }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      message: 'Supabase database is ready to be connected.'
    };
  }

  try {
    const { data, error } = await supabase.from('restaurants').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        message: `Supabase error: ${error.message} (Code: ${error.code})`
      };
    }
    return {
      connected: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
      tableCount: data ? data.length : 0
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || 'Connection check failed'
    };
  }
}
