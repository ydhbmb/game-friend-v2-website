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
      
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      setLoading(false)
      
      if (loginError) {
        setMsg('登录失败：账号或密码错误')
      } else {
        setMsg('登录成功！正在跳转...')
        window.location.href = '/' // 强制跳转回首页
      }
    } catch (err: any) {
      setLoading(false)
      setMsg('请求超时，请检查网络')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050B14] p-4">
      <div className="w-full max-w-md bg-[#0A111F] rounded-2xl border border-cyan-500/30 p-8 shadow-xl">
        <h1 className="text-2xl font-black text-center text-cyan-400 mb-8">登录 Wingman Games</h1>
        
        <div className="space-y-4">
          <input 
            className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500" 
            placeholder="用户名 / 邮箱 / ID" 
            value={account} 
            onChange={(e) => setAccount(e.target.value)} 
          />
          <input 
            className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500" 
            type="password" 
            placeholder="登录密码" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
          />
        </div>

        <button 
          onClick={handleLogin} 
          className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg py-3 font-bold"
        >
          {loading ? '登录中...' : '确认登录'}
        </button>

        {msg && <p className="text-sm text-center mt-4 text-red-400">{msg}</p>}

        <div className="text-center mt-6">
          <a href="/register" className="text-sm text-gray-400 hover:text-cyan-400">没有账号？点击注册</a>
        </div>
      </div>
    </div>
  )
}