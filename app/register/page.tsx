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

  // 🔥 用户守则相关状态
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 500 * 1024) {
        alert('头像不能超过 500KB')
        e.target.value = ''
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function sendCode() {
    setMsg('')
    // 🔥 拦截：必须同意守则
    if (!agreed) {
      return setMsg('注册前必须阅读并勾选同意《僚机雷达用户守则》')
    }

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
    <div className="min-h-screen flex items-center justify-center bg-[#050B14] p-4 py-10 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#0A111F]/90 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] p-8 space-y-4 relative z-10">
        
        <div className="flex flex-col items-center mb-4">
          <img src="/logo.png" alt="僚机雷达" className="w-24 h-24 object-contain mb-2 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-widest font-orbitron">建立新节点</h1>
        </div>

        {step === 'form' && (
          <>
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="w-20 h-20 rounded-full bg-black overflow-hidden border-2 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                {avatarPreview ? <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">无头像</div>}
              </div>
              <label className="text-cyan-400 text-sm cursor-pointer hover:text-fuchsia-400 transition">
                上传全息投影(小于500KB)
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

            {/* 🔥 用户守则勾选区域 */}
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 accent-cyan-500 cursor-pointer" />
              <label htmlFor="agree" className="text-xs text-gray-400 cursor-pointer">
                我已阅读并同意 <span onClick={() => setShowTerms(true)} className="text-cyan-400 hover:underline">《僚机雷达用户守则》</span>
              </label>
            </div>

            <button onClick={sendCode} disabled={loading} className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg py-3 font-bold shadow-[0_0_15px_rgba(217,70,239,0.4)] disabled:opacity-50 mt-4 transition-all hover:from-fuchsia-500 hover:to-purple-500">
              {loading ? '校验中...' : '发送验证码'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-cyan-300 text-center">验证码已发送至：<b>{formData.email}</b></p>
            <input className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-cyan-400 outline-none focus:border-cyan-500" placeholder="8 位验证码" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={verifyAndRegister} disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg py-3 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all hover:from-cyan-500 hover:to-blue-500">
              {loading ? '注册中...' : '验证并完成注册'}
            </button>
            <button onClick={() => setStep('form')} className="w-full text-sm text-gray-500 hover:text-white mt-2 transition">返回修改信息</button>
          </>
        )}

        {msg && <p className={`text-sm text-center ${msg.includes('成功') ? 'text-cyan-400' : 'text-red-500'} bg-black/40 py-2 rounded`}>{msg}</p>}
        
        {step === 'form' && (
          <p className="text-center text-sm text-gray-500 mt-4">
            已有节点？ <a href="/login" className="text-cyan-400 hover:text-fuchsia-400 transition">去登录</a>
          </p>
        )}
      </div>

      {/* 用户守则弹窗 */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-4 font-orbitron text-center">🛡️ 僚机雷达用户守则</h2>
            <div className="text-sm text-gray-300 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <p>欢迎接入僚机雷达。为了维护良好的星际战术交流环境，请您在注册前仔细阅读并同意以下条款：</p>
              <p><strong>1. 合法合规：</strong>严禁利用本平台从事任何违反中华人民共和国法律法规的活动，严禁发布涉政、涉黄、涉赌、涉暴恐等违规信息。</p>
              <p><strong>2. 真实友善：</strong>请勿在交流中恶意辱骂、人身攻击或进行地域黑。禁止发布诈骗、代练、外挂等黑产广告。</p>
              <p><strong>3. 隐私保护：</strong>请勿在公开场合（如论坛、招募令）随意泄露自己或他人的真实姓名、身份证号、家庭住址等敏感信息。</p>
              <p><strong>4. 账号安全：</strong>您需对您账号下发生的一切行为负责。如发现账号被盗，请立即通过“超级密码”找回或联系巡游天官。</p>
              <p><strong>5. 违规处理：</strong>对于违反上述守则的用户，平台有权视情节轻重给予禁言、封号（最高永久封禁）处理，并配合公安机关提供相关数据。</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => { setShowTerms(false); setAgreed(true); }} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-cyan-500 transition shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                我已阅知并同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}