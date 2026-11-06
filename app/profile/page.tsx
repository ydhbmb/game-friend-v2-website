'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetId = searchParams.get('id')

  const [profile, setProfile] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!targetId) return
      const { data: pData } = await supabase.from('users_profile').select('*').eq('id', targetId).single()
      if (pData) setProfile(pData)

      const { data: rData } = await supabase.from('recruits').select(`*, games(name)`).eq('creator_id', targetId).order('created_at', { ascending: false })
      if (rData) setRecruits(rData)

      setLoading(false)
    }
    fetchProfile()
  }, [targetId])

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">数据接入中...</div>
  if (!profile) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-500">该玩家不存在或已注销</div>

  const lvl = calculateLevel(profile.experience || 0, profile.id)
  const progressPercent = lvl.isMaxLevel ? 100 : Math.min(100, Math.floor((lvl.currentLevelExp / lvl.nextLevelExp) * 100))

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10 relative z-10">
        <div className="bg-[#0A111F]/80 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-lg mb-8">
          <img src={profile.avatar_url || '/logo.png'} className="w-32 h-32 rounded-full border-4 border-cyan-500/50 object-cover shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-black" />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-black text-white font-orbitron mb-1">{profile.nickname}</h1>
            <p className="text-sm text-gray-400 font-mono mb-4">ID: {profile.id} · {profile.gender}</p>
            
            <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
              <div className="flex justify-between items-end mb-2">
                <span className="text-cyan-400 font-bold">{lvl.icon} {lvl.name}</span>
                <span className="text-2xl font-black text-white font-orbitron">Lv.{lvl.level}</span>
              </div>
              <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                <span>EXP: {profile.experience || 0}</span>
                <span>{lvl.isMaxLevel ? '满级' : `还需 ${lvl.nextLevelExp - lvl.currentLevelExp} 升级`}</span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-black text-cyan-400 font-orbitron mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-cyan-400 rounded-full"></span> 历史招募通缉
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recruits.map(r => (
            <div key={r.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl hover:border-cyan-500/50 transition cursor-pointer" onClick={() => router.push(`/game?id=${r.game_id}`)}>
               <p className="text-xs text-cyan-500 mb-2 truncate">游戏: {r.games?.name}</p>
               <p className="font-bold text-white mb-2 line-clamp-1">{r.play_content}</p>
               <p className="text-xs text-gray-400">平台: {r.platform} | 区服: {r.server_region}</p>
            </div>
          ))}
          {recruits.length === 0 && <p className="text-gray-500 col-span-full">该玩家还没有发布过招募。</p>}
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500">加载中...</div>}>
      <ProfileContent />
    </Suspense>
  )
}