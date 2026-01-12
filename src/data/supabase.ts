import { createClient } from "@supabase/supabase-js";

export const supabase =
  createClient(import.meta.env.APP_SUPA_URL, import.meta.env.APP_SUPA_APIKEY);