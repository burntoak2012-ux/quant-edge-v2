import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const isValidUrl = url && /^https?:\/\/[^\s]+$/i.test(url)

export const supabase = isValidUrl && key ? createClient(url, key) : null
