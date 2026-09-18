/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid URL
const isValidHttpUrl = (string?: string): boolean => {
  if (!string || string.includes('your-project') || string.includes('undefined')) return false;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(isValidHttpUrl(envUrl) && envAnonKey && envAnonKey.length > 20);
};

// Fallback dummy URL so createClient does not crash if env is unconfigured in development
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(
  isValidHttpUrl(envUrl) ? envUrl : fallbackUrl,
  envAnonKey && envAnonKey.length > 20 ? envAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const getSupabaseConfig = () => ({
  url: envUrl || '',
  isConfigured: isSupabaseConfigured(),
});
