'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SectionTitle from '@/components/ui/SectionTitle'

const ROLE_LABEL: Record<string, string> = {
  leader: '会长',
  vice_leader: '副会长',
  admin: '管理员',
  member: '成员',
}

const ROLE_WEIGHT: Record<string, number> = {
  leader: 4,
  vice_leader: 3,
  admin: 2,
  member: 1,
}

export default function TeamsPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [myTeam, setMyTeam] = useState<any>(null)
  const [myRole, setMyRole] = useState<string>('')
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [teamsLoading, setTeamsLoading] = useState(false)

  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamIcon, setNewTeamIcon] = useState<File | null>(null)
  const [createMsg, setCreateMsg] = useState('')
  const [creating, setCreating] = useState(false)

  const [members, setMembers] = useState<any[]>([])
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat')

  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMsgLength = useRef(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users_profile')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      setUserProfile(profile)

      if (profile) {
        const { data: memberRows } = await supabase
          .from('team_members')
          .select('team_id, role, teams(*)')
          .eq('user_id', profile.id)
          .neq('role', 'pending')
          .limit(1)

        const memberData = memberRows && memberRows.length > 0 ? memberRows[0] : null

        if (memberData && memberData.teams) {
          setMyTeam(memberData.teams)
          setMyRole(memberData.role)
          fetchMembers(memberData.team_id)
          if (['leader', 'vice_leader', 'admin'].includes(memberData.role)) {
            fetchPending(memberData.team_id)
          }
        } else {
          fetchTeams()
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (myTeam && activeTab === 'chat') {
      fetchMessages(myTeam.id, false)
      interval = setInterval(() => fetchMessages(myTeam.id, true), 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [myTeam, activeTab])

  async function fetchTeams(keyword = '') {
    setTeamsLoading(true)
    let query = supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (keyword) query = query.ilike('name', `%${keyword}%`)
    const { data } = await query
    if (data) setAllTeams(data)
    setTeamsLoading(false)
  }

  async function fetchMembers(teamId: number) {
    const { data } = await supabase
      .from('team_members')
      .select(`role, users_profile(id, nickname, avatar_url, experience)`)
      .eq('team_id', teamId)
      .neq('role', 'pending')
    if (data) {
      setMembers([...data].sort((a: any, b: any) => ROLE_WEIGHT[b.role] - ROLE_WEIGHT[a.role]))
    }
  }

  async function fetchPending(teamId: number) {
    const { data } = await supabase
      .from('team_members')
      .select(`id, users_profile(id, nickname, avatar_url)`)
      .eq('team_id', teamId)
      .eq('role', 'pending')
    if (data) setPendingMembers(data)
  }

  async function fetchMessages(teamId: number, isSilent = false) {
    const { data } = await supabase
      .from('team_messages')
      .select(`*, user:users_profile(nickname, avatar_url)`)
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
      if (isSilent && data.length > prevMsgLength.current) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
      prevMsgLength.current = data.length
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim() || !userProfile) return setCreateMsg('请填写战队名称')
    setCreating(true)
    setCreateMsg('')

    let iconUrl = ''
    if (newTeamIcon) {
      if (newTeamIcon.size > 500 * 1024) {
        setCreating(false)
        return setCreateMsg('图标不能超过 500KB')
      }
      const ext = newTeamIcon.name.split('.').pop()
      const fileName = `team-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(fileName, newTeamIcon)
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        iconUrl = data.publicUrl
      }
    }

    const { data: newTeam, error: teamErr } = await supabase
      .from('teams')
      .insert({
        name: newTeamName.trim(),
        description: newTeamDesc.trim(),
        icon_url: iconUrl,
        leader_id: userProfile.id,
      })
      .select()
      .single()

    if (teamErr) {
      setCreating(false)
      return setCreateMsg('创建失败，名称可能已被占用')
    }

    await supabase
      .from('team_members')
      .insert({ team_id: newTeam.id, user_id: userProfile.id, role: 'leader' })

    setCreating(false)
    setMyTeam(newTeam)
    setMyRole('leader')
    setIsCreating(false)
    fetchMembers(newTeam.id)
  }

  async function handleApply(teamId: number) {
    if (!userProfile) return
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userProfile.id, role: 'pending' })
    if (error) alert('申请失败，可能已经申请过了')
    else alert('申请已发送，等待审批')
  }

  async function handleApprove(memberId: number, approve: boolean) {
    if (approve) {
      await supabase.from('team_members').update({ role: 'member' }).eq('id', memberId)
    } else {
      await supabase.from('team_members').delete().eq('id', memberId)
    }
    fetchPending(myTeam.id)
    fetchMembers(myTeam.id)
  }

  async function handleQuitTeam() {
    if (!confirm('确定退出当前战队吗？')) return
    await supabase
      .from('team_members')
      .delete()
      .eq('team_id', myTeam.id)
      .eq('user_id', userProfile.id)
    window.location.reload()
  }

  async function handleSendMsg() {
    if (!newMsg.trim() || !myTeam || !userProfile) return
    const content = newMsg
    setNewMsg('')
    await supabase
      .from('team_messages')
      .insert({ team_id: myTeam.id, user_id: userProfile.id, content })
    fetchMessages(myTeam.id)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function handlePromote(targetUserId: number, currentRole: string) {
    if (!myTeam || !userProfile) return
    if (myRole !== 'leader' && myRole !== 'vice_leader') return alert('权限不足')

    let nextRole = ''
    if (myRole === 'leader') {
      nextRole =
        currentRole === 'member' ? 'admin' : currentRole === 'admin' ? 'vice_leader' : 'member'
    } else if (myRole === 'vice_leader') {
      nextRole = currentRole === 'member' ? 'admin' : 'member'
    }

    await supabase
      .from('team_members')
      .update({ role: nextRole })
      .eq('team_id', myTeam.id)
      .eq('user_id', targetUserId)
    fetchMembers(myTeam.id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  const inputCls =
    'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

  if (myTeam) {
    const leader = members.find((m) => m.role === 'leader')
    const totalExp = members.reduce(
      (acc: number, cur: any) => acc + (cur.users_profile?.experience || 0),
      0
    )
    const canManage = ['leader', 'vice_leader', 'admin'].includes(myRole)

    return (
      <div className="h-screen bg-[#050B14] text-[#E8EFF7] flex flex-col overflow-hidden">
        <Navbar />

        <div className="border-b border-white/[0.06] shrink-0">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
            <img
              src={myTeam.icon_url || '/logo.png'}
              alt={myTeam.name}
              className="w-14 h-14 rounded-xl object-cover bg-black border border-white/[0.08] shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[17px] font-semibold text-white truncate">{myTeam.name}</h1>
                <Badge tone="accent">{ROLE_LABEL[myRole] || '成员'}</Badge>
              </div>
              <p className="text-[11.5px] text-[#5C6B7F] mt-1 truncate">
                {myTeam.description || '这个战队还没写简介'}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-[#4A5768] tabular-nums">
                <span>会长 {leader?.users_profile?.nickname || '未知'}</span>
                <span className="text-[#2E3A48]">·</span>
                <span>{members.length} 人</span>
                <span className="text-[#2E3A48]">·</span>
                <span>总经验 {totalExp}</span>
              </div>
            </div>

            {myRole !== 'leader' && (
              <Button variant="ghost" size="sm" onClick={handleQuitTeam}>
                退出战队
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden max-w-5xl w-full mx-auto">
          <div className="w-[150px] shrink-0 border-r border-white/[0.06] p-2 space-y-0.5 hidden md:block">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full text-left px-3 h-9 rounded-md text-[12.5px] transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white/[0.09] text-[#E8EFF7]'
                  : 'text-[#94A3B8] hover:bg-white/[0.04]'
              }`}
            >
              战队群聊
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full text-left px-3 h-9 rounded-md text-[12.5px] transition-colors flex items-center justify-between ${
                activeTab === 'members'
                  ? 'bg-white/[0.09] text-[#E8EFF7]'
                  : 'text-[#94A3B8] hover:bg-white/[0.04]'
              }`}
            >
              <span>成员</span>
              {pendingMembers.length > 0 && (
                <span className="text-[10px] text-cyan-400 tabular-nums">{pendingMembers.length}</span>
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="md:hidden flex border-b border-white/[0.06] shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 h-10 text-[12.5px] ${
                  activeTab === 'chat'
                    ? 'text-[#E8EFF7] border-b border-cyan-500'
                    : 'text-[#5C6B7F]'
                }`}
              >
                群聊
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 h-10 text-[12.5px] ${
                  activeTab === 'members'
                    ? 'text-[#E8EFF7] border-b border-cyan-500'
                    : 'text-[#5C6B7F]'
                }`}
              >
                成员
              </button>
            </div>

            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-[11.5px] text-[#4A5768] text-center mt-10">
                      群里还没人说话，打个招呼吧
                    </p>
                  )}
                  {messages.map((m) => {
                    const isMe = m.user_id === userProfile.id
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <img
                          src={m.user?.avatar_url || '/logo.png'}
                          alt={m.user?.nickname}
                          className="w-7 h-7 rounded-full object-cover bg-black border border-white/[0.08] mt-0.5 shrink-0"
                        />
                        <div className={`max-w-[72%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-[#4A5768] mb-1">
                            {m.user?.nickname}
                          </span>
                          <div
                            className={`px-3 py-2 rounded-lg text-[13px] leading-relaxed break-words ${
                              isMe
                                ? 'bg-cyan-600 text-white rounded-br-sm'
                                : 'bg-white/[0.06] text-[#E8EFF7] rounded-bl-sm'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="p-3 border-t border-white/[0.06] flex gap-2 shrink-0">
                  <input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMsg()}
                    maxLength={500}
                    placeholder="发送战队消息…"
                    className={inputCls}
                  />
                  <Button variant="primary" onClick={handleSendMsg} disabled={!newMsg.trim()}>
                    发送
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'members' && (
              <div className="flex-1 overflow-y-auto p-4">
                {canManage && pendingMembers.length > 0 && (
                  <div className="mb-5">
                    <SectionTitle count={`${pendingMembers.length} 人`}>待审批</SectionTitle>
                    <div className="space-y-2">
                      {pendingMembers.map((p: any) => (
                        <Card key={p.id} padded={false}>
                          <div className="p-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={p.users_profile?.avatar_url || '/logo.png'}
                                alt={p.users_profile?.nickname}
                                className="w-8 h-8 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-[12.5px] text-[#E8EFF7] truncate">
                                  {p.users_profile?.nickname}
                                </p>
                                <p className="text-[10px] text-[#4A5768] font-mono">
                                  ID:{p.users_profile?.id}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleApprove(p.id, true)}
                              >
                                同意
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleApprove(p.id, false)}
                              >
                                拒绝
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <SectionTitle count={`${members.length} 人`}>正式成员</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((m: any) => (
                    <Card key={m.users_profile.id} padded={false}>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={m.users_profile.avatar_url || '/logo.png'}
                            alt={m.users_profile.nickname}
                            className="w-8 h-8 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[12.5px] text-[#E8EFF7] truncate">
                              {m.users_profile.nickname}
                            </p>
                            <p className="text-[10px] text-[#4A5768]">
                              {ROLE_LABEL[m.role]} · Lv.
                              {Math.min(
                                68,
                                Math.floor((m.users_profile.experience || 0) / 100) + 1
                              )}
                            </p>
                          </div>
                        </div>

                        {(myRole === 'leader' || myRole === 'vice_leader') &&
                          m.users_profile.id !== userProfile.id && (
                            <button
                              onClick={() => handlePromote(m.users_profile.id, m.role)}
                              className="h-7 px-2 rounded-md text-[11px] text-[#5C6B7F] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors shrink-0"
                            >
                              改职位
                            </button>
                          )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16">

        <div className="mb-4">
          <h1 className="text-xl font-semibold text-white">战队</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            加入一支战队，找人一起打
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex items-center flex-1 min-w-0 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] focus-within:border-cyan-500/50 transition-colors px-3">
            <span className="text-[#5C6B7F] text-[11px] mr-2.5 shrink-0">搜索</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTeams(search)}
              placeholder="输入战队名称…"
              className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[#E8EFF7] placeholder-[#4A5768]"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); fetchTeams('') }}
                className="text-[#4A5768] hover:text-[#94A3B8] text-[11px] px-1 shrink-0 transition-colors"
              >
                清除
              </button>
            )}
          </div>
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            创建战队
          </Button>
        </div>

        {teamsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex gap-3"
              >
                <div className="w-11 h-11 rounded-lg bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
                  <div className="h-2.5 w-2/3 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : allTeams.length === 0 ? (
          <EmptyState
            title="还没有战队"
            description="创建第一支战队，把搭子聚起来"
            action={
              <Button variant="primary" size="sm" onClick={() => setIsCreating(true)}>
                创建战队
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allTeams.map((team) => (
              <Card key={team.id} padded={false}>
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={team.icon_url || '/logo.png'}
                      alt={team.name}
                      className="w-11 h-11 rounded-lg object-cover bg-black border border-white/[0.08] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#E8EFF7] truncate">
                        {team.name}
                      </p>
                      <p className="text-[10.5px] text-[#5C6B7F] truncate mt-0.5">
                        {team.description || '暂无简介'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApply(team.id)}
                  >
                    申请
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {isCreating && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold">创建战队</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                  战队名称 <span className="text-red-400/70">*</span>
                </label>
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  maxLength={20}
                  placeholder="如：夜猫子小队"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">简介</label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  maxLength={100}
                  placeholder="战队风格、常玩时间等"
                  className="w-full h-20 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                  图标 <span className="text-[#4A5768]">（可选，小于 500KB）</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setNewTeamIcon(f)
                  }}
                  className="block w-full text-[11.5px] text-[#5C6B7F] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11.5px] file:bg-white/[0.05] file:text-[#94A3B8] hover:file:bg-white/[0.09] file:cursor-pointer file:transition-colors"
                />
              </div>

              {createMsg && (
                <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {createMsg}
                </p>
              )}
            </div>

            <div className="px-5 pb-4 pt-1 flex gap-2">
              <Button variant="ghost" full onClick={() => setIsCreating(false)}>
                取消
              </Button>
              <Button variant="primary" full loading={creating} onClick={handleCreateTeam}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
