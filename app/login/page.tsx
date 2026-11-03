'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function HomePage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
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
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
        if (data) setUserProfile(data)
      }
      await fetchGames()
    }
    init()
  }, [])

  async function fetchGames(keyword = '') {
    setLoading(true)
    let query = supabase.from('games').select(`*, creator:users_profile(nickname)`).order('created_at', { ascending: false })
    if (keyword) query = query.ilike('name', `%${keyword}%`)
    const { data } = await query
    if (data) setGames(data)
    setLoading(false)
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

    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop()
      const fileName = `game-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('game_covers').upload(fileName, coverFile)
      if (uploadError) {
        setCreateMsg('图片上传失败：' + uploadError.message)
        setUploading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('game_covers').getPublicUrl(fileName)
      coverUrl = publicUrl
    }

    const { error } = await supabase.from('games').insert({
      name: newGameName,
      creator_id: userProfile.id,
      cover_url: coverUrl
    })

    setUploading(false)
    if (error) {
      setCreateMsg('创建失败：' + error.message)
    } else {
      setIsModalOpen(false)
      setNewGameName('')
      setCoverFile(null)
      setCoverPreview('')
      setCreateMsg('')
      fetchGames() 
    }
  }

  async function handleUpdateCover(gameId: number, e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault()
    if (!e.target.files || !e.target.files[0]) return
    const file = e.target.files[0]
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
      
      {/* 深空科技背景特效 */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293733_1px,transparent_1px),linear-gradient(to_bottom,#1f293733_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="relative z-10">
        <Navbar />

        <main className="max-w-7xl mx-auto p-4 md:p-6 pt-8">
          {/* 顶部 Banner 区域 */}
          <div className="w-full flex justify-center mb-12 relative">
            <img src="/banner.png" alt="Wingman Games" className="w-full max-w-4xl object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]" />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black text-white tracking-wider flex items-center gap-3">
                <span className="w-2 h-8 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
                游戏接入点
              </h2>
              <p className="text-sm text-cyan-500/70 mt-2 font-mono tracking-widest">// SELECT YOUR BATTLEGROUND</p>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* 搜索框 */}
              <div className="group relative flex items-center bg-[#0A111F] border border-cyan-900/50 rounded-xl px-4 py-3 w-full md:w-72 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <span className="text-cyan-500 mr-3 text-lg z-10">🔍</span>
                <input 
                  className="bg-transparent border-none outline-none w-full text-sm text-white placeholder-gray-600 z-10"
                  placeholder="搜索游戏模块..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchGames(search)}
                />
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="relative group bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm tracking-wider overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-all whitespace-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center gap-2">+ 创建模块</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
              <div className="text-cyan-500 font-mono text-sm animate-pulse">正在接入主机数据...</div>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center text-cyan-500/50 py-24 bg-[#0A111F]/50 backdrop-blur-sm rounded-3xl border border-cyan-900/50 border-dashed">
              <span className="text-5xl block mb-4 opacity-50">🎮</span>
              <p className="font-mono">NO DATA FOUND. INITIATE NEW MODULE.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {games.map(game => (
                <div key={game.id} className="relative group bg-[#0A111F] rounded-2xl border border-gray-800 overflow-hidden hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 transform hover:-translate-y-1">
                  <Link href={`/game/${game.id}`} className="block relative z-10">
                    <div className="h-44 w-full bg-black relative overflow-hidden flex items-center justify-center">
                      {game.cover_url ? (
                        <img src={game.cover_url} alt={game.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition duration-700" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain opacity-20 grayscale"></div>
                      )}
                      
                      {/* 科技感角标 */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      {/* 悬浮时的扫描线特效 */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,1)] -translate-y-full group-hover:animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                    
                    <div className="p-5 relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A111F] via-[#0A111F]/80 to-transparent"></div>
                      <div className="relative z-10">
                        <h3 className="font-black text-xl text-white mb-1 group-hover:text-cyan-400 transition-colors tracking-wide truncate">{game.name}</h3>
                        <p className="text-xs text-gray-500 font-mono truncate">CREATOR: <span className="text-blue-400">{game.creator?.nickname || 'UNKNOWN'}</span></p>
                      </div>
                    </div>
                  </Link>

                  {/* 编辑背景图按钮 */}
                  {userProfile && userProfile.id === game.creator_id && (
                    <label className="absolute top-3 right-3 z-20 bg-black/80 backdrop-blur border border-cyan-500/50 text-cyan-400 text-xs px-3 py-1.5 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-500/20 shadow-lg" onClick={(e) => e.stopPropagation()}>
                      ⚙️ 替换封面
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateCover(game.id, e)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 创建游戏弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0A111F] border border-cyan-500/40 rounded-3xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
            
            <h3 className="text-2xl font-black mb-8 text-white text-center tracking-widest">
              创建新游戏模块
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-cyan-500 mb-2">GAME NAME *</label>
                <input 
                  className="w-full bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
                  placeholder="输入游戏名称（如：英雄联盟）"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-500 mb-2">COVER IMAGE</label>
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-36 border-2 border-dashed border-cyan-900/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-500/5 transition-all overflow-hidden group">
                  {coverPreview ? (
                    <img src={coverPreview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                  ) : (
                    <>
                      <span className="text-3xl mb-2 opacity-50">🖼️</span>
                      <span className="text-gray-400 text-sm">点击上传模块封面图</span>
                      <span className="text-cyan-600/50 text-xs mt-1">建议比例 16:9</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>
            </div>

            {createMsg && <p className="text-red-400 text-sm mb-4 text-center mt-4 bg-red-500/10 py-2 rounded">{createMsg}</p>}
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-800/50 text-gray-400 py-3 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition">取消</button>
              <button onClick={handleCreateGame} disabled={uploading} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black tracking-wider hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 transition-all">
                {uploading ? '部署中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}