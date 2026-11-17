'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const inputCls =
  'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

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

  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('头像不能超过 500KB')
      e.target.value = ''
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function sendCode() {
    setMsg('')
    if (!agreed) return setMsg('注册前必须阅读并同意用户守则')

    const { username, nickname, email, password, superPassword } = formData
    if (!username || !nickname || !email || !password || !superPassword) {
      return setMsg('请填写所有必填项')
    }
    if (!/^[a-zA-Z0-9]{3,30}$/.test(username)) {
      return setMsg('用户名必须为 3-30 位字母或数字')
    }
    if (nickname.length === 0 || nickname.length > 9) {
      return setMsg('昵称长度必须在 1-9 个字之间')
    }
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5.@&*]+$/.test(nickname)) {
      return setMsg('昵称只能包含中英文、数字以及 . @ & *')
    }
    if (password.length < 6) {
      return setMsg('登录密码至少 6 位')
    }
    if (superPassword.length < 6) {
      return setMsg('超级密码至少 6 位')
    }
    if (superPassword === password) {
      return setMsg('超级密码不能和登录密码相同')
    }

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
    if (!code.trim()) return setMsg('请输入验证码')
    setLoading(true)
    setMsg('')

    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: code.trim(),
      type: 'email',
    })

    if (authError || !authData.user) {
      setLoading(false)
      setMsg('验证失败：' + (authError?.message || '验证码错误或已过期'))
      return
    }

    await supabase.auth.updateUser({ password: formData.password })
    const userId = authData.user.id

    let avatarUrl = ''
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile)
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        avatarUrl = publicUrl
      }
    }

    const { data: insertedProfile, error: profileError } = await supabase
      .from('users_profile')
      .insert({
        auth_id: userId,
        username: formData.username,
        nickname: formData.nickname,
        email: formData.email,
        gender: formData.gender,
        qq: formData.qq,
        wechat: formData.wechat,
        yy: formData.yy,
        birthday: formData.birthday || null,
        avatar_url: avatarUrl,
      })
      .select('id')
      .single()

    if (profileError || !insertedProfile) {
      setLoading(false)
      setMsg('资料写入失败：' + (profileError?.message || '未知错误'))
      return
    }

    // 超级密码写入独立表，前端其他位置读不到
    const { error: secretError } = await supabase
      .from('user_secrets')
      .insert({
        user_id: insertedProfile.id,
        super_password: formData.superPassword,
      })

    setLoading(false)

    if (secretError) {
      setMsg('超级密码保存失败：' + secretError.message + '（账号已创建，可稍后在用户中心重设）')
      setTimeout(() => { window.location.href = '/' }, 2500)
      return
    }

    setMsg('注册成功，正在跳转…')
    setTimeout(() => { window.location.href = '/' }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">

        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="僚机雷达" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-[17px] font-semibold text-white">创建账号</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            一个账号，找到一群搭子
          </p>
        </div>

        <div className="rounded-xl bg-[#0A111F] border border-white/[0.08] p-5">

          {step === 'form' && (
            <div className="space-y-3">

              <div className="flex flex-col items-center gap-2 mb-1">
                <div className="w-16 h-16 rounded-full bg-black overflow-hidden border border-white/[0.08]">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#4A5768]">
                      无头像
                    </div>
                  )}
                </div>
                <label className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors">
                  上传头像（小于 500KB）
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="用户名（字母数字）"
                  className={inputCls}
                />
                <input
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  maxLength={9}
                  placeholder="昵称（最多 9 字）"
                  className={inputCls}
                />
              </div>

              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="邮箱"
                className={inputCls}
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="登录密码"
                  className={inputCls}
                />
                <input
                  name="superPassword"
                  type="password"
                  value={formData.superPassword}
                  onChange={handleChange}
                  placeholder="超级密码"
                  className={inputCls}
                />
              </div>

              <p className="text-[10.5px] text-[#4A5768] leading-relaxed px-0.5">
                超级密码用于忘记登录密码时找回，不能与登录密码相同。请牢记，它不通过邮箱发送。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
                <input
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                  className={`${inputCls} text-[#94A3B8]`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  name="qq"
                  value={formData.qq}
                  onChange={handleChange}
                  placeholder="QQ"
                  className={`${inputCls} px-2`}
                />
                <input
                  name="wechat"
                  value={formData.wechat}
                  onChange={handleChange}
                  placeholder="微信"
                  className={`${inputCls} px-2`}
                />
                <input
                  name="yy"
                  value={formData.yy}
                  onChange={handleChange}
                  placeholder="YY"
                  className={`${inputCls} px-2`}
                />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-cyan-500 cursor-pointer shrink-0"
                />
                <label htmlFor="agree" className="text-[11px] text-[#5C6B7F] leading-relaxed cursor-pointer">
                  我已阅读并同意
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-cyan-400 hover:text-cyan-300 ml-1 transition-colors"
                  >
                    《用户守则》
                  </button>
                </label>
              </div>

              {msg && (
                <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {msg}
                </p>
              )}

              <button
                onClick={sendCode}
                disabled={loading}
                className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
              >
                {loading ? '校验中…' : '发送验证码'}
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-3">
              <p className="text-[11.5px] text-[#94A3B8] text-center">
                验证码已发送至
                <span className="text-[#E8EFF7] ml-1">{formData.email}</span>
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyAndRegister()}
                maxLength={8}
                placeholder="输入邮箱验证码"
                className={`${inputCls} h-12 text-center text-[16px] tracking-[0.3em]`}
              />

              {msg && (
                <p
                  className={`text-[11.5px] rounded-lg px-3 py-2 border ${
                    msg.includes('失败')
                      ? 'text-red-400 bg-red-500/10 border-red-500/20'
                      : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                  }`}
                >
                  {msg}
                </p>
              )}

              <button
                onClick={verifyAndRegister}
                disabled={loading}
                className="w-full h-11 rounded-lg bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 transition-colors"
              >
                {loading ? '注册中…' : '完成注册'}
              </button>

              <button
                onClick={() => { setStep('form'); setMsg('') }}
                className="w-full h-9 rounded-lg text-[11.5px] text-[#5C6B7F] hover:text-[#94A3B8] transition-colors"
              >
                返回修改信息
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11.5px] text-[#5C6B7F] mt-5">
          已有账号？
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 ml-1 transition-colors">
            去登录
          </Link>
        </p>
      </div>

      {showTerms && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold">用户守则</h3>
              <button
                onClick={() => setShowTerms(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 text-[12px] text-[#94A3B8] space-y-2.5 max-h-[55vh] overflow-y-auto leading-relaxed">
              <p>欢迎使用僚机雷达。为维护良好的交流环境，请在注册前仔细阅读并同意以下条款：</p>
              <p><span className="text-[#E8EFF7]">1. 合法合规。</span>严禁利用本平台从事任何违反中华人民共和国法律法规的活动，严禁发布涉政、涉黄、涉赌、涉暴恐等违规信息。</p>
              <p><span className="text-[#E8EFF7]">2. 真实友善。</span>请勿恶意辱骂、人身攻击或进行地域歧视。禁止发布诈骗、代练、外挂等黑产广告。</p>
              <p><span className="text-[#E8EFF7]">3. 隐私保护。</span>请勿在公开场合随意泄露自己或他人的真实姓名、身份证号、家庭住址等敏感信息。</p>
              <p><span className="text-[#E8EFF7]">4. 账号安全。</span>你需对账号下发生的一切行为负责。如发现账号被盗，请通过超级密码或邮箱验证找回。</p>
              <p><span className="text-[#E8EFF7]">5. 违规处理。</span>对违反上述守则的用户，平台有权视情节给予禁言、封号（最高永久封禁）处理，并配合公安机关提供相关数据。</p>
            </div>

            <div className="px-5 pb-4 pt-1">
              <button
                onClick={() => { setShowTerms(false); setAgreed(true) }}
                className="w-full h-10 rounded-lg bg-cyan-600 text-white text-[12.5px] font-medium hover:bg-cyan-500 transition-colors"
              >
                我已阅知并同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
