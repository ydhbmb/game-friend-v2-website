'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!account || !password) return setMsg('请输入账号和密码')
    setLoading(true); setMsg('')
    
    try {
      let loginEmail = account
      if (!account.includes('@')) {
        const isId = /^\d+$/.test(account)
        const { data, error } = await supabase.from('users_profile').select('email').or(isId ? `id.eq.${account}` : `username.eq.${account}`).single()
        if (error || !data) {
          setMsg('找不到该用户'); setLoading(false); return 
        }
        loginEmail = data.email
      }
      
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      
      if (loginError) {
        setLoading(false)
        setMsg('登录失败：账号或密码错误')
        return
      }

      // 🔥 检查封禁状态
      if (authData.user) {
        const { data: profile } = await supabase.from('users_profile').select('banned_until').eq('auth_id', authData.user.id).single()
        
        if (profile && profile.banned_until && new Date(profile.banned_until) > new Date()) {
          const banDate = new Date(profile.banned_until)
          const diffDays = Math.ceil((banDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
          
          let banText = diffDays > 3650 ? '永久' : `${diffDays} 天`
          
          await supabase.auth.signOut()
          setLoading(false)
          setMsg(`您已经被巡游天官发现您的违禁行为，禁止进入 (剩余封禁: ${banText})`)
          return
        }
      }

      setLoading(false)
      setMsg('登录成功！正在跳转...')
      window.location.href = '/'
      
    } catch (err: any) {
      setLoading(false)
      setMsg('请求超时，请检查网络')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B14] p-4">
      <div className="w-full max-w-md bg-[#0A111F] rounded-2xl border border-cyan-500/30 p-8 shadow-xl">
        <h1 className="text-2xl font-black text-center text-cyan-400 mb-8 font-orbitron">登录 Wingman Games</h1>
        
        <div className="space-y-4">
          <input className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500" placeholder="用户名 / 邮箱 / ID" value={account} onChange={(e) => setAccount(e.target.value)} />
          <input className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500" type="password" placeholder="登录密码" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        </div>

        <button onClick={handleLogin} className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg py-3 font-bold">
          {loading ? '登录中...' : '确认登录'}
        </button>

        {msg && <p className={`text-sm text-center mt-4 p-2 rounded ${msg.includes('违禁') ? 'text-red-500 bg-red-500/10 border border-red-500/30' : 'text-red-400'}`}>{msg}</p>}

        <div className="text-center mt-6">
          <a href="/register" className="text-sm text-gray-400 hover:text-cyan-400">没有账号？点击注册</a>
        </div>
      </div>
    </div>
  )
}