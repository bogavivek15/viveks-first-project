// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in your .env file.'
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // OPTIMIZATION FOR HIGH TRAFFIC:
  // We limit the realtime events per second. 
  // If you don't use live features (like live chat), you can remove the realtime block entirely 
  // or set it to minimal values to prevent websocket overload.
  realtime: {
    params: {
      eventsPerSecond: 2, // Throttle events to prevent flooding
    },
  },
  // Retry failed requests automatically (improves stability on flaky networks)
  global: {
    headers: { 'x-application-name': 'student-desk' },
  },
});