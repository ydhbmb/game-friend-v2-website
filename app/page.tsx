'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'

export default function HomePage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([]) 
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [createMsg, setCreateMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
          if (data) setUserProfile(data)
        }
        await fetchGames()
        await fetchLeaderboard()
      } catch (err) {
        console.error("初始化数据报错:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchGames(keyword = '') {
    try {
      let query = supabase.from('games').select(`*, creator:users_profile(nickname)`).order('created_at', { ascending: false })
      if (keyword) query = query.ilike('name', `%${keyword}%`)
      const { data, error } = await query
      if (!error && data) setGames(data)
    } catch (err) {}
  }

  async function fetchLeaderboard() {
    try {
      const { data } = await supabase.from('users_profile').select('id, nickname, avatar_url, experience').order('experience', { ascending: false }).limit(30)
      if (data) {
        const hiddenAdminIds = [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]
        const filteredData = data.filter(user => !hiddenAdminIds.includes(user.id) || user.id === 1)
        setLeaderboard(filteredData.slice(0, 10))
      }
    } catch (err) {}
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0])
      setCoverPreview(URL.createObjectURL(e.target.files[0]))
    }
  }

  async function handleCreateGame() {
    if (!newGameName.trim()) return setCreateMsg('请输入游戏名称')
    if (!userProfile) return setCreateMsg('请先登录')
    setUploading(true)
    let coverUrl = ''
    try {
      if (coverFile) {
        const fileName = `game-${Date.now()}.${coverFile.name.split('.').pop()}`
        const { error } = await supabase.storage.from('game_covers').upload(fileName, coverFile)
        if (!error) {
          const { data } = supabase.storage.from('game_covers').getPublicUrl(fileName)
          coverUrl = data.publicUrl
        }
      }
      await supabase.from('games').insert({ name: newGameName, creator_id: userProfile.id, cover_url: coverUrl })
      setIsModalOpen(false); setNewGameName(''); setCoverFile(null); setCoverPreview(''); fetchGames() 
    } catch (err: any) {
      setCreateMsg('创建失败：' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293733_1px,transparent_1px),linear-gradient(to_bottom,#1f293733_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1400px] mx-auto p-4 md:p-6 pt-8">
          <div className="w-full flex justify-center mb-8 md:mb-12 relative">
            <img src="/banner.png" alt="Wingman Games" className="w-full max-w-4xl object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
          </div>

          {/* 手机端这里使用 flex-col 堆叠，电脑端 flex-row 左右排列 */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            
            {/* 左侧（手机端上方）：排行榜面板 */}
            <div className="w-full lg:w-1/4 flex-shrink-0">
              <div className="bg-[#0A111F]/80 backdrop-blur-md border border-cyan-900/50 rounded-2xl p-5 shadow-lg lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-4 md:mb-6 border-b border-cyan-900/50 pb-3 md:pb-4">
                  <span className="text-xl">🏆</span>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">荣耀排行榜</h2>
                </div>
                
                <div className="space-y-3">
                  {leaderboard.map((user, index) => {
                    const lvl = calculateLevel(user.experience, user.id)
                    const isTop1 = index === 0
                    
                    return (
                      <div key={user.id} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                          isTop1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-cyan-900/20'
                        }`}>
                        <div className={`w-6 text-center font-black italic ${isTop1 ? 'text-yellow-400 text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-gray-600'}`}>{index + 1}</div>
                        <div className="relative">
                          <img src={user.avatar_url || '/logo.png'} className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-gray-700 object-cover" />
                          {user.id === 1 && <span className="absolute -top-3 -left-2 text-sm drop-shadow-md">👑</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-sm font-bold truncate ${isTop1 ? 'text-yellow-400' : 'text-gray-200'}`}>{user.nickname}</p>
                            <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">Lv.{lvl.level}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-[10px] text-gray-400 font-mono truncate">{lvl.icon} {lvl.name}</p>
                            <p className="text-[10px] text-cyan-500 font-mono whitespace-nowrap">EXP: {user.experience}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 右侧（手机端下方）：游戏大厅 */}
            <div className="w-full lg:w-3/4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-wider flex items-center gap-3">
                  <span className="w-2 h-6 md:h-8 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                  游戏接入点
                </h2>
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                  <div className="flex-1 md:flex-none relative flex items-center bg-[#0A111F] border border-cyan-900/50 rounded-xl px-3 md:px-4 py-2 md:py-3 focus-within:border-cyan-400 transition-all">
                    <span className="text-cyan-500 mr-2 text-sm md:text-base">🔍</span>
                    <input className="bg-transparent border-none outline-none w-full md:w-48 text-xs md:text-sm text-white placeholder-gray-600" placeholder="搜索游戏..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchGames(search)} />
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-3 md:px-5 py-2 md:py-3 rounded-xl font-black text-xs md:text-sm tracking-wider hover:bg-blue-500 transition-all whitespace-nowrap">+ 创建</button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {games.map(game => (
                    <div key={game.id} className="relative group bg-[#0A111F] rounded-xl md:rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-400/80 transition-all duration-300 transform hover:-translate-y-1">
                      <Link href={`/game/${game.id}`} className="block relative z-10">
                        <div className="h-32 md:h-40 w-full bg-black relative overflow-hidden flex items-center justify-center">
                          {game.cover_url ? (
                            <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition duration-700" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain opacity-20 grayscale"></div>
                          )}
                        </div>
                        <div className="p-3 md:p-4 relative">
                          <h3 className="font-black text-base md:text-lg text-white mb-1 truncate">{game.name}</h3>
                          <p className="text-[10px] md:text-xs text-gray-500 font-mono truncate">CREATOR: <span className="text-blue-400">{game.creator?.nickname || 'UNKNOWN'}</span></p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 弹窗部分保持不变，为了字数精简这里省略，保留你本地原来的弹窗即可 */}
    </div>
  )
}