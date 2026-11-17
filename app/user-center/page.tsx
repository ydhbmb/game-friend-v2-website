'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'

export default function UserCenterPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [myAchievements, setMyAchievements] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from('users_profile')
          .select('*')
          .eq('auth_id', data.user.id)
          .single()
          .then(({ data: p }) => {
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
    const { data } = await supabase
      .from('user_achievements')
      .select(`*, achievement:achievements(*)`)
      .eq('user_id', userId)
    if (data) setMyAchievements(data)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('头像不能超过 500KB，请压缩后再上传')
      e.target.value = ''
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function updateProfile(e: any) {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    const newNickname = e.target.nickname.value.trim()
    if (newNickname.length === 0 || newNickname.length > 9) {
      setMsg('昵称长度必须在 1-9 个字符之间')
      setLoading(false)
      return
    }

    if (newNickname !== profile.nickname) {
      const { data: exist } = await supabase
        .from('users_profile')
        .select('id')
        .eq('nickname', newNickname)
        .neq('id', profile.id)
        .maybeSingle()
      if (exist) {
        setMsg('该昵称已被其他玩家使用')
        setLoading(false)
        return
      }
    }

    let newAvatarUrl = profile.avatar_url
    if (avatarFile) {
      const fileName = `avatar-${profile.id}-${Date.now()}.${avatarFile.name
        .split('.')
        .pop()}`
      const { error } = await supabase.storage.from('avatars').upload(fileName, avatarFile)
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        newAvatarUrl = data.publicUrl
      }
    }

    const { error } = await supabase
      .from('users_profile')
      .update({
        nickname: newNickname,
        qq: e.target.qq.value,
        wechat: e.target.wechat.value,
        yy: e.target.yy.value,
        avatar_url: newAvatarUrl,
      })
      .eq('id', profile.id)

    setLoading(false)

    if (error) {
      setMsg('更新失败：' + error.message)
    } else {
      setMsg('资料已更新')
      setProfile({
        ...profile,
        nickname: newNickname,
        qq: e.target.qq.value,
        wechat: e.target.wechat.value,
        yy: e.target.yy.value,
        avatar_url: newAvatarUrl,
      })
      setNickname(newNickname)
      setAvatarFile(null)
      router.refresh()
    }
  }

  async function updatePassword() {
    if (!newPassword) return
    if (newPassword.length < 6) return setMsg('密码至少 6 位')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMsg(error.message)
    } else {
      setMsg('密码已修改')
      setNewPassword('')
    }
  }

  async function equipTitle(title: string | null) {
    setLoading(true)
    const { error } = await supabase
      .from('users_profile')
      .update({ equipped_title: title })
      .eq('id', profile.id)
    setLoading(false)
    if (!error) {
      setProfile({ ...profile, equipped_title: title })
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  const levelInfo = calculateLevel(profile.experience || 0, profile.id)
  const progressPercent = levelInfo.isMaxLevel
    ? 100
    : Math.min(
        100,
        Math.floor((levelInfo.currentLevelExp / levelInfo.nextLevelExp) * 100)
      )

  const inputCls =
    'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] pb-20">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        <div className="mb-4">
          <h1 className="text-xl font-semibold text-white">用户中心</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            管理你的资料、头像与称号
          </p>
        </div>

        {msg && (
          <p
            className={`text-[11.5px] rounded-lg px-3 py-2 mb-4 border ${
              msg.includes('失败') || msg.includes('至少') || msg.includes('必须') || msg.includes('已被')
                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
            }`}
          >
            {msg}
          </p>
        )}

        <Card className="mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full bg-black overflow-hidden border border-white/[0.08]">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="头像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[#4A5768]">
                    无头像
                  </div>
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[10px] text-cyan-400 font-medium">
                更换
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <div className="min-w-0">
              <p className="text-[14px] font-medium text-white truncate">
                {profile.username}
              </p>
              <p className="text-[11px] text-[#5C6B7F] font-mono mt-0.5">
                ID:{profile.id}
              </p>
              <p className="text-[10.5px] text-[#4A5768] mt-1">头像需小于 500KB</p>
            </div>
          </div>

          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge tone="accent">Lv.{levelInfo.level}</Badge>
                <span className="text-[12px] text-[#94A3B8] truncate">
                  {levelInfo.name}
                </span>
              </div>
              <span className="text-[11px] text-cyan-400 tabular-nums shrink-0">
                {profile.experience || 0} EXP
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-[#4A5768] mt-2 tabular-nums">
              {levelInfo.isMaxLevel
                ? '已达最高等级'
                : `距下一级还需 ${levelInfo.nextLevelExp - levelInfo.currentLevelExp} 经验`}
            </p>
          </div>
        </Card>

        <Card className="mb-4">
          <SectionTitle
            action={
              profile.equipped_title ? (
                <button
                  onClick={() => equipTitle(null)}
                  className="text-[11px] text-[#5C6B7F] hover:text-[#94A3B8] transition-colors"
                >
                  隐藏当前称号
                </button>
              ) : undefined
            }
          >
            荣誉殿堂
          </SectionTitle>

          {myAchievements.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {myAchievements.map((a) => {
                const isEquipped = profile.equipped_title === a.achievement?.title
                return (
                  <button
                    key={a.id}
                    onClick={() => equipTitle(a.achievement?.title)}
                    className={`px-2.5 py-1.5 rounded-md border text-left transition-colors ${
                      isEquipped
                        ? 'bg-cyan-500/12 border-cyan-500/30'
                        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                  >
                    <span
                      className={`block text-[12px] font-medium ${
                        isEquipped ? 'text-cyan-300' : 'text-[#E8EFF7]'
                      }`}
                    >
                      {a.achievement?.title}
                    </span>
                    <span className="block text-[10px] text-[#4A5768] mt-0.5">
                      {a.achievement?.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-[11.5px] text-[#4A5768]">
              还没有解锁任何称号，去社交或签到吧
            </p>
          )}
        </Card>

        <Card className="mb-4">
          <SectionTitle>基础资料</SectionTitle>

          <form onSubmit={updateProfile} className="space-y-3">
            <div>
              <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                昵称 <span className="text-[#4A5768]">（唯一，最多 9 字）</span>
              </label>
              <input
                name="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入新昵称"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">QQ</label>
                <input
                  name="qq"
                  defaultValue={profile.qq || ''}
                  placeholder="选填"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">微信</label>
                <input
                  name="wechat"
                  defaultValue={profile.wechat || ''}
                  placeholder="选填"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">YY</label>
                <input
                  name="yy"
                  defaultValue={profile.yy || ''}
                  placeholder="选填"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="pt-1">
              <Button type="submit" variant="primary" loading={loading}>
                保存资料
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <SectionTitle>登录密码</SectionTitle>
          <div className="space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（至少 6 位）"
              className={inputCls}
            />
            <Button
              variant="danger"
              onClick={updatePassword}
              disabled={loading || !newPassword}
            >
              修改密码
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
