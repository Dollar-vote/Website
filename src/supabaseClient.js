// ─────────────────────────────────────────────
// Supabase connection
// This is the single place the app talks to the database.
// The values come from the .env file (publishable key — safe for the browser).
// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

// `supabase` is null if the .env isn't set, so the app still runs on sample data.
export const supabase = url && key ? createClient(url, key) : null;
