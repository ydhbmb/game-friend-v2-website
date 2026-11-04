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
    // 获取统计数据
    const { count: userCount } = await supabase.from('users_profile').select('*', { count: 'exact', head: true })
    const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true })
    const { count: recruitCount } = await supabase.from('recruits').select('*', { count: 'exact', head: true })
    setStats({ users: userCount || 0, games: gameCount || 0, recruits: recruitCount || 0 })

    // 获取详细列表
    const { data: uData } = await supabase.from('users_profile').select('*').order('id', { ascending: true }).limit(100)
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

  // 删除游戏
  async function handleDeleteGame(gameId: number) {
    if (!confirm('⚠️ 最高警告：确定要删除该游戏及所有相关数据吗？')) return
    await supabase.from('games').delete().eq('id', gameId)
    fetchData()
  }

  // 删除悬赏令
  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('⚠️ 确定要清除这条违规悬赏令吗？')) return
    await supabase.from('recruits').delete().eq('id', recruitId)
    fetchData()
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 font-orbitron animate-pulse">验证神权身份中...</div>
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 flex overflow-hidden">
      
      {/* 侧边栏 */}
      <div className="w-64 bg-[#0A111F] border-r border-cyan-900/50 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-red-500 font-orbitron tracking-widest">
            神权控制台
          </h1>
          <p className="text-xs text-gray-500 mt-2">欢迎，{userProfile.nickname}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>
            📊 数据总览
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>
            👥 用户管理
          </button>
          <button onClick={() => setActiveTab('games')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'games' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>
            🎮 游戏模块
          </button>
          <button onClick={() => setActiveTab('recruits')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'recruits' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>
            🚨 悬赏通缉
          </button>
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
            <h2 className="text-3xl font-black text-white font-orbitron mb-8">用户权限与经验管理</h2>
            <div className="bg-[#0A111F] border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/50 text-cyan-400 font-mono">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">昵称</th>
                    <th className="p-4">经验值</th>
                    <th className="p-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition">
                      <td className="p-4 font-mono font-bold">{u.id}</td>
                      <td className="p-4 flex items-center gap-2">
                        <img src={u.avatar_url || '/logo.png'} className="w-6 h-6 rounded-full" />
                        {u.nickname}
                      </td>
                      <td className="p-4 text-cyan-400 font-bold">{u.experience || 0}</td>
                      <td className="p-4">
                        <button onClick={() => handleUpdateExp(u.id, u.experience || 0)} className="text-xs bg-gray-800 border border-gray-600 px-3 py-1.5 rounded hover:bg-gray-700">修改经验</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. 游戏模块管理 */}
        {activeTab === 'games' && (
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white font-orbitron mb-8">游戏模块清理</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {gamesList.map(g => (
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
            </div>
          </div>
        )}

        {/* 4. 悬赏令管理 */}
        {activeTab === 'recruits' && (
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-white font-orbitron mb-8">违规悬赏清理</h2>
            <div className="space-y-3">
              {recruitsList.map(r => (
                <div key={r.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{r.play_content}</p>
                    <p className="text-xs text-gray-500">游戏: {r.games?.name} | 发布者: {r.creator?.nickname} | 时间: {r.online_time}</p>
                  </div>
                  <button onClick={() => handleDeleteRecruit(r.id)} className="text-red-500 bg-red-900/20 p-2 rounded hover:bg-red-900/50">🗑️ 删除</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}