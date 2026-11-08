'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'

type GachaState = 'idle' | 'scanning' | 'revealing' | 'result'

export default function GachaPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [gachaState, setGachaState] = useState<GachaState>('idle')
  const [targetPlayer, setTargetPlayer] = useState<any>(null)
  const [rarity, setRarity] = useState<'N' | 'R' | 'SR' | 'SSR'>('N')
  
  // 每日次数限制
  const [remainingChances, setRemainingChances] = useState(5)
  const [maxChances, setMaxChances] = useState(5)

  // 关注状态
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)

      if (profile) {
        let limit = 5 
        if (profile.id === 1 || [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999].includes(profile.id)) {
          limit = 20 
        } else if (profile.level >= 50) {
          limit = 15
        } else if (profile.level >= 20) {
          limit = 10
        }
        setMaxChances(limit)

        const today = new Date().toISOString().split('T')[0]
        if (profile.last_gacha_at === today) {
          setRemainingChances(limit - (profile.daily_gacha_count || 0))
        } else {
          setRemainingChances(limit)
          await supabase.from('users_profile').update({ daily_gacha_count: 0, last_gacha_at: today }).eq('id', profile.id)
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  // 🔥 检查是否已经关注了抽到的人
  useEffect(() => {
    if (targetPlayer && userProfile) {
      supabase.from('follows')
        .select('id')
        .eq('follower_id', userProfile.id)
        .eq('following_id', targetPlayer.id)
        .single()
        .then(({ data }) => {
          setIsFollowing(!!data)
        })
    }
  }, [targetPlayer, userProfile])

  async function handleDraw() {
    if (remainingChances <= 0) return alert('今日盲盒次数已耗尽，升级靓号或明天再来吧！')
    
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
          return alert('雷达未扫描到其他玩家，请稍后再试！')
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
        await supabase.from('users_profile').update({ daily_gacha_count: newCount, last_gacha_at: today }).eq('id', userProfile.id)
        
        setUserProfile({ ...userProfile, daily_gacha_count: newCount })
        setRemainingChances(prev => prev - 1)

        setGachaState('revealing')
        setTimeout(() => setGachaState('result'), 500)

      } catch (err) {
        setGachaState('idle')
      }
    }, 2000)
  }

  // 处理关注逻辑
  async function handleFollow() {
    if (!userProfile || !targetPlayer) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', userProfile.id).eq('following_id', targetPlayer.id)
        setIsFollowing(false)
      } else {
        await supabase.from('follows').insert({ follower_id: userProfile.id, following_id: targetPlayer.id })
        await supabase.from('notifications').insert({ user_id: targetPlayer.id, actor_id: userProfile.id, type: 'follow' })
        setIsFollowing(true)
        alert('关注成功！可以去主页查看 TA 的常玩游戏了。')
      }
    } catch (err) {
      console.error(err)
    }
    setFollowLoading(false)
  }

  // 处理私信（关闭弹窗并唤起悬浮聊天窗）
  function handleSendMsg() {
    if (!targetPlayer) return
    setGachaState('idle')
    // 这里为了简化体验，直接跳转到带目标 ID 的消息页面。
    // 如果你想让右下角的悬浮窗直接弹出来并选中这个人，需要用到我们之前做好的 ChatWidget 事件，这里暂时先跳转。
    router.push(`/messages?target=${targetPlayer.id}`)
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">雷达充能中...</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden font-sans flex flex-col">
      {/* 雷达背景特效 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 via-[#050B14]/60 to-[#050B14]"></div>
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-orbitron tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            僚机盲盒
          </h1>
          <p className="text-sm text-cyan-500 font-mono tracking-widest">// 扫描全网，寻找你的天选搭子</p>
        </div>

        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-12">
          
          <div className="absolute inset-0 border-[3px] border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-4 border border-cyan-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
          
          {gachaState === 'scanning' && (
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(6,182,212,0.8)_0deg,transparent_90deg)] animate-[spin_1s_linear_infinite]"></div>
          )}

          <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 bg-[#0A111F] rounded-full border-2 border-cyan-500/50 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            {gachaState === 'idle' && (
              <button onClick={handleDraw} className="w-32 h-32 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-full text-white font-black font-orbitron tracking-widest hover:scale-105 transition-transform shadow-[0_0_30px_rgba(217,70,239,0.6)] animate-pulse">
                开始扫描
              </button>
            )}
            {gachaState === 'scanning' && (
              <div className="text-cyan-400 font-orbitron text-xl font-bold animate-pulse">扫描中...</div>
            )}
            {(gachaState === 'revealing' || gachaState === 'result') && targetPlayer && (
              <div className={`text-5xl font-black font-orbitron ${rarity === 'SSR' ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]' : rarity === 'SR' ? 'text-fuchsia-400 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]' : 'text-cyan-400'}`}>
                {rarity}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="bg-[#0A111F] border border-cyan-500/30 px-6 py-2 rounded-full font-mono text-sm shadow-lg">
            今日剩余次数: <span className="text-fuchsia-400 font-bold text-lg">{remainingChances}</span> / {maxChances}
          </div>
          {remainingChances <= 0 && <span className="text-xs text-red-400 animate-pulse">次数已耗尽</span>}
        </div>

        {gachaState === 'result' && targetPlayer && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className={`relative w-full max-w-sm bg-[#0A111F] border-2 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${
              rarity === 'SSR' ? 'border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.5)]' : 
              rarity === 'SR' ? 'border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.4)]' : 
              'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
            }`}>
              <div className={`absolute top-0 left-0 w-full h-2 ${rarity === 'SSR' ? 'bg-yellow-400' : rarity === 'SR' ? 'bg-fuchsia-500' : 'bg-cyan-500'}`}></div>
              
              <div className="flex flex-col items-center mt-4">
                <img src={targetPlayer.avatar_url || '/logo.png'} className="w-24 h-24 rounded-full border-4 border-gray-700 object-cover mb-4" />
                <h2 className="text-2xl font-black text-white font-orbitron">{targetPlayer.nickname}</h2>
                <p className="text-xs text-cyan-500 font-mono mt-1">ID: {targetPlayer.id} · {targetPlayer.gender}</p>
                
                <div className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 mt-6 space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">当前等级</span><span className="text-white font-bold">Lv.{calculateLevel(targetPlayer.experience || 0, targetPlayer.id).level}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">当前头衔</span><span className="text-cyan-400">{calculateLevel(targetPlayer.experience || 0, targetPlayer.id).name}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">联系方式</span><span className="text-gray-300">{targetPlayer.qq || targetPlayer.wechat || '未公开'}</span></p>
                </div>

                {/* 🔥 新增：交互按钮区 */}
                <div className="flex gap-2 w-full mt-6">
                  <button 
                    onClick={handleFollow} 
                    disabled={followLoading}
                    className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                      isFollowing 
                        ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/50' 
                        : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]'
                    }`}
                  >
                    {isFollowing ? '✅ 已关注' : '+ 关注'}
                  </button>
                  
                  <button 
                    onClick={handleSendMsg} 
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition flex items-center justify-center gap-1"
                  >
                    ✉️ 私信
                  </button>
                </div>

                <div className="flex gap-2 w-full mt-3">
                  <button 
                    onClick={() => router.push(`/profile?id=${targetPlayer.id}`)} 
                    className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition"
                  >
                    查看主页
                  </button>
                  <button 
                    onClick={() => setGachaState('idle')} 
                    className="flex-1 bg-transparent border border-cyan-500/30 text-cyan-400 py-3 rounded-xl font-bold hover:bg-cyan-500/10 transition"
                  >
                    🎰 继续盲盒
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}