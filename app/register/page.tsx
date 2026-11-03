'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    superPassword: '',
    gender: '男',
    qq: '',
    wechat: '',
    yy: '',
    birthday: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function sendCode() {
    setMsg('')
    const { username, nickname, email, password, superPassword } = formData

    if (!username || !nickname || !email || !password || !superPassword) return setMsg('请填写所有必填项')
    if (!/^[a-zA-Z0-9]{3,30}$/.test(username)) return setMsg('用户名必须为3-30位字母或数字')
    if (nickname.length > 9 || nickname.length === 0) return setMsg('昵称长度必须大于0且小于等于9')
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5.@&*]+$/.test(nickname)) return setMsg('昵称只能包含中英文、数字以及 . @ & *')
    if (password.length < 6) return setMsg('密码至少6位')

    setLoading(true)

    const { data: existing } = await supabase
      .from('users_profile')
      .select('username, nickname, email')
      .or(`username.eq.${username},nickname.eq.${nickname},email.eq.${email}`)

    if (existing && existing.length > 0) {
      const dup = existing[0]
      if (dup.username === username) setMsg('该用户名已被注册')
      else if (dup.nickname === nickname) setMsg('该昵称已被使用')
      else if (dup.email === email) setMsg('该邮箱已被注册')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (error) {
      setMsg('发送失败：' + error.message)
    } else {
      setStep('verify')
      setMsg('验证码已发送到你的邮箱')
    }
  }

  async function verifyAndRegister() {
    if (!code) return setMsg('请输入验证码')
    setLoading(true)
    setMsg('')

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: code,
      type: 'email',
    })

    if (authError || !authData.user) {
      setLoading(false)
      setMsg('验证失败：' + (authError?.message || '未知错误'))
      return
    }

    await supabase.auth.updateUser({ password: formData.password })
    const userId = authData.user.id

    let avatarUrl = ''
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        avatarUrl = publicUrl
      }
    }

    const { error: profileError } = await supabase.from('users_profile').insert({
      auth_id: userId,
      username: formData.username,
      nickname: formData.nickname,
      email: formData.email,
      super_password: formData.superPassword,
      gender: formData.gender,
      qq: formData.qq,
      wechat: formData.wechat,
      yy: formData.yy,
      birthday: formData.birthday || null,
      avatar_url: avatarUrl,
    })

    setLoading(false)
    if (profileError) {
      setMsg('资料写入失败：' + profileError.message)
    } else {
      setMsg('注册成功！正在跳转...')
      setTimeout(() => { window.location.href = '/' }, 1500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-4 py-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]"></div>

      <div className="w-full max-w-lg bg-[#111]/80 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] p-8 space-y-4 relative z-10">
        
        <div className="flex flex-col items-center mb-4">
          <img src="/logo.png" alt="Wingman Games" className="w-24 h-24 object-contain mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-widest">
            Wingman Games
          </h1>
        </div>

        {step === 'form' && (
          <>
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="w-20 h-20 rounded-full bg-black overflow-hidden border-2 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">无头像</div>
                )}
              </div>
              <label className="text-cyan-400 text-sm cursor-pointer hover:text-fuchsia-400 transition">
                上传头像
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input name="username" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="用户名(3-30位字母数字)" onChange={handleChange} />
              <input name="nickname" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="昵称(最多9个字)" onChange={handleChange} />
            </div>
            
            <input name="email" type="email" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="邮箱" onChange={handleChange} />
            
            <div className="grid grid-cols-2 gap-4">
              <input name="password" type="password" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="登录密码" onChange={handleChange} />
              <input name="superPassword" type="password" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="超级密码(用于改密)" onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select name="gender" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500 transition-colors" onChange={handleChange}>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
              <input name="birthday" type="date" className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 outline-none focus:border-cyan-500 transition-colors" onChange={handleChange} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input name="qq" className="w-full bg-black/60 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-cyan-500" placeholder="QQ(选填)" onChange={handleChange} />
              <input name="wechat" className="w-full bg-black/60 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-cyan-500" placeholder="微信(选填)" onChange={handleChange} />
              <input name="yy" className="w-full bg-black/60 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-cyan-500" placeholder="YY(选填)" onChange={handleChange} />
            </div>

            <button onClick={sendCode} disabled={loading} className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg py-3 font-bold shadow-[0_0_15px_rgba(217,70,239,0.4)] disabled:opacity-50 mt-4 transition-all hover:from-fuchsia-500 hover:to-purple-500">
              {loading ? '校验中...' : '发送验证码'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-cyan-300 text-center">验证码已发送至：<b>{formData.email}</b></p>
            <input
              className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-cyan-400 outline-none focus:border-cyan-500"
              placeholder="8 位验证码"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={verifyAndRegister} disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg py-3 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all hover:from-cyan-500 hover:to-blue-500">
              {loading ? '注册中...' : '验证并完成注册'}
            </button>
            <button onClick={() => setStep('form')} className="w-full text-sm text-gray-500 hover:text-white mt-2 transition">返回修改信息</button>
          </>
        )}

        {msg && <p className={`text-sm text-center ${msg.includes('成功') ? 'text-cyan-400' : 'text-red-500'} bg-black/40 py-2 rounded`}>{msg}</p>}
        
        {step === 'form' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            已有账号？ <Link href="/login" className="text-cyan-400 hover:text-fuchsia-400 transition">去登录</Link>
          </p>
        )}
      </div>
    </div>
  )
}