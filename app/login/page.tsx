'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!account || !password) return setMsg('请输入账号和密码')
    setLoading(true)
    setMsg('')

    try {
      let loginEmail = account
      if (!account.includes('@')) {
        const isId = /^\d+$/.test(account)
        const { data, error } = await supabase
          .from('users_profile')
          .select('email')
          .or(isId ? `id.eq.${account}` : `username.eq.${account}`)
          .maybeSingle()

        if (error || !data) {
          setMsg('找不到该用户')
          setLoading(false)
          return
        }
        loginEmail = data.email
      }

      const { data: authData, error: loginError } =
        await supabase.auth.signInWithPassword({ email: loginEmail, password })

      if (loginError) {
        setLoading(false)
        setMsg('账号或密码错误')
        return
      }

      if (authData.user) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('banned_until')
          .eq('auth_id', authData.user.id)
          .single()

        if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
          const diffDays = Math.ceil(
            (new Date(profile.banned_until).getTime() - Date.now()) / 86400000
          )
          await supabase.auth.signOut()
          setLoading(false)
          setMsg(
            `账号已被封禁，剩余 ${diffDays > 3650 ? '永久' : diffDays + ' 天'}`
          )
          return
        }
      }

      setLoading(false)
      window.location.href = '/'
    } catch {
      setLoading(false)
      setMsg('请求超时，请检查网络')
    }
  }

  const inputCls =
    'w-full h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-7">
          <img
            src="/logo.png"
            alt="僚机雷达"
            className="w-14 h-14 object-contain mb-3"
          />
          <h1 className="text-[17px] font-semibold text-white">登录僚机雷达</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            用账号找一个靠谱的游戏搭子
          </p>
        </div>

        <div className="rounded-xl bg-[#0A111F] border border-white/[0.08] p-5 space-y-3">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="用户名 / 邮箱 / ID"
            className={inputCls}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="密码"
            className={inputCls}
          />

          {msg && (
            <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
          >
            {loading ? '登录中…' : '登录'}
          </button>

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/forgot-password"
              className="text-[11.5px] text-[#5C6B7F] hover:text-cyan-400 transition-colors"
            >
              忘记密码
            </Link>
            <Link
              href="/register"
              className="text-[11.5px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              没有账号？注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
