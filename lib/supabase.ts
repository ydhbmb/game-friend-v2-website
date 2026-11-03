import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// 核心：使用 Promise.race 强制 5 秒超时，防止 Cloudflare Worker 卡死
const fetchWithTimeout = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const timeout = new Promise<Response>((_, reject) => {
    setTimeout(() => reject(new Error("⏰ Supabase 请求超时 (5秒)")), 5000)
  })
  
  return Promise.race([
    fetch(url, options),
    timeout
  ]) as Promise<Response>
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout,
  },
})