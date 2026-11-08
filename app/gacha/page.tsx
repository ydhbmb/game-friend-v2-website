'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'

// 抽卡状态类型
type GachaState = 'idle' | 'scanning' | 'revealing' | 'result'

export default function GachaPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // 抽卡状态
  const [gachaState, setGachaState] = useState<GachaState>('idle')
  const [targetPlayer, setTargetPlayer] = useState<any>(null)
  const [rarity, setRarity] = useState<'N' | 'R' | 'SR' | 'SSR'>('N')
  
  // 每日次数限制
  const [remainingChances, setRemainingChances] = useState(5)
  const [maxChances, setMaxChances] = useState(5)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)

      if (profile) {
        // 计算该用户今天的抽卡次数上限
        let limit = 5 // 默认普通玩家
        if (profile.id === 1 || [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999].includes(profile.id)) {
          limit = 20 // 管理员/至尊靓号 20次
        } else if (profile.level >= 50) {
          limit = 15
        } else if (profile.level >= 20) {
          limit = 10
        }
        setMaxChances(limit)

        // 检查今天是否已经抽过卡
        const today = new Date().toISOString().split('T')[0]
        if (profile.last_gacha_at === today) {
          setRemainingChances(limit - (profile.daily_gacha_count || 0))
        } else {
          // 如果今天还没抽过，重置次数
          setRemainingChances(limit)
          await supabase.from('users_profile').update({ daily_gacha_count: 0, last_gacha_at: today }).eq('id', profile.id)
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  // 核心：抽卡逻辑
  async function handleDraw() {
    if (remainingChances <= 0) return alert('今日盲盒次数已耗尽，升级靓号或明天再来吧！')
    
    // 1. 进入扫描动画
    setGachaState('scanning')
    setTargetPlayer(null)

    // 模拟 2 秒雷达扫描动画时间
    setTimeout(async () => {
      try {
        // 2. 从数据库随机捞取一个除了自己以外的玩家
        const { data: players, error } = await supabase
          .from('users_profile')
          .select('*')
          .neq('id', userProfile.id)
          .limit(20) // 先拉20个，然后在前端随机取一个（纯静态架构下的无奈之举，但有效）

        if (error || !players || players.length === 0) {
          setGachaState('idle')
          return alert('雷达未扫描到其他玩家，请稍后再试！')
        }

        // 3. 随机挑选一个幸运儿
        const randomPlayer = players[Math.floor(Math.random() * players.length)]
        setTargetPlayer(randomPlayer)

        // 4. 决定稀有度（算法：根据对方经验和好评率估算）
        const pLvl = calculateLevel(randomPlayer.experience || 0, randomPlayer.id).level
        let r: 'N' | 'R' | 'SR' | 'SSR' = 'N'
        if (pLvl > 60) r = 'SSR'
        else if (pLvl > 30) r = 'SR'
        else if (pLvl > 10) r = 'R'
        setRarity(r)

        // 5. 扣除次数并更新数据库
        const today = new Date().toISOString().split('T')[0]
        const newCount = (userProfile.daily_gacha_count || 0) + 1
        await supabase.from('users_profile').update({ daily_gacha_count: newCount, last_gacha_at: today }).eq('id', userProfile.id)
        
        setUserProfile({ ...userProfile, daily_gacha_count: newCount })
        setRemainingChances(prev => prev - 1)

        // 6. 切换到揭晓状态
        setGachaState('revealing')
        
        // 7. 延迟 0.5 秒后展示卡片
        setTimeout(() => setGachaState('result'), 500)

      } catch (err) {
        setGachaState('idle')
      }
    }, 2000)
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">雷达充能中...</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* 顶部信息 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-orbitron tracking-widest mb-2 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            僚机盲盒
          </h1>
          <p className="text-sm text-cyan-500 font-mono tracking-widest">// 扫描全网，寻找你的天选搭子</p>
        </div>

        {/* 抽卡动画区域 */}
        <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center mb-12">
          
          {/* 雷达底盘（一直旋转） */}
          <div className="absolute inset-0 border-[3px] border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute inset-4 border border-cyan-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
          
          {/* 扫描光束（仅在扫描状态显示） */}
          {gachaState === 'scanning' && (
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(6,182,212,0.8)_0deg,transparent_90deg)] animate-[spin_1s_linear_infinite]"></div>
          )}

          {/* 中心按钮 / 结果展示 */}
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

        {/* 剩余次数提示 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-[#0A111F] border border-cyan-500/30 px-6 py-2 rounded-full font-mono text-sm shadow-lg">
            今日剩余次数: <span className="text-fuchsia-400 font-bold text-lg">{remainingChances}</span> / {maxChances}
          </div>
          {remainingChances <= 0 && (
            <span className="text-xs text-red-400 animate-pulse">次数已耗尽</span>
          )}
        </div>

        {/* 抽卡结果卡片弹窗 */}
        {gachaState === 'result' && targetPlayer && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className={`relative w-full max-w-sm bg-[#0A111F] border-2 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${
              rarity === 'SSR' ? 'border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.5)]' : 
              rarity === 'SR' ? 'border-fuchsia-500 shadow-[0_0_40px_rgba(217,70,239,0.4)]' : 
              'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
            }`}>
              {/* 卡片光效 */}
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

                <div className="flex gap-3 w-full mt-8">
                  <button onClick={() => setGachaState('idle')} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition">收下卡片</button>
                  <button onClick={() => router.push(`/profile?id=${targetPlayer.id}`)} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 shadow-lg transition">查看主页</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}