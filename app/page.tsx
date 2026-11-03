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
    } catch (err) {
      console.error("获取游戏列表失败:", err)
    }
  }

  async function fetchLeaderboard() {
    try {
      const { data } = await supabase
        .from('users_profile')
        .select('id, nickname, avatar_url, experience')
        .order('experience', { ascending: false })
        .limit(30)
        
      if (data) {
        const hiddenAdminIds = [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]
        const filteredData = data.filter(user => !hiddenAdminIds.includes(user.id) || user.id === 1)
        setLeaderboard(filteredData.slice(0, 10))
      }
    } catch (err) {
      console.error("获取排行榜失败:", err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  async function handleCreateGame() {
    if (!newGameName.trim()) return setCreateMsg('请输入游戏名称')
    if (!userProfile) return setCreateMsg('请先登录')

    setUploading(true)
    let coverUrl = ''

    try {
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop()
        const fileName = `game-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, coverFile)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName)
        coverUrl = publicUrl
      }

      const { error } = await supabase.from('games').insert({
        name: newGameName,
        creator_id: userProfile.id,
        cover_url: coverUrl
      })
      if (error) throw error

      setIsModalOpen(false)
      setNewGameName('')
      setCoverFile(null)
      setCoverPreview('')
      setCreateMsg('')
      fetchGames() 
    } catch (err: any) {
      setCreateMsg('创建失败：' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleUpdateCover(gameId: number, e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault()
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `game-${gameId}-${Date.now()}.${fileExt}`
    
    try {
      const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName)
      await supabase.from('games').update({ cover_url: publicUrl }).eq('id', gameId)
      fetchGames()
    } catch (err: any) {
      alert('上传失败：' + err.message)
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
          <div className="w-full flex justify-center mb-12 relative">
            <img src="/banner.png" alt="Wingman Games" className="w-full max-w-4xl object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* 左侧：排行榜面板 */}
            <div className="w-full lg:w-1/4 flex-shrink-0">
              <div className="sticky top-24 bg-[#0A111F]/80 backdrop-blur-md border border-cyan-900/50 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-6 border-b border-cyan-900/50 pb-4">
                  <span className="text-xl">🏆</span>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">荣耀排行榜</h2>
                </div>
                
                <div className="space-y-3">
                  {leaderboard.map((user, index) => {
                    const lvl = calculateLevel(user.experience, user.id)
                    const isTop1 = index === 0
                    const isTop2 = index === 1
                    const isTop3 = index === 2
                    
                    return (
                      <div key={user.id} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                          isTop1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 
                          isTop2 ? 'bg-gray-300/10 border border-gray-400/30' : 
                          isTop3 ? 'bg-orange-500/10 border border-orange-500/30' : 'hover:bg-cyan-900/20'
                        }`}>
                        <div className={`w-6 text-center font-black italic ${
                          isTop1 ? 'text-yellow-400 text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 
                          isTop2 ? 'text-gray-300 text-xl' : 
                          isTop3 ? 'text-orange-400 text-xl' : 'text-gray-600'
                        }`}>{index + 1}</div>
                        
                        <div className="relative">
                          <img src={user.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-700 object-cover" />
                          {user.id === 1 && <span className="absolute -top-3 -left-2 text-sm drop-shadow-md">👑</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-sm font-bold truncate ${isTop1 ? 'text-yellow-400' : 'text-gray-200'}`}>{user.nickname}</p>
                            <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">Lv.{lvl.level}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            {/* 这里加了图标 */}
                            <p className="text-[10px] text-gray-400 font-mono truncate">{lvl.icon} {lvl.name}</p>
                            <p className="text-[10px] text-cyan-500 font-mono whitespace-nowrap">EXP: {user.experience}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {leaderboard.length === 0 && !loading && (
                    <p className="text-center text-gray-500 text-sm py-4">暂无排名数据</p>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：游戏大厅 */}
            <div className="w-full lg:w-3/4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <h2 className="text-3xl font-black text-white tracking-wider flex items-center gap-3">
                  <span className="w-2 h-8 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                  游戏接入点
                </h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="group relative flex items-center bg-[#0A111F] border border-cyan-900/50 rounded-xl px-4 py-3 w-full md:w-64 focus-within:border-cyan-400 transition-all">
                    <span className="text-cyan-500 mr-3">🔍</span>
                    <input className="bg-transparent border-none outline-none w-full text-sm text-white placeholder-gray-600" placeholder="搜索游戏..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchGames(search)} />
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="relative group bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm tracking-wider hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all whitespace-nowrap">+ 创建模块</button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                </div>
              ) : games.length === 0 ? (
                <div className="text-center text-cyan-500/50 py-24 bg-[#0A111F]/50 rounded-3xl border border-cyan-900/50 border-dashed">NO DATA FOUND.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {games.map(game => (
                    <div key={game.id} className="relative group bg-[#0A111F] rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 transform hover:-translate-y-1">
                      <Link href={`/game/${game.id}`} className="block relative z-10">
                        <div className="h-40 w-full bg-black relative overflow-hidden flex items-center justify-center">
                          {game.cover_url ? (
                            <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition duration-700" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain opacity-20 grayscale"></div>
                          )}
                        </div>
                        <div className="p-4 relative">
                          <h3 className="font-black text-lg text-white mb-1 group-hover:text-cyan-400 transition-colors truncate">{game.name}</h3>
                          <p className="text-xs text-gray-500 font-mono truncate">CREATOR: <span className="text-blue-400">{game.creator?.nickname || 'UNKNOWN'}</span></p>
                        </div>
                      </Link>
                      {userProfile && userProfile.id === game.creator_id && (
                        <label className="absolute top-3 right-3 z-20 bg-black/80 backdrop-blur border border-cyan-500/50 text-cyan-400 text-xs px-2 py-1 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                          ⚙️<input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateCover(game.id, e)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0A111F] border border-cyan-500/40 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <h3 className="text-2xl font-black mb-6 text-white text-center tracking-widest">创建新游戏模块</h3>
            <div className="space-y-4">
              <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="输入游戏名称" value={newGameName} onChange={(e) => setNewGameName(e.target.value)} />
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-cyan-900/50 rounded-xl flex items-center justify-center cursor-pointer hover:border-cyan-400 overflow-hidden">
                {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <span className="text-gray-400 text-sm">点击上传封面图</span>}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
            {createMsg && <p className="text-red-400 text-sm my-2 text-center">{createMsg}</p>}
            <div className="flex gap-4 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 text-gray-400 py-3 rounded-xl font-bold hover:bg-gray-700">取消</button>
              <button onClick={handleCreateGame} disabled={uploading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]">确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}