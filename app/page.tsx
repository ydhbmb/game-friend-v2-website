'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Leaderboard from '@/components/Leaderboard'
import GameFilter from '@/components/GameFilter'

export default function HomePage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
        if (data) setUserProfile(data)
      }
      await fetchGames()
      
      const { data: lData } = await supabase.from('users_profile').select('id, nickname, avatar_url, experience').order('experience', { ascending: false }).limit(10)
      if (lData) setLeaderboard(lData)
      
      setLoading(false)
    }
    init()
  }, [])

  async function fetchGames(keyword = '') {
    let query = supabase.from('games').select(`*, creator:users_profile(nickname)`).is('parent_id', null).order('created_at', { ascending: false })
    if (keyword) query = query.ilike('name', `%${keyword}%`)
    const { data } = await query
    if (data) setGames(data)
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/60 via-[#050B14]/80 to-[#050B14]"></div>
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1400px] mx-auto p-4 md:p-6 pt-8">
          <div className="w-full flex justify-center mb-12">
            <img src="/banner.png" alt="Wingman Radar" className="w-full max-w-4xl object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse-glow rounded-2xl" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <Leaderboard leaderboard={leaderboard} />

            <div className="w-full lg:w-3/4">
              <GameFilter search={search} setSearch={setSearch} onSearch={() => fetchGames(search)} loading={loading} onCreateClick={() => setIsModalOpen(true)} />

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {games.map(game => (
                  <Link key={game.id} href={`/game?id=${game.id}`} className="group bg-[#0A111F]/80 rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-400 transition-all hover:-translate-y-1">
                    <div className="h-40 w-full bg-black relative">
                      {game.cover_url ? <img src={game.cover_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition" /> : <div className="absolute inset-0 flex items-center justify-center opacity-20 bg-[url('/logo.png')] bg-center bg-contain"></div>}
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-xl text-white group-hover:text-cyan-400 transition">{game.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}