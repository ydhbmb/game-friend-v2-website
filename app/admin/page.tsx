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

      const { data: profile } = await supabase
        .from('users_profile')
        .select('*')
        .eq('auth_id', user.id)
        .single()

      if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        alert('权限不足：你的账号没有后台权限')
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
    const { count: userCount } = await supabase
      .from('users_profile')
      .select('*', { count: 'exact', head: true })
    const { count: gameCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
    const { count: recruitCount } = await supabase
      .from('recruits')
      .select('*', { count: 'exact', head: true })
    const { count: momentCount } = await supabase
      .from('moments')
      .select('*', { count: 'exact', head: true })

    setStats({
      users: userCount || 0,
      games: gameCount || 0,
      recruits: recruitCount || 0,
      moments: momentCount || 0,
    })

    const { data: uData } = await supabase
      .from('users_profile')
      .select('*')
      .order('id', { ascending: true })
    if (uData) setUsersList(uData)

    const { data: gData } = await supabase
      .from('games')
      .select(`*, creator:users_profile(nickname)`)
      .order('created_at', { ascending: false })
    if (gData) setGamesList(gData)

    const { data: rData } = await supabase
      .from('recruits')
      .select(`*, creator:users_profile(nickname), games(name)`)
      .order('created_at', { ascending: false })
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

  // PromiseLike 兼容 supabase.rpc 返回的 thenable
  async function run(fn: () => PromiseLike<any>, okText: string) {
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

  async function handleUpdateExp(u: any) {
    const currentExp = u.experience || 0
    const input = prompt(
      `为 [ID:${u.id} ${u.nickname}] 设置新的经验值：`,
      currentExp.toString()
    )
    if (input === null) return
    const target = parseInt(input)
    if (isNaN(target) || target < 0) return alert('请输入合法的非负整数')

    const delta = target - currentExp
    if (delta === 0) return

    const reason = prompt('操作原因（可留空，会写进日志）') || null
    await run(
      () =>
        supabase.rpc('admin_add_experience', {
          p_target_id: u.id,
          p_delta: delta,
          p_reason: reason,
        }),
      `已把 [ID:${u.id}] 的经验从 ${currentExp} 调整为 ${target}`
    )
  }

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
      () =>
        supabase.rpc('admin_ban_user', {
          p_target_id: u.id,
          p_days: numDays,
          p_reason: reason,
        }),
      `已封禁 ${u.nickname} ${numDays} 天`
    )
  }

  async function handleSetRole(u: any) {
    const input = prompt(
      `设置 [ID:${u.id} ${u.nickname}] 的角色：
user = 普通玩家
admin = 管理员
super_admin = 超级管理员`,
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
    if (!confirm(`确定要删除「${name}」及所有相关数据吗？此操作不可撤销。`)) return
    await run(
      () => supabase.rpc('admin_delete_content', { p_table: 'games', p_id: gameId }),
      `已删除游戏「${name}」`
    )
  }

  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('确定要清除这条违规招募吗？')) return
    await run(
      () => supabase.rpc('admin_delete_content', { p_table: 'recruits', p_id: recruitId }),
      '已删除该条招募'
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        校验权限中…
      </div>
    )
  }

  if (!isAdmin) return null

  const isSuper = userProfile?.role === 'super_admin'

  const filteredUsers = usersList.filter(
    (u) =>
      u.nickname?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toString().includes(userSearch) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  )
  const filteredGames = gamesList.filter((g) =>
    (g.name || '').toLowerCase().includes(gameSearch.toLowerCase())
  )
  const filteredRecruits = recruitsList.filter(
    (r) =>
      (r.play_content || '').toLowerCase().includes(recruitSearch.toLowerCase()) ||
      (r.games?.name || '').toLowerCase().includes(recruitSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] flex">
      <div className="w-[180px] shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <p className="text-[13px] font-semibold text-[#E8EFF7]">管理后台</p>
          <p className="text-[11px] text-[#5C6B7F] mt-1 truncate">
            {userProfile.nickname}
          </p>
          <p className="text-[10px] text-[#4A5768] mt-0.5">
            {isSuper ? '超级管理员' : '管理员'}
          </p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {[
            { key: 'overview', label: '数据总览' },
            { key: 'users', label: '用户管理' },
            { key: 'games', label: '游戏模块' },
            { key: 'recruits', label: '招募管理' },
            { key: 'logs', label: '操作日志' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key as Tab)
                if (t.key === 'logs') fetchLogs()
              }}
              className={`w-full text-left px-3 h-9 rounded-md text-[12.5px] transition-colors ${
                activeTab === t.key
                  ? 'bg-white/[0.09] text-[#E8EFF7]'
                  : 'text-[#94A3B8] hover:bg-white/[0.05]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-white/[0.06]">
          <Link
            href="/"
            className="block w-full text-center h-9 leading-9 rounded-md bg-white/[0.05] border border-white/[0.08] text-[12px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] transition-colors"
          >
            返回前台
          </Link>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-5 md:p-7">
        {msg && (
          <div className="mb-4 text-[12px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 rounded-lg py-2 px-3 flex items-center justify-between">
            <span className="truncate">{msg}</span>
            <button
              onClick={() => setMsg('')}
              className="text-[#4A5768] hover:text-[#E8EFF7] ml-3 shrink-0"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div>
            <h2 className="text-[17px] font-semibold text-white mb-4">数据总览</h2>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: '用户', value: stats.users },
                { label: '游戏', value: stats.games },
                { label: '招募', value: stats.recruits },
                { label: '动态', value: stats.moments },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <p className="text-[11px] text-[#5C6B7F]">{s.label}</p>
                  <p className="text-[22px] font-semibold text-white mt-1 tabular-nums">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-[17px] font-semibold text-white">用户管理</h2>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="搜索 ID / 昵称 / 邮箱"
                className="h-9 w-full sm:w-56 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[12px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
              <table className="w-full text-left text-[12px] min-w-[720px]">
                <thead className="bg-white/[0.03] text-[#5C6B7F]">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">ID</th>
                    <th className="px-3 py-2.5 font-medium">用户</th>
                    <th className="px-3 py-2.5 font-medium">等级</th>
                    <th className="px-3 py-2.5 font-medium">经验</th>
                    <th className="px-3 py-2.5 font-medium">状态</th>
                    <th className="px-3 py-2.5 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.map((u) => {
                    const isBanned = u.banned_until && new Date(u.banned_until) > new Date()
                    const lvl = calculateLevel(u.experience || 0, u.id)
                    const isSelf = u.id === userProfile.id
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[#94A3B8]">{u.id}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={u.avatar_url || '/logo.png'}
                              alt={u.nickname}
                              className="w-6 h-6 rounded-full object-cover bg-black shrink-0"
                            />
                            <span className="truncate max-w-[120px] text-[#E8EFF7]">
                              {u.nickname}
                            </span>
                            {u.role === 'super_admin' && (
                              <span className="text-[9px] text-red-400 border border-red-500/30 bg-red-500/10 rounded px-1 py-0.5 shrink-0">
                                超管
                              </span>
                            )}
                            {u.role === 'admin' && (
                              <span className="text-[9px] text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 rounded px-1 py-0.5 shrink-0">
                                管理
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] text-[#4A5768] shrink-0">你</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[#5C6B7F] tabular-nums">Lv.{lvl.level}</td>
                        <td className="px-3 py-2.5 text-cyan-400 tabular-nums">{u.experience || 0}</td>
                        <td className="px-3 py-2.5">
                          {isBanned ? (
                            <span className="text-red-400">已封禁</span>
                          ) : (
                            <span className="text-[#5C6B7F]">正常</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleUpdateExp(u)}
                              disabled={busy}
                              className="h-7 px-2 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] disabled:opacity-40 transition-colors whitespace-nowrap"
                            >
                              改经验
                            </button>
                            <button
                              onClick={() => handleBanUser(u)}
                              disabled={busy || u.role === 'super_admin' || isSelf}
                              title={
                                u.role === 'super_admin'
                                  ? '不能封禁超级管理员'
                                  : isSelf
                                  ? '不能封禁自己'
                                  : ''
                              }
                              className={`h-7 px-2 rounded-md border text-[11px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap ${
                                isBanned
                                  ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                              }`}
                            >
                              {isBanned ? '解封' : '封禁'}
                            </button>
                            {isSuper && (
                              <button
                                onClick={() => handleSetRole(u)}
                                disabled={busy}
                                className="h-7 px-2 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] disabled:opacity-40 transition-colors whitespace-nowrap"
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
              {filteredUsers.length === 0 && (
                <p className="p-6 text-center text-[12px] text-[#4A5768]">没有找到用户</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-[17px] font-semibold text-white">游戏模块</h2>
              <input
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                placeholder="搜索游戏名"
                className="h-9 w-full sm:w-56 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[12px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filteredGames.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={g.cover_url || '/logo.png'}
                      alt={g.name}
                      className="w-9 h-9 rounded-lg object-cover bg-black shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-[#E8EFF7] truncate">{g.name}</p>
                      <p className="text-[10.5px] text-[#4A5768] truncate">
                        创建者 {g.creator?.nickname || '未知'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteGame(g.id, g.name)}
                    disabled={busy}
                    className="h-7 px-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] hover:bg-red-500/20 disabled:opacity-40 transition-colors shrink-0"
                  >
                    删除
                  </button>
                </div>
              ))}
              {filteredGames.length === 0 && (
                <p className="col-span-full py-8 text-center text-[12px] text-[#4A5768]">
                  没有找到模块
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'recruits' && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="text-[17px] font-semibold text-white">招募管理</h2>
              <input
                value={recruitSearch}
                onChange={(e) => setRecruitSearch(e.target.value)}
                placeholder="搜索内容 / 游戏名"
                className="h-9 w-full sm:w-56 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[12px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              {filteredRecruits.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#E8EFF7] truncate">{r.play_content}</p>
                    <p className="text-[10.5px] text-[#4A5768] truncate mt-0.5">
                      {r.games?.name || '未知'} · {r.creator?.nickname || '未知'} · {r.online_time}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRecruit(r.id)}
                    disabled={busy}
                    className="h-7 px-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-[11px] hover:bg-red-500/20 disabled:opacity-40 transition-colors shrink-0"
                  >
                    删除
                  </button>
                </div>
              ))}
              {filteredRecruits.length === 0 && (
                <p className="py-8 text-center text-[12px] text-[#4A5768]">没有找到招募</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-white">操作日志</h2>
              <button
                onClick={fetchLogs}
                className="h-8 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[12px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] transition-colors"
              >
                刷新
              </button>
            </div>

            <div className="space-y-1.5">
              {logsList.map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] font-mono flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span className="text-[#5C6B7F]">
                    {new Date(l.created_at).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-[#2E3A48]">|</span>
                  <span className="text-[#94A3B8]">{l.admin?.nickname || `ID:${l.admin_id}`}</span>
                  <span className="text-[#2E3A48]">→</span>
                  <span className="text-cyan-400">{l.action}</span>
                  <span className="text-[#5C6B7F]">
                    {l.target_type}:{l.target_id}
                  </span>
                  {l.detail && <span className="text-[#4A5768]">{JSON.stringify(l.detail)}</span>}
                </div>
              ))}
              {logsList.length === 0 && (
                <p className="py-10 text-center text-[12px] text-[#4A5768]">暂无操作记录</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
