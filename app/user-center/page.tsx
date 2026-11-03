'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function UserCenterPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // 头像上传状态
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('users_profile').select('*').eq('auth_id', data.user.id).single().then(({ data: p }) => {
          if (p) {
            setProfile(p)
            setNickname(p.nickname || '')
            setAvatarPreview(p.avatar_url || '')
          }
        })
      } else {
        router.push('/login')
      }
    })
  }, [router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function updateProfile(e: any) {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    const newNickname = e.target.nickname.value.trim()

    // 1. 基础校验
    if (newNickname.length === 0 || newNickname.length > 9) {
      setMsg('昵称长度必须在 1-9 个字符之间')
      setLoading(false)
      return
    }
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5.@&*]+$/.test(newNickname)) {
      setMsg('昵称只能包含中英文、数字以及 . @ & *')
      setLoading(false)
      return
    }

    // 2. 查重校验
    if (newNickname !== profile.nickname) {
      const { data: exist } = await supabase
        .from('users_profile')
        .select('id')
        .eq('nickname', newNickname)
        .neq('id', profile.id) 
        .single()

      if (exist) {
        setMsg('该昵称已被其他玩家使用，请换一个吧')
        setLoading(false)
        return
      }
    }

    // 3. 处理头像上传
    let newAvatarUrl = profile.avatar_url
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `avatar-${profile.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
      
      if (uploadError) {
        setMsg('头像上传失败：' + uploadError.message)
        setLoading(false)
        return
      }
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      newAvatarUrl = publicUrl
    }

    // 4. 执行更新
    const { error } = await supabase.from('users_profile').update({
      nickname: newNickname,
      qq: e.target.qq.value,
      wechat: e.target.wechat.value,
      yy: e.target.yy.value,
      avatar_url: newAvatarUrl // 更新头像链接
    }).eq('id', profile.id)

    setLoading(false)
    if (error) {
      setMsg('更新失败：' + error.message)
    } else {
      setMsg('资料更新成功！')
      setProfile({ 
        ...profile, 
        nickname: newNickname, 
        qq: e.target.qq.value, 
        wechat: e.target.wechat.value, 
        yy: e.target.yy.value,
        avatar_url: newAvatarUrl
      })
      router.refresh()
    }
  }

  async function updatePassword() {
    if (!newPassword) return
    if (newPassword.length < 6) {
      setMsg('密码长度至少6位')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) setMsg(error.message)
    else {
      setMsg('密码修改成功！')
      setNewPassword('')
    }
  }

  if (!profile) return <div className="min-h-screen bg-[#050B14]"></div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-10 bg-[#0A111F]/80 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-md">
        <h1 className="text-2xl font-black text-cyan-400 mb-6 border-b border-gray-800 pb-4">用户中心</h1>
        
        {msg && <div className={`mb-4 p-2 rounded font-bold ${msg.includes('成功') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{msg}</div>}

        <form onSubmit={updateProfile} className="space-y-6 mb-8">
          
          {/* 头像修改区域 */}
          <div className="flex items-center gap-6 pb-6 border-b border-gray-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-black overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">无头像</div>
                )}
              </div>
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full text-xs text-cyan-400 font-bold">
                <span>更换头像</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <h2 className="text-lg text-white font-bold">{profile.username}</h2>
              <p className="text-sm text-gray-500">ID: {profile.id}</p>
            </div>
          </div>

          <h2 className="text-lg text-blue-400">修改基础资料</h2>
          
          <div>
            <label className="block text-xs text-cyan-600 mb-1">昵称（唯一且最多9个字）</label>
            <input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              name="nickname" 
              placeholder="输入新昵称" 
              className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500 transition-colors" 
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-cyan-600 mb-1">QQ</label>
              <input defaultValue={profile.qq || ''} name="qq" placeholder="QQ" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-cyan-600 mb-1">微信</label>
              <input defaultValue={profile.wechat || ''} name="wechat" placeholder="微信" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-cyan-600 mb-1">YY</label>
              <input defaultValue={profile.yy || ''} name="yy" placeholder="YY" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500 transition-colors" />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="bg-blue-600 px-8 py-3 rounded-lg font-black tracking-wider text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all">
            {loading ? '保存中...' : '保存资料'}
          </button>
        </form>

        <div className="space-y-4 pt-8 border-t border-gray-800">
          <h2 className="text-lg text-blue-400">修改登录密码</h2>
          <input 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            placeholder="输入新密码 (至少6位)" 
            className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500 transition-colors" 
          />
          <button onClick={updatePassword} disabled={loading} className="bg-red-600 px-8 py-3 rounded-lg font-black tracking-wider text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 transition-all">
            {loading ? '修改中...' : '修改密码'}
          </button>
        </div>
      </div>
    </div>
  )
}