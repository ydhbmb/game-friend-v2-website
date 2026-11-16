'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculateLevel } from '@/lib/levels'

type Tab = 'overview' | 'users' | 'games' | 'recruits' | 'logs'

export default function AdminPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const [stats, setStats] = useState({ users: 0, games: 0, recruits: 0, moments: 0 })
  const [usersList, setUsersList] = useState<any[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [recruitsList, setRecruitsList] = useState<any[]>([])
  const [logsList, setLogsList] = useState<any[]>([])

  const [userSearch, setUserSearch] = useState('')
  const [gameSearch, setGameSearch] = useState('')
  const [recruitSearch, setRecruitSearch] = useState('')

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('未登录，无法访问后台！')
        router.push('/login')
        return
      }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        alert('⛔ 权限不足：你的账号没有后台权限')
        router.push('/')
        return
      }

      setUserProfile(profile)
      setIsAdmin(true)
      await fetchData()
      setLoading(false)
    }
    checkAuth()
  }, [router])

  async function fetchData() {
    const { count: userCount } = await supabase.from('users_profile').select('*', { count: 'exact', head: true })
    const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true })
    const { count: recruitCount } = await supabase.from('recruits').select('*', { count: 'exact', head: true })
    const { count: momentCount } = await supabase.from('moments').select('*', { count: 'exact', head: true })
    setStats({
      users: userCount || 0,
      games: gameCount || 0,
      recruits: recruitCount || 0,
      moments: momentCount || 0,
    })

    const { data: uData } = await supabase.from('users_profile').select('*').order('id', { ascending: true })
    if (uData) setUsersList(uData)

    const { data: gData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).order('created_at', { ascending: false })
    if (gData) setGamesList(gData)

    const { data: rData } = await supabase.from('recruits').select(`*, creator:users_profile(nickname), games(name)`).order('created_at', { ascending: false })
    if (rData) setRecruitsList(rData)
  }

  async function fetchLogs() {
    const { data, error } = await supabase
      .from('admin_logs')
      .select(`*, admin:users_profile(nickname)`)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return setMsg('读取日志失败：' + error.message)
    setLogsList(data || [])
  }

  // 统一执行 RPC，处理错误提示
  async function run(fn: () => Promise<any>, okText: string) {
    setBusy(true)
    setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) {
      setMsg(error.message)
      return false
    }
    setMsg(okText)
    await fetchData()
    return true
  }

  // 改经验：界面上输入绝对值，按差值走 RPC
  async function handleUpdateExp(u: any) {
    const currentExp = u.experience || 0
    const input = prompt(`为 [ID:${u.id} ${u.nickname}] 设置新的经验值：`, currentExp.toString())
    if (input === null) return
    const target = parseInt(input)
    if (isNaN(target) || target < 0) return alert('请输入合法的非负整数')

    const delta = target - currentExp
    if (delta === 0) return

    const reason = prompt('操作原因（可留空，会写进日志）') || null
    await run(
      () => supabase.rpc('admin_add_experience', { p_target_id: u.id, p_delta: delta, p_reason: reason }),
      `已把 [ID:${u.id}] 的经验从 ${currentExp} 调整为 ${target}`
    )
  }

  // 封禁 / 解封
  async function handleBanUser(u: any) {
    const isBanned = u.banned_until && new Date(u.banned_until) > new Date()

    if (isBanned) {
      if (!confirm(`解除 [ID:${u.id} ${u.nickname}] 的封禁？`)) return
      await run(
        () => supabase.rpc('admin_unban_user', { p_target_id: u.id }),
        `已解封 ${u.nickname}`
      )
      return
    }

    const days = prompt('请输入封禁天数（1 / 3 / 7 / 30 / 365）：')
    if (days === null) return
    const numDays = parseInt(days)
    if (isNaN(numDays) || numDays <= 0) return alert('天数不合法')

    const reason = prompt('封禁原因（可留空，会写进日志）') || null
    await run(
      () => supabase.rpc('admin_ban_user', { p_target_id: u.id, p_days: numDays, p_reason: reason }),
      `已封禁 ${u.nickname} ${numDays} 天`
    )
  }

  // 设角色（只有超级管理员能看到按钮）
  async function handleSetRole(u: any) {
    const input = prompt(
      `设置 [ID:${u.id} ${u.nickname}] 的角色：\nuser = 普通玩家\nadmin = 管理员\nsuper_admin = 超级管理员`,
      u.role || 'user'
    )
    if (input === null) return

    const role = input.trim()
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return alert('只能填 user、admin 或 super_admin')
    }
    if (!confirm(`确认把 ${u.nickname} 设为 ${role}？`)) return

    await run(
      () => supabase.rpc('admin_set_role', { p_target_id: u.id, p_role: role }),
      `已把 ${u.nickname} 设为 ${role}`
    )
  }

  async function handleDeleteGame(gameId: number, name: string) {
    if (!confirm(`⚠️ 确定要删除「${name}」及所有相关数据吗？此操作不可撤销。`)) return
    await run(
      () => supabase.rpc('admin_delete_content', { p_table: 'games', p_id: gameId }),
      `已删除游戏「${name}」`
    )
  }

  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('⚠️ 确定要清除这条违规悬赏令吗？')) return
    await run(
      () => supabase.rpc('admin_delete_content', { p_table: 'recruits', p_id: recruitId }),
      '已删除该条通缉令'
    )
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 font-orbitron animate-pulse">验证神权身份中...</div>
  if (!isAdmin) return null

  const isSuper = userProfile?.role === 'super_admin'

  const filteredUsers = usersList.filter(u =>
    u.nickname?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toString().includes(userSearch) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredGames = gamesList.filter(g => (g.name || '').toLowerCase().includes(gameSearch.toLowerCase()))
  const filteredRecruits = recruitsList.filter(r =>
    (r.play_content || '').toLowerCase().includes(recruitSearch.toLowerCase()) ||
    (r.games?.name || '').toLowerCase().includes(recruitSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 flex overflow-hidden">

      {/* 侧边栏 */}
      <div className="w-64 bg-[#0A111F] border-r border-cyan-900/50 flex flex-col z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-red-500 font-orbitron tracking-widest">
            神权控制台
          </h1>
          <p className="text-xs text-gray-500 mt-2">
            巡游天官: {userProfile.nickname}
          </p>
          <p className="text-[10px] text-red-400 mt-1 font-mono">
            {isSuper ? '权限级别：超级管理员' : '权限级别：管理员'}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>📊 数据总览</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>👥 用户管理</button>
          <button onClick={() => setActiveTab('games')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'games' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>🎮 游戏模块</button>
          <button onClick={() => setActiveTab('recruits')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'recruits' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>🚨 悬赏通缉</button>
          <button onClick={() => { setActiveTab('logs'); fetchLogs() }} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'logs' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:bg-gray-800'}`}>📜 操作日志</button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link href="/" className="block w-full text-center bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition">返回前台</Link>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-fuchsia-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        {msg && (
          <div className="relative z-20 mb-6 text-sm text-cyan-300 bg-cyan-900/20 border border-cyan-500/30 rounded-xl py-2.5 px-4 flex items-center justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="text-gray-500 hover:text-white ml-4">✕</button>
          </div>
        )}

        {/* 1. 数据总览 */}
        {activeTab === 'overview' && (
          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl font-black text-white font-orbitron mb-8">系统数据总览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
              <div className="bg-[#0A111F] border border-yellow-500/30 p-6 rounded-2xl shadow-lg">
                <p className="text-yellow-500 font-mono mb-2">// TOTAL MOMENTS</p>
                <p className="text-5xl font-black text-white font-orbitron">{stats.moments}</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. 用户管理 */}
        {activeTab === 'users' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h2 className="text-3xl font-black text-white font-orbitron">用户权限与封禁</h2>
              <input
                type="text"
                placeholder="搜索 ID / 昵称 / 邮箱..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64"
              />
            </div>

            <div className="bg-[#0A111F] border border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead className="bg-black/50 text-cyan-400 font-mono">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">用户</th>
                    <th className="p-4">等级</th>
                    <th className="p-4">经验</th>
                    <th className="p-4">状态</th>
                    <th className="p-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map(u => {
                    const isBanned = u.banned_until && new Date(u.banned_until) > new Date()
                    const lvl = calculateLevel(u.experience || 0, u.id)
                    const isSelf = u.id === userProfile.id
                    return (
                      <tr key={u.id} className="hover:bg-white/5 transition">
                        <td className="p-4 font-mono font-bold">{u.id}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={u.avatar_url || '/logo.png'} className="w-6 h-6 rounded-full object-cover bg-black" />
                            <span className="truncate max-w-[140px]">{u.nickname}</span>
                            {u.role === 'super_admin' && <span className="text-[9px] bg-red-900/50 text-red-300 border border-red-500/40 px-1.5 py-0.5 rounded shrink-0">超管</span>}
                            {u.role === 'admin' && <span className="text-[9px] bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-500/40 px-1.5 py-0.5 rounded shrink-0">管理</span>}
                            {isSelf && <span className="text-[9px] text-cyan-500 shrink-0">(你)</span>}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-xs">Lv.{lvl.level}</td>
                        <td className="p-4 text-cyan-400 font-bold">{u.experience || 0}</td>
                        <td className="p-4">
                          {isBanned
                            ? <span className="text-red-500 font-bold text-xs">已封禁</span>
                            : <span className="text-green-500 text-xs">正常</span>}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleUpdateExp(u)}
                              disabled={busy}
                              className="text-xs bg-gray-800 border border-gray-600 px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-40 whitespace-nowrap"
                            >
                              改经验
                            </button>
                            <button
                              onClick={() => handleBanUser(u)}
                              disabled={busy || u.role === 'super_admin' || isSelf}
                              title={u.role === 'super_admin' ? '不能封禁超级管理员' : isSelf ? '不能封禁自己' : ''}
                              className={`text-xs border px-3 py-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap ${isBanned ? 'bg-green-900/20 text-green-400 border-green-600' : 'bg-red-900/20 text-red-500 border-red-600'}`}
                            >
                              {isBanned ? '解封' : '封禁'}
                            </button>
                            {isSuper && (
                              <button
                                onClick={() => handleSetRole(u)}
                                disabled={busy}
                                className="text-xs bg-fuchsia-900/20 text-fuchsia-400 border border-fuchsia-600 px-3 py-1.5 rounded hover:bg-fuchsia-900/40 disabled:opacity-40 whitespace-nowrap"
                              >
                                设角色
                              </button>
                            )}
                          </div>
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
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h2 className="text-3xl font-black text-white font-orbitron">游戏模块清理</h2>
              <input
                type="text"
                placeholder="搜索游戏名..."
                value={gameSearch}
                onChange={e => setGameSearch(e.target.value)}
                className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGames.map(g => (
                <div key={g.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={g.cover_url || '/logo.png'} className="w-10 h-10 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{g.name}</p>
                      <p className="text-xs text-gray-500 truncate">创建者: {g.creator?.nickname || '未知'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGame(g.id, g.name)}
                    disabled={busy}
                    className="text-red-500 bg-red-900/20 p-2 rounded hover:bg-red-900/50 shrink-0 disabled:opacity-40"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {filteredGames.length === 0 && <p className="col-span-full text-gray-500">没有找到模块</p>}
            </div>
          </div>
        )}

        {/* 4. 悬赏令管理 */}
        {activeTab === 'recruits' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h2 className="text-3xl font-black text-white font-orbitron">违规悬赏清理</h2>
              <input
                type="text"
                placeholder="搜索悬赏内容 / 游戏名..."
                value={recruitSearch}
                onChange={e => setRecruitSearch(e.target.value)}
                className="bg-[#0A111F] border border-cyan-900/50 text-white px-4 py-2 rounded-xl outline-none focus:border-cyan-500 w-64"
              />
            </div>
            <div className="space-y-3">
              {filteredRecruits.map(r => (
                <div key={r.id} className="bg-[#0A111F] border border-gray-800 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{r.play_content}</p>
                    <p className="text-xs text-gray-500 mt-1">游戏: {r.games?.name || '未知'} | 发布者: {r.creator?.nickname || '未知'} | 时间: {r.online_time}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteRecruit(r.id)}
                    disabled={busy}
                    className="text-red-500 bg-red-900/20 px-3 py-2 rounded hover:bg-red-900/50 shrink-0 text-xs font-bold disabled:opacity-40"
                  >
                    🗑️ 删除
                  </button>
                </div>
              ))}
              {filteredRecruits.length === 0 && <p className="text-gray-500">没有找到通缉令</p>}
            </div>
          </div>
        )}

        {/* 5. 操作日志 */}
        {activeTab === 'logs' && (
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-white font-orbitron">操作日志</h2>
              <button
                onClick={fetchLogs}
                className="text-xs bg-gray-800 border border-gray-600 px-4 py-2 rounded-xl hover:bg-gray-700"
              >
                🔄 刷新
              </button>
            </div>
            <div className="space-y-2">
              {logsList.map(l => (
                <div key={l.id} className="bg-[#0A111F] border border-gray-800 rounded-xl p-3 text-xs font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-cyan-400">{new Date(l.created_at).toLocaleString('zh-CN')}</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-white">{l.admin?.nickname || `ID:${l.admin_id}`}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-fuchsia-400">{l.action}</span>
                  <span className="text-gray-500">{l.target_type}:{l.target_id}</span>
                  {l.detail && <span className="text-gray-600">{JSON.stringify(l.detail)}</span>}
                </div>
              ))}
              {logsList.length === 0 && (
                <p className="text-gray-500 text-center py-12">暂无操作记录</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
