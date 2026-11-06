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
  const [followedGameIds, setFollowedGameIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [createMsg, setCreateMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = (uid: number) => {
    const admins = [1, 10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]
    return admins.includes(uid)
  }

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
          if (data) {
            setUserProfile(data)
            const { data: followsData } = await supabase.from('game_follows').select('game_id').eq('user_id', data.id)
            if (followsData) setFollowedGameIds(followsData.map(f => f.game_id))
          }
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

  async function toggleFollowGame(gameId: number, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userProfile) return alert('请先登录！')

    try {
      const isFollowed = followedGameIds.includes(gameId)
      if (isFollowed) {
        await supabase.from('game_follows').delete().eq('user_id', userProfile.id).eq('game_id', gameId)
        setFollowedGameIds(followedGameIds.filter(id => id !== gameId))
      } else {
        await supabase.from('game_follows').insert({ user_id: userProfile.id, game_id: gameId })
        setFollowedGameIds([...followedGameIds, gameId])
      }
    } catch (err: any) {
      alert('操作失败：' + err.message)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // 🔥 封面大小限制 500KB
      if (file.size > 500 * 1024) {
        alert('封面图片不能超过 500KB，请压缩后再上传！')
        e.target.value = ''
        return
      }
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

  async function handleUpdateName(gameId: number, oldName: string) {
    const newName = prompt('请输入新的游戏模块名称：', oldName)
    if (!newName || newName.trim() === '' || newName === oldName) return
    await supabase.from('games').update({ name: newName.trim() }).eq('id', gameId)
    fetchGames()
  }

  async function handleDeleteGame(gameId: number) {
    if (!confirm('⚠️ 警告：确定要彻底删除这个游戏模块以及里面的所有通缉令吗？此操作不可逆！')) return
    await supabase.from('games').delete().eq('id', gameId)
    fetchGames()
  }

  async function handleUpdateCover(gameId: number, e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault()
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
    if (file.size > 500 * 1024) return alert('封面图片不能超过 500KB')
    const fileExt = file.name.split('.').pop()
    const fileName = `game-${gameId}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, file)
    if (uploadError) return alert('上传失败：' + uploadError.message)
    const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName)
    await supabase.from('games').update({ cover_url: publicUrl }).eq('id', gameId)
    fetchGames()
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293733_1px,transparent_1px),linear-gradient(to_bottom,#1f293733_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[1400px] mx-auto p-4 md:p-6 pt-8">
          <div className="w-full flex justify-center mb-8 md:mb-12 relative">
            <img src="/banner.png" alt="Wingman Games" className="w-full max-w-4xl object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse-glow rounded-2xl" />
          </div>

          <div className="mb-8 w-full max-w-4xl mx-auto">
            <Link href="/teams" className="group relative flex items-center justify-between p-6 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-2xl hover:border-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] overflow-hidden">
              <div className="absolute inset-0 bg-[url('/logo.png')] bg-right bg-no-repeat bg-contain opacity-5 pointer-events-none group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-orbitron mb-1">战队大厅</h2>
                <p className="text-sm text-cyan-500/70 font-mono">// 加入公会，寻找你的最强战队</p>
              </div>
              <div className="relative z-10 text-cyan-400 group-hover:translate-x-2 transition-transform text-2xl">→</div>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="w-full lg:w-1/4 flex-shrink-0">
              <div className="bg-[#0A111F]/90 backdrop-blur-xl border border-cyan-900/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] lg:sticky lg:top-24 transition-all duration-300 hover:border-cyan-500/50">
                <div className="flex items-center gap-2 mb-4 md:mb-6 border-b border-cyan-900/50 pb-3 md:pb-4">
                  <span className="text-xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">🏆</span>
                  <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider font-orbitron">荣耀排行榜</h2>
                </div>
                
                <div className="space-y-2">
                  {leaderboard.map((user, index) => {
                    const lvl = calculateLevel(user.experience, user.id)
                    const isTop1 = index === 0
                    const isTop2 = index === 1
                    const isTop3 = index === 2
                    
                    return (
                      <div key={user.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 hover:translate-x-1 ${
                          isTop1 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 
                          isTop2 ? 'bg-gradient-to-r from-gray-300/10 to-transparent border border-gray-400/20' :
                          isTop3 ? 'bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20' :
                          'hover:bg-cyan-900/30'
                        }`}>
                        <div className={`w-6 text-center font-black italic font-orbitron ${
                          isTop1 ? 'text-yellow-400 text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 
                          isTop2 ? 'text-gray-300 text-xl' : 
                          isTop3 ? 'text-orange-400 text-xl' : 'text-gray-600'
                        }`}>{index + 1}</div>
                        
                        <div className="relative">
                          <img src={user.avatar_url || '/logo.png'} className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gray-700 object-cover" />
                          {user.id === 1 && <span className="absolute -top-3 -left-2 text-sm drop-shadow-md z-10">👑</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-sm font-bold truncate ${isTop1 ? 'text-yellow-400' : 'text-gray-200'}`}>{user.nickname}</p>
                            <span className="text-[10px] font-orbitron font-bold bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">Lv.{lvl.level}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className="text-[10px] text-gray-400 font-mono truncate">{lvl.icon} {lvl.name}</p>
                            <p className="text-[10px] text-cyan-500 font-orbitron font-bold whitespace-nowrap">EXP:{user.experience}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-3/4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-wider flex items-center gap-3 font-orbitron">
                  <span className="w-2 h-6 md:h-8 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,1)]"></span>
                  游戏接入点
                </h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex-1 md:flex-none flex items-center bg-[#0A111F] border border-cyan-900/50 rounded-xl px-3 py-2 md:py-3 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                    <span className="text-cyan-500 mr-2">🔍</span>
                    <input className="bg-transparent border-none outline-none w-full md:w-56 text-xs md:text-sm text-white placeholder-gray-600" placeholder="搜索游戏..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchGames(search)} />
                  </div>
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 md:py-3 rounded-xl font-black text-xs md:text-sm hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all whitespace-nowrap">+ 创建</button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-8">
                  {games.map(game => (
                    <div key={game.id} className="relative group bg-[#0A111F] rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-400 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(6,182,212,0.3)]">
                      <Link href={`/game?id=${game.id}`} className="block relative z-10">
                        <div className="h-40 md:h-48 w-full bg-black relative overflow-hidden flex items-center justify-center">
                          {game.cover_url ? (
                            <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition duration-700" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain opacity-20 grayscale"></div>
                          )}
                          
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,1)] -translate-y-full group-hover:animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>
                        
                        <div className="p-5 relative bg-gradient-to-t from-[#0A111F] to-[#0A111F]/90 flex justify-between items-end">
                          <div className="relative z-10 flex-1 min-w-0 pr-2">
                            <h3 className="font-black text-xl text-white mb-1 group-hover:text-cyan-400 transition-colors tracking-wide truncate">{game.name}</h3>
                            <div className="text-xs text-gray-500 font-mono truncate flex items-center gap-1">
                              CREATOR: 
                              <span className="text-blue-400 font-bold">{game.creator?.nickname || 'UNKNOWN'}</span>
                              <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(250,204,21,0.4)]">⚡ 先锋</span>
                            </div>
                          </div>
                          
                          {userProfile && (
                            <button 
                              onClick={(e) => toggleFollowGame(game.id, e)}
                              className={`relative z-20 shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                                followedGameIds.includes(game.id) 
                                  ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50' 
                                  : 'bg-transparent text-gray-500 border-gray-600 hover:text-cyan-400 hover:border-cyan-500/50'
                              }`}
                            >
                              {followedGameIds.includes(game.id) ? '🔔 已关注' : '🔕 关注'}
                            </button>
                          )}
                        </div>
                      </Link>

                      {userProfile && isAdmin(userProfile.id) && (
                        <div className="absolute top-3 right-3 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <button onClick={(e) => { e.preventDefault(); handleUpdateName(game.id, game.name); }} className="bg-black/80 backdrop-blur border border-yellow-500/50 text-yellow-400 text-xs px-2 py-1 rounded hover:bg-yellow-500/20" title="修改名称">✏️</button>
                          <label className="bg-black/80 backdrop-blur border border-cyan-500/50 text-cyan-400 text-xs px-2 py-1 rounded cursor-pointer hover:bg-cyan-500/20" title="修改封面">
                            ⚙️
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateCover(game.id, e)} />
                          </label>
                          <button onClick={(e) => { e.preventDefault(); handleDeleteGame(game.id); }} className="bg-black/80 backdrop-blur border border-red-500/50 text-red-400 text-xs px-2 py-1 rounded hover:bg-red-500/20" title="删除模块">🗑️</button>
                        </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F]/95 border border-cyan-500/50 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
            
            <h3 className="text-2xl font-black mb-6 text-white text-center font-orbitron tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">创建游戏模块</h3>
            
            <div className="space-y-4">
              <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400" placeholder="输入游戏名称" value={newGameName} onChange={(e) => setNewGameName(e.target.value)} />
              <div onClick={() => fileInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-cyan-900/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-500/5 transition-all overflow-hidden">
                {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <><span className="text-2xl mb-2">🖼️</span><span className="text-gray-400 text-sm">点击上传封面 (小于500KB)</span></>}
              </div>
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </div>
            
            {createMsg && <p className="text-red-400 text-sm text-center mt-4">{createMsg}</p>}
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition">取消</button>
              <button onClick={handleCreateGame} disabled={uploading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all">
                {uploading ? '部署中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}