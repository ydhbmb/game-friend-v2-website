'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Mode = 'email' | 'super'

const inputCls =
  'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>('super')

  const [account, setAccount] = useState('')
  const [superPassword, setSuperPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [emailStep, setEmailStep] = useState<'input' | 'verify'>('input')

  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setMsg('')
    setOk(false)
  }

  // ---------- 超级密码路径 ----------
  async function handleSuperReset() {
    if (!account.trim()) return setMsg('请输入用户名 / 邮箱 / ID')
    if (!superPassword) return setMsg('请输入超级密码')
    if (newPassword.length < 6) return setMsg('新密码至少 6 位')

    setLoading(true)
    setMsg('')
    setOk(false)

    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          account: account.trim(),
          superPassword,
          newPassword,
        },
      })

      setLoading(false)

      if (error) {
        setMsg('请求失败：' + error.message)
        return
      }
      if (data?.error) {
        setMsg(data.error)
        return
      }

      setOk(true)
      setMsg('密码已重置，请用新密码登录')
      setSuperPassword('')
      setNewPassword('')
    } catch (err: any) {
      setLoading(false)
      setMsg('网络异常：' + (err?.message || '请稍后再试'))
    }
  }

  // ---------- 邮箱路径 ----------
  async function handleSendCode() {
    const mail = email.trim()
    if (!mail.includes('@')) return setMsg('请输入正确的邮箱')

    setLoading(true)
    setMsg('')
    setOk(false)

    const { error } = await supabase.auth.signInWithOtp({
      email: mail,
      options: { shouldCreateUser: false },
    })

    setLoading(false)

    if (error) {
      setMsg('发送失败：' + error.message)
      return
    }
    setEmailStep('verify')
    setMsg('验证码已发送到你的邮箱')
  }

  async function handleEmailReset() {
    if (!code.trim()) return setMsg('请输入验证码')
    if (newPassword.length < 6) return setMsg('新密码至少 6 位')

    setLoading(true)
    setMsg('')
    setOk(false)

    const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })

    if (verifyErr || !authData.user) {
      setLoading(false)
      setMsg('验证失败：' + (verifyErr?.message || '验证码错误或已过期'))
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateErr) {
      setLoading(false)
      setMsg('修改失败：' + updateErr.message)
      return
    }

    await supabase.auth.signOut()
    setLoading(false)
    setOk(true)
    setMsg('密码已重置，请用新密码登录')
    setCode('')
    setNewPassword('')
  }

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="僚机雷达" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-[17px] font-semibold text-white">找回密码</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            用超级密码或邮箱验证重置登录密码
          </p>
        </div>

        <div className="rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">

          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => switchMode('super')}
              className={`flex-1 h-11 text-[12.5px] font-medium transition-colors ${
                mode === 'super'
                  ? 'text-[#E8EFF7] border-b border-cyan-500'
                  : 'text-[#5C6B7F] hover:text-[#94A3B8]'
              }`}
            >
              超级密码
            </button>
            <button
              onClick={() => switchMode('email')}
              className={`flex-1 h-11 text-[12.5px] font-medium transition-colors ${
                mode === 'email'
                  ? 'text-[#E8EFF7] border-b border-cyan-500'
                  : 'text-[#5C6B7F] hover:text-[#94A3B8]'
              }`}
            >
              邮箱验证
            </button>
          </div>

          <div className="p-5 space-y-3">

            {mode === 'super' && (
              <>
                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">账号</label>
                  <input
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="用户名 / 邮箱 / ID"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">超级密码</label>
                  <input
                    type="password"
                    value={superPassword}
                    onChange={(e) => setSuperPassword(e.target.value)}
                    placeholder="注册时设置的超级密码"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">新登录密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSuperReset()}
                    placeholder="至少 6 位"
                    className={inputCls}
                  />
                </div>

                <button
                  onClick={handleSuperReset}
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
                >
                  {loading ? '处理中…' : '重置密码'}
                </button>
              </>
            )}

            {mode === 'email' && emailStep === 'input' && (
              <>
                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">注册邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                    placeholder="你注册时用的邮箱"
                    className={inputCls}
                  />
                </div>

                <p className="text-[10.5px] text-[#4A5768] leading-relaxed">
                  我们会向这个邮箱发送一个验证码，验证通过后即可设置新密码。
                </p>

                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
                >
                  {loading ? '发送中…' : '发送验证码'}
                </button>
              </>
            )}

            {mode === 'email' && emailStep === 'verify' && (
              <>
                <p className="text-[11.5px] text-[#94A3B8] text-center">
                  验证码已发送至
                  <span className="text-[#E8EFF7] ml-1">{email}</span>
                </p>

                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">邮箱验证码</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={8}
                    placeholder="输入验证码"
                    className={`${inputCls} h-12 text-center text-[16px] tracking-[0.3em]`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#5C6B7F] mb-1.5">新登录密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailReset()}
                    placeholder="至少 6 位"
                    className={inputCls}
                  />
                </div>

                <button
                  onClick={handleEmailReset}
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
                >
                  {loading ? '处理中…' : '确认重置'}
                </button>

                <button
                  onClick={() => { setEmailStep('input'); setMsg(''); setCode('') }}
                  className="w-full h-9 rounded-lg text-[11.5px] text-[#5C6B7F] hover:text-[#94A3B8] transition-colors"
                >
                  换个邮箱
                </button>
              </>
            )}

            {msg && (
              <p
                className={`text-[11.5px] rounded-lg px-3 py-2 border ${
                  ok
                    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}
              >
                {msg}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[11.5px] text-[#5C6B7F] mt-5">
          想起来了？
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 ml-1 transition-colors">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  )
}
