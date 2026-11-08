'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'

export default function UserCenterPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  // 🔥 成就与称号状态
  const [myAchievements, setMyAchievements] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('users_profile').select('*').eq('auth_id', data.user.id).single().then(({ data: p }) => {
          if (p) {
            setProfile(p)
            setNickname(p.nickname || '')
            setAvatarPreview(p.avatar_url || '')
            fetchAchievements(p.id)
          }
        })
      } else {
        router.push('/login')
      }
    })
  }, [router])

  async function fetchAchievements(userId: number) {
    // 联表查询：查出该用户解锁的所有成就
    const { data } = await supabase
      .from('user_achievements')
      .select(`*, achievement:achievements(*)`)
      .eq('user_id', userId)
    
    if (data) setMyAchievements(data)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 500 * 1024) {
        alert('头像图片不能超过 500KB，请压缩后再上传！')
        e.target.value = ''
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function updateProfile(e: any) {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    const newNickname = e.target.nickname.value.trim()
    if (newNickname.length === 0 || newNickname.length > 9) {
      setMsg('昵称长度必须在 1-9 个字符之间'); setLoading(false); return
    }

    if (newNickname !== profile.nickname) {
      const { data: exist } = await supabase.from('users_profile').select('id').eq('nickname', newNickname).neq('id', profile.id).single()
      if (exist) {
        setMsg('该昵称已被其他玩家使用'); setLoading(false); return
      }
    }

    let newAvatarUrl = profile.avatar_url
    if (avatarFile) {
      const fileName = `avatar-${profile.id}-${Date.now()}.${avatarFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        newAvatarUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('users_profile').update({
      nickname: newNickname,
      qq: e.target.qq.value,
      wechat: e.target.wechat.value,
      yy: e.target.yy.value,
      avatar_url: newAvatarUrl
    }).eq('id', profile.id)

    setLoading(false)
    if (error) {
      setMsg('更新失败：' + error.message)
    } else {
      setMsg('资料更新成功！')
      setProfile({ ...profile, nickname: newNickname, qq: e.target.qq.value, wechat: e.target.wechat.value, yy: e.target.yy.value, avatar_url: newAvatarUrl })
      router.refresh()
    }
  }

  async function updatePassword() {
    if (!newPassword) return
    if (newPassword.length < 6) return setMsg('密码长度至少6位')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) setMsg(error.message)
    else {
      setMsg('密码修改成功！')
      setNewPassword('')
    }
  }

  // 🔥 佩戴称号
  async function equipTitle(title: string | null) {
    setLoading(true)
    const { error } = await supabase.from('users_profile').update({ equipped_title: title }).eq('id', profile.id)
    setLoading(false)
    if (!error) {
      setProfile({ ...profile, equipped_title: title })
      alert(title ? `成功佩戴称号：${title}` : '已隐藏当前称号')
    }
  }

  if (!profile) return <div className="min-h-screen bg-[#050B14]"></div>

  const levelInfo = calculateLevel(profile.experience || 0, profile.id)
  const progressPercent = levelInfo.isMaxLevel ? 100 : Math.min(100, Math.floor((levelInfo.currentLevelExp / levelInfo.nextLevelExp) * 100))

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 pb-20">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 mt-10 bg-[#0A111F]/80 border border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-md">
        <h1 className="text-2xl font-black text-cyan-400 mb-6 border-b border-gray-800 pb-4 font-orbitron">用户中心</h1>
        
        {msg && <div className={`mb-4 p-2 rounded font-bold ${msg.includes('成功') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{msg}</div>}

        {/* 赛博等级面板 */}
        <div className="mb-8 p-5 bg-black/40 border border-cyan-900/50 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-2 relative z-10">
            <div>
              <span className="text-sm text-gray-400">当前头衔</span>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{levelInfo.icon} {levelInfo.name}</h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-white font-orbitron">Lv.{levelInfo.level}</span>
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-xs text-cyan-500 mb-1 font-mono">
              <span>EXP: {profile.experience || 0}</span>
              <span>{levelInfo.isMaxLevel ? '已满级' : `距离升级还需 ${levelInfo.nextLevelExp - levelInfo.currentLevelExp} 经验`}</span>
            </div>
            <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* 🔥 荣誉殿堂 */}
        <div className="mb-8 p-5 bg-gradient-to-br from-fuchsia-900/20 to-transparent border border-fuchsia-500/30 rounded-xl">
          <div className="flex justify-between items-center mb-4 border-b border-fuchsia-500/20 pb-2">
            <h2 className="text-lg font-black text-fuchsia-400 font-orbitron flex items-center gap-2">🏆 荣誉殿堂</h2>
            <button onClick={() => equipTitle(null)} className="text-[10px] text-gray-400 hover:text-white underline">隐藏当前称号</button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {myAchievements.map(a => {
              const isEquipped = profile.equipped_title === a.achievement?.title
              return (
                <div 
                  key={a.id} 
                  onClick={() => equipTitle(a.achievement?.title)}
                  className={`cursor-pointer px-4 py-2 rounded-lg border text-sm transition-all flex flex-col items-center justify-center min-w-[100px] ${
                    isEquipped 
                      ? 'bg-fuchsia-600/30 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.3)] scale-105' 
                      : 'bg-black/40 border-gray-700 text-gray-400 hover:border-fuchsia-500/50'
                  }`}
                >
                  <span className="font-bold text-base mb-1">{a.achievement?.title}</span>
                  <span className="text-[10px] opacity-70">{a.achievement?.name}</span>
                </div>
              )
            })}
            {myAchievements.length === 0 && <p className="text-xs text-gray-500">还没有解锁任何称号，快去社交或签到吧！</p>}
          </div>
        </div>

        <form onSubmit={updateProfile} className="space-y-6 mb-8">
          <div className="flex items-center gap-6 pb-6 border-b border-gray-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-black overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {avatarPreview ? <img src={avatarPreview} alt="头像" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">无头像</div>}
              </div>
              <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full text-xs text-cyan-400 font-bold">
                <span>更换头像</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <h2 className="text-lg text-white font-bold">{profile.username}</h2>
              <p className="text-sm text-gray-500 font-mono">ID: {profile.id}</p>
              <p className="text-xs text-gray-600 mt-1">头像需小于 500KB</p>
            </div>
          </div>

          <h2 className="text-lg text-blue-400 font-orbitron">修改基础资料</h2>
          <div>
            <label className="block text-xs text-cyan-600 mb-1">昵称（唯一且最多9个字）</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} name="nickname" placeholder="输入新昵称" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs text-cyan-600 mb-1">QQ</label><input defaultValue={profile.qq || ''} name="qq" placeholder="QQ" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-cyan-600 mb-1">微信</label><input defaultValue={profile.wechat || ''} name="wechat" placeholder="微信" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500" /></div>
            <div><label className="block text-xs text-cyan-600 mb-1">YY</label><input defaultValue={profile.yy || ''} name="yy" placeholder="YY" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500" /></div>
          </div>
          <button type="submit" disabled={loading} className="bg-blue-600 px-8 py-3 rounded-lg font-black tracking-wider text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all font-orbitron">{loading ? '保存中...' : '保存资料'}</button>
        </form>

        <div className="space-y-4 pt-8 border-t border-gray-800">
          <h2 className="text-lg text-blue-400 font-orbitron">修改登录密码</h2>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="输入新密码 (至少6位)" className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg p-3 text-white outline-none focus:border-cyan-500" />
          <button onClick={updatePassword} disabled={loading} className="bg-red-600 px-8 py-3 rounded-lg font-black tracking-wider text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50 transition-all font-orbitron">{loading ? '修改中...' : '修改密码'}</button>
        </div>
      </div>
    </div>
  )
}