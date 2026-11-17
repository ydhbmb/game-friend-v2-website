'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

type GachaState = 'idle' | 'scanning' | 'revealing' | 'result'

const RARITY_STYLE: Record<string, { label: string; color: string; bar: string }> = {
  N: { label: 'N', color: 'text-[#94A3B8]', bar: 'bg-white/20' },
  R: { label: 'R', color: 'text-cyan-400', bar: 'bg-cyan-500' },
  SR: { label: 'SR', color: 'text-fuchsia-400', bar: 'bg-fuchsia-500' },
  SSR: { label: 'SSR', color: 'text-amber-400', bar: 'bg-amber-400' },
}

export default function GachaPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [gachaState, setGachaState] = useState<GachaState>('idle')
  const [targetPlayer, setTargetPlayer] = useState<any>(null)
  const [rarity, setRarity] = useState<'N' | 'R' | 'SR' | 'SSR'>('N')

  const [remainingChances, setRemainingChances] = useState(5)
  const [maxChances, setMaxChances] = useState(5)

  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users_profile')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      setUserProfile(profile)

      if (profile) {
        const myLevel = calculateLevel(profile.experience || 0, profile.id).level
        const specialIds = [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]

        let limit = 5
        if (profile.id === 1 || specialIds.includes(profile.id)) limit = 20
        else if (myLevel >= 50) limit = 15
        else if (myLevel >= 20) limit = 10

        setMaxChances(limit)

        const today = new Date().toISOString().split('T')[0]
        if (profile.last_gacha_at === today) {
          setRemainingChances(Math.max(0, limit - (profile.daily_gacha_count || 0)))
        } else {
          setRemainingChances(limit)
          await supabase
            .from('users_profile')
            .update({ daily_gacha_count: 0, last_gacha_at: today })
            .eq('id', profile.id)
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (targetPlayer && userProfile) {
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userProfile.id)
        .eq('following_id', targetPlayer.id)
        .maybeSingle()
        .then(({ data }) => setIsFollowing(!!data))
    }
  }, [targetPlayer, userProfile])

  async function handleDraw() {
    if (remainingChances <= 0) return alert('今日次数已用完，明天再来吧')

    setGachaState('scanning')
    setTargetPlayer(null)

    setTimeout(async () => {
      try {
        const { data: players, error } = await supabase
          .from('users_profile')
          .select('*')
          .neq('id', userProfile.id)
          .limit(20)

        if (error || !players || players.length === 0) {
          setGachaState('idle')
          return alert('雷达未扫描到其他玩家，请稍后再试')
        }

        const randomPlayer = players[Math.floor(Math.random() * players.length)]
        setTargetPlayer(randomPlayer)

        const pLvl = calculateLevel(randomPlayer.experience || 0, randomPlayer.id).level
        let r: 'N' | 'R' | 'SR' | 'SSR' = 'N'
        if (pLvl > 60) r = 'SSR'
        else if (pLvl > 30) r = 'SR'
        else if (pLvl > 10) r = 'R'
        setRarity(r)

        const today = new Date().toISOString().split('T')[0]
        const newCount = (userProfile.daily_gacha_count || 0) + 1
        await supabase
          .from('users_profile')
          .update({ daily_gacha_count: newCount, last_gacha_at: today })
          .eq('id', userProfile.id)

        setUserProfile({ ...userProfile, daily_gacha_count: newCount })
        setRemainingChances((prev) => Math.max(0, prev - 1))

        setGachaState('revealing')
        setTimeout(() => setGachaState('result'), 420)
      } catch {
        setGachaState('idle')
      }
    }, 1600)
  }

  async function handleFollow() {
    if (!userProfile || !targetPlayer) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userProfile.id)
          .eq('following_id', targetPlayer.id)
        setIsFollowing(false)
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: userProfile.id, following_id: targetPlayer.id })
        await supabase
          .from('notifications')
          .insert({
            user_id: targetPlayer.id,
            actor_id: userProfile.id,
            type: 'follow',
          })
        setIsFollowing(true)
      }
    } catch (err) {}
    setFollowLoading(false)
  }

  function handleSendMsg() {
    if (!targetPlayer) return
    setGachaState('idle')
    router.push(`/messages?target=${targetPlayer.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  const targetLvl = targetPlayer
    ? calculateLevel(targetPlayer.experience || 0, targetPlayer.id)
    : null

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 to-[#050B14]" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">

          <div className="text-center mb-7">
            <h1 className="text-xl font-semibold text-white">僚机盲盒</h1>
            <p className="text-[11.5px] text-[#5C6B7F] mt-1.5">
              扫描全网，随机匹配一位玩家
            </p>
          </div>

          <div className="relative w-[240px] h-[240px] md:w-[280px] md:h-[280px] flex items-center justify-center mb-7">

            <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
            <div className="absolute inset-6 rounded-full border border-white/[0.04]" />

            {gachaState === 'scanning' && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(34,211,238,0.35) 0deg, transparent 100deg)',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}

            <div className="relative z-10 w-[168px] h-[168px] md:w-[200px] md:h-[200px] rounded-full bg-[#0A111F] border border-white/[0.08] flex flex-col items-center justify-center">
              {gachaState === 'idle' && (
                <button
                  onClick={handleDraw}
                  disabled={remainingChances <= 0}
                  className="w-[112px] h-[112px] rounded-full bg-cyan-600 text-white text-[13px] font-medium hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  开始扫描
                </button>
              )}

              {gachaState === 'scanning' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                  <span className="text-[11.5px] text-[#5C6B7F]">扫描中</span>
                </div>
              )}

              {(gachaState === 'revealing' || gachaState === 'result') && targetPlayer && (
                <span
                  className={`text-3xl font-semibold tracking-wide ${RARITY_STYLE[rarity].color}`}
                >
                  {RARITY_STYLE[rarity].label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11.5px] text-[#5C6B7F]">今日剩余次数</span>
            <span className="text-[13px] text-[#E8EFF7] tabular-nums font-medium">
              {remainingChances} / {maxChances}
            </span>
          </div>

          {remainingChances <= 0 && (
            <p className="text-[11px] text-[#4A5768]">次数已用完，明天再来</p>
          )}
        </main>
      </div>

      {gachaState === 'result' && targetPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className={`h-1 w-full ${RARITY_STYLE[rarity].bar}`} />

            <div className="px-5 py-5 flex flex-col items-center">
              <img
                src={targetPlayer.avatar_url || '/logo.png'}
                alt={targetPlayer.nickname}
                className="w-16 h-16 rounded-full object-cover bg-black border border-white/[0.08] mb-3"
              />
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-white">
                  {targetPlayer.nickname}
                </h2>
                <Badge tone={rarity === 'SSR' ? 'warn' : rarity === 'SR' ? 'danger' : 'accent'}>
                  {rarity}
                </Badge>
              </div>
              <p className="text-[10.5px] text-[#4A5768] font-mono mt-1">
                ID:{targetPlayer.id} · {targetPlayer.gender || '保密'}
              </p>

              <div className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 mt-4 space-y-1.5">
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-[#5C6B7F]">等级</span>
                  <span className="text-[#E8EFF7] tabular-nums">Lv.{targetLvl?.level}</span>
                </div>
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-[#5C6B7F]">头衔</span>
                  <span className="text-[#94A3B8] truncate ml-3 text-right">
                    {targetLvl?.name}
                  </span>
                </div>
                <div className="flex justify-between text-[11.5px]">
                  <span className="text-[#5C6B7F]">联系方式</span>
                  <span className="text-[#94A3B8] truncate ml-3 text-right">
                    {targetPlayer.qq || targetPlayer.wechat || '未公开'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 w-full mt-4">
                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  full
                  loading={followLoading}
                  onClick={handleFollow}
                >
                  {isFollowing ? '已关注' : '+ 关注'}
                </Button>
                <Button variant="secondary" full onClick={handleSendMsg}>
                  私信
                </Button>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  full
                  onClick={() => router.push(`/profile?id=${targetPlayer.id}`)}
                >
                  查看主页
                </Button>
                <Button variant="ghost" full onClick={() => setGachaState('idle')}>
                  再抽一次
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
