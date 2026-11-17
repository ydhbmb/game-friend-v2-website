'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Leaderboard from '@/components/Leaderboard'
import GameFilter from '@/components/GameFilter'
import ModalCreateGame from '@/components/ModalCreateGame'
import SectionTitle from '@/components/ui/SectionTitle'
import EmptyState from '@/components/ui/EmptyState'

export default function HomePage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [activeKeyword, setActiveKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users_profile')
          .select('*')
          .eq('auth_id', user.id)
          .single()
        if (data) setUserProfile(data)
      }

      await fetchGames()

      const { data: lData } = await supabase
        .from('users_profile')
        .select('id, nickname, avatar_url, experience')
        .order('experience', { ascending: false })
        .limit(10)
      if (lData) setLeaderboard(lData)

      setLoading(false)
    }
    init()
  }, [])

  async function fetchGames(keyword = '') {
    setGamesLoading(true)
    let query = supabase
      .from('games')
      .select(`*, creator:users_profile(nickname)`)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    if (keyword) query = query.ilike('name', `%${keyword}%`)

    const { data } = await query
    if (data) setGames(data)
    setActiveKeyword(keyword)
    setGamesLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/70 via-[#050B14]/92 to-[#050B14]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16">

          <div className="w-full flex justify-center mb-7 md:mb-9">
            <img
              src="/banner.png"
              alt="Wingman Radar"
              className="w-full max-w-2xl object-contain rounded-lg"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-5 lg:gap-7">
            <Leaderboard leaderboard={leaderboard} loading={loading} />

            <div className="w-full lg:flex-1 min-w-0">
              <SectionTitle
                count={gamesLoading ? '同步中' : `${games.length} 个节点`}
              >
                游戏大厅
              </SectionTitle>

              <GameFilter
                search={search}
                setSearch={setSearch}
                onSearch={(kw) => fetchGames(kw ?? search)}
                loading={gamesLoading}
                onCreateClick={() => setIsModalOpen(true)}
              />

              {gamesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]"
                    >
                      <div className="aspect-video bg-white/[0.03]" />
                      <div className="p-3.5 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                        <div className="h-2.5 w-1/3 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : games.length === 0 ? (
                <EmptyState
                  title={
                    activeKeyword
                      ? `没有找到「${activeKeyword}」相关的游戏`
                      : '还没有游戏节点'
                  }
                  description={
                    activeKeyword
                      ? '换个关键词试试，或者直接创建一个新节点'
                      : '创建第一个节点，开始召集搭子'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {games.map((game) => (
                    <Link
                      key={game.id}
                      href={`/game?id=${game.id}`}
                      className="group rounded-xl overflow-hidden border border-white/[0.06] bg-[#0A111F]/60 hover:border-white/[0.14] hover:bg-[#0D1626] transition-colors"
                    >
                      <div className="aspect-video w-full bg-black/50 relative overflow-hidden">
                        {game.cover_url ? (
                          <img
                            src={game.cover_url}
                            alt={game.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/15">
                            暂无封面
                          </div>
                        )}
                      </div>
                      <div className="p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[14px] font-semibold text-[#E8EFF7] truncate">
                            {game.name}
                          </h3>
                          <span className="text-[#5C6B7F] group-hover:text-cyan-400 transition-colors text-[11px] shrink-0">
                            →
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C6B7F] mt-1 truncate">
                          {game.creator?.nickname
                            ? `创建者 ${game.creator.nickname}`
                            : '未知创建者'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <ModalCreateGame
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchGames(activeKeyword)}
          currentUserId={userProfile?.id}
        />
      </div>
    </div>
  )
}
