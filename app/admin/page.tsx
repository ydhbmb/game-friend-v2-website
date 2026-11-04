'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // 当前选中的管理模块
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'recruits'>('overview')

  // 数据状态
  const [stats, setStats] = useState({ users: 0, games: 0, recruits: 0 })
  const [usersList, setUsersList] = useState<any[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [recruitsList, setRecruitsList] = useState<any[]>([])

  // 搜索状态
  const [userSearch, setUserSearch] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [recruitSearch, setRecruitSearch] = useState('')

  // 管理员白名单
  const adminIds = [1, 10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('未登录，无法访问后台！')
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      
      if (!profile || !adminIds.includes(profile.id)) {
        alert('⛔ 权限不足：你的 ID 不在神权白名单中！')
        router.push('/')
        return
      }

      setUserProfile(profile)
      setIsAdmin(true)
      fetchData()
      setLoading(false)
    }
    checkAuth()
  }, [router])

  async function fetchData() {
    const { count: userCount } = await supabase.from('users_profile').select('*', { count: 'exact', head: true })
    const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true })
    const { count: recruitCount } = await supabase.from('recruits').select('*', { count: 'exact', head: true })
    setStats({ users: userCount || 0, games: gameCount || 0, recruits: recruitCount || 0 })

    const { data: uData } = await supabase.from('users_profile').select('*').order('id', { ascending: true })
    if (uData) setUsersList(uData)

    const { data: gData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).order('created_at', { ascending: false })
    if (gData) setGamesList(gData)

    const { data: rData } = await supabase.from('recruits').select(`*, creator:users_profile(nickname), games(name)`).order('created_at', { ascending: false })
    if (rData) setRecruitsList(rData)
  }

  // 修改用户经验（神权操作）
  async function handleUpdateExp(userId: number, currentExp: number) {
    const newExpStr = prompt(`请输入要为 [ID:${userId}] 设置的新经验值：`, currentExp.toString())
    if (newExpStr === null) return
    const newExp = parseInt(newExpStr)
    if (isNaN(newExp) || newExp < 0) return alert('请输入合法数字')
    await supabase.from('users_profile').update({ experience: newExp }).eq('id', userId)
    fetchData()
  }

  // 封禁/解封用户
  async function handleBanUser(user: any) {
    if (adminIds.includes(user.id)) return alert('你不能封禁神权管理员！')
    
    // 检查是否已经被封
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date()
    
    if (isBanned) {
      if (confirm('该用户正处于封禁状态，是否解除封禁？')) {
        await supabase.from('users_profile').update({ banned_until: null }).eq('id', user.id)
        fetchData()
      }
      return
    }

    const days = prompt(`请输入封禁天数（1 / 3 / 7 / 30 / 365），输入 99999 代表永久封禁：`)
    if (days === null) return
    const numDays = parseInt(days)
    if (isNaN(numDays) || numDays <= 0) return alert('天数不合法')

    let banDate = new Date()
    if (numDays >= 99999) {
      banDate.setFullYear(2099) // 永久
    } else {
      banDate.setDate(banDate.getDate() + numDays)
    }

    await supabase.from('users_profile').update({ banned_until: banDate.toISOString() }).eq('id', user.id)
    fetchData()
    alert('封禁执行完毕！')
  }

  async function handleDeleteGame(gameId: number) {
    if (!confirm('⚠️ 最高警告：确定要删除该游戏及所有相关数据吗？')) return
    await supabase.from('games').delete().eq('id', gameId)
    fetchData()
  }

  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('⚠️ 确定要清除这条违规悬赏令吗？')) return
    await supabase.from('recruits').delete().eq('id', recruitId)
    fetchData()
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 font-orbitron animate-pulse">验证神权身份中...</div>
  if (!isAdmin) return null

  // 前端搜索过滤
  const filteredUsers = usersList.filter(u => 
    u.nickname?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.id.toString().includes(userSearch) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredGames = gamesList.filter(g => g.name.toLowerCase().includes(gameSearch.toLowerCase()))
  const filteredRecruits = recruitsList.filter(r => 
    r.play_content.toLowerCase().includes(recruitSearch.toLowerCase()) ||
    r.games?.name.toLowerCase().includes(recruitSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 flex overflow-hidden">
      
      {/* 侧边栏 */}
      <div className="w-64 bg-[#0A111F] border-r border-cyan-900/50 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-red-500 font-orbitron tracking-widest">
            神权控制台
          </h1>
          <p className="text-xs text-gray-500 mt-2">巡游天官: {userProfile.nickname}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>📊 数据总览</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>👥 用户管理</button>
          <button onClick={() => setActiveTab('games')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'games' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>🎮 游戏模块</button>
          <button onClick={() => setActiveTab('recruits')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'recruits' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>🚨 悬赏通缉</button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="block w-full text-center bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition">返回前台</Link>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-fuchsia-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* 1. 数据总览 */}
        {activeTab === 'overview' && (
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl font-black text-white font-orbitron mb-8">系统数据总览</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0A111F] border border-cyan-500/30 p-6 rounded-2xl shadow-lg">
                <p className="text-cyan-500 font-mono mb-2">// TOTAL USERS</p>
                <p className="text-5xl font-black text-white font-orbitron">{stats.users}</p>
              </div>
              <div className="bg-[#0A111F] border border-blue-500/30 p-6 rounded-2xl shadow-lg">
                <p className="text-blue-500 font-mono mb-2">// TOTAL GAMES</p>
                <p className="text-5xl font-black text-white font-orbitron">{stats.games}</p>
              </div>
              <div className="bg-[#0A111F] border border-fuchsia-500/30 p-6 rounded-2xl shadow-lg">
                <p className="text-fuchsia-500 font-mono mb-2">// TOTAL RECRUITS</p>
                <p className="text-5xl font-black text-white font-orbitron">{stats.recruits}</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. 用户管理 */}
        {activeTab === 'users' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-white font-orbitron">用户权限与封禁</h2>
              <input type="text" placeholder="搜索 ID / 昵称 / 邮箱..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64" />
            </div>
            
            <div className="bg-[#0A111F] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/50 text-cyan-400 font-mono">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">用户</th>
                    <th className="p-4">经验</th>
                    <th className="p-4">状态</th>
                    <th className="p-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map(u => {
                    const isBanned = u.banned_until && new Date(u.banned_until) > new Date()
                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-4 font-mono font-bold">{u.id}</td>
                        <td className="p-4 flex items-center gap-2">
                          <img src={u.avatar_url || '/logo.png'} className="w-6 h-6 rounded-full" />
                          {u.nickname}
                        </td>
                        <td className="p-4 text-cyan-400 font-bold">{u.experience || 0}</td>
                        <td className="p-4">
                          {isBanned ? <span className="text-red-500 font-bold">已封禁</span> : <span className="text-green-500">正常</span>}
                        </td>
                        <td className="p-4 flex gap-2">
                          <button onClick={() => handleUpdateExp(u.id, u.experience || 0)} className="text-xs bg-gray-800 border border-gray-600 px-3 py-1.5 rounded hover:bg-gray-700">改经验</button>
                          <button onClick={() => handleBanUser(u)} className={`text-xs border px-3 py-1.5 rounded ${isBanned ? 'bg-green-900/20 text-green-400 border-green-600' : 'bg-red-900/20 text-red-500 border-red-600'}`}>
                            {isBanned ? '解封' : '封禁'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="p-6 text-center text-gray-500">没有找到用户</p>}
            </div>
          </div>
        )}

        {/* 3. 游戏模块管理 */}
        {activeTab === 'games' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-white font-orbitron">游戏模块清理</h2>
              <input type="text" placeholder="搜索游戏名..." value={gameSearch} onChange={e => setGameSearch(e.target.value)} className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGames.map(g => (
                <div key={g.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={g.cover_url || '/logo.png'} className="w-10 h-10 rounded object-cover" />
                    <div>
                      <p className="font-bold text-white">{g.name}</p>
                      <p className="text-xs text-gray-500">创建者: {g.creator?.nickname}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteGame(g.id)} className="text-red-500 bg-red-900/20 p-2 rounded hover:bg-red-900/50">🗑️</button>
                </div>
              ))}
              {filteredGames.length === 0 && <p className="col-span-full text-gray-500">没有找到模块</p>}
            </div>
          </div>
        )}

        {/* 4. 悬赏令管理 */}
        {activeTab === 'recruits' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-white font-orbitron">违规悬赏清理</h2>
              <input type="text" placeholder="搜索悬赏内容 / 游戏名..." value={recruitSearch} onChange={e => setRecruitSearch(e.target.value)} className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64" />
            </div>
            <div className="space-y-3">
              {filteredRecruits.map(r => (
                <div key={r.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{r.play_content}</p>
                    <p className="text-xs text-gray-500">游戏: {r.games?.name} | 发布者: {r.creator?.nickname} | 时间: {r.online_time}</p>
                  </div>
                  <button onClick={() => handleDeleteRecruit(r.id)} className="text-red-500 bg-red-900/20 p-2 rounded hover:bg-red-900/50">🗑️ 删除</button>
                </div>
              ))}
              {filteredRecruits.length === 0 && <p className="text-gray-500">没有找到通缉令</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}