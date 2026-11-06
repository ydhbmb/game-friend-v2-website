'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function TeamsPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [myTeam, setMyTeam] = useState<any>(null)
  const [myRole, setMyRole] = useState<string>('')
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [search, setSearch] = useState('')
  
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamIcon, setNewTeamIcon] = useState<File | null>(null)
  const [createMsg, setCreateMsg] = useState('')

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
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)

      if (profile) {
        const { data: memberData } = await supabase.from('team_members').select('team_id, role, teams(*)').eq('user_id', profile.id).neq('role', 'pending').single()
        
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
      fetchMessages(myTeam.id, true)
      interval = setInterval(() => fetchMessages(myTeam.id, true), 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [myTeam, activeTab])

  async function fetchTeams(keyword = '') {
    let query = supabase.from('teams').select('*').order('created_at', { ascending: false }).limit(20)
    if (keyword) query = query.ilike('name', `%${keyword}%`)
    const { data } = await query
    if (data) setAllTeams(data)
  }

  async function fetchMembers(teamId: number) {
    const { data } = await supabase.from('team_members').select(`role, users_profile(id, nickname, avatar_url)`).eq('team_id', teamId).neq('role', 'pending')
    if (data) {
      const roleWeight: any = { leader: 4, vice_leader: 3, admin: 2, member: 1 }
      setMembers(data.sort((a, b) => roleWeight[b.role] - roleWeight[a.role]))
    }
  }

  async function fetchPending(teamId: number) {
    const { data } = await supabase.from('team_members').select(`id, users_profile(id, nickname, avatar_url)`).eq('team_id', teamId).eq('role', 'pending')
    if (data) setPendingMembers(data)
  }

  async function fetchMessages(teamId: number, isSilent = false) {
    const { data } = await supabase.from('team_messages').select(`*, user:users_profile(nickname, avatar_url)`).eq('team_id', teamId).order('created_at', { ascending: true })
    if (data) {
      setMessages(data)
      if (isSilent && data.length > prevMsgLength.current) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      prevMsgLength.current = data.length
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName || !userProfile) return setCreateMsg('请填写名称')
    setCreateMsg('创建中...')
    let iconUrl = ''
    if (newTeamIcon) {
      if (newTeamIcon.size > 500 * 1024) return setCreateMsg('图标不能超过 500KB')
      const fileName = `team-${Date.now()}.${newTeamIcon.name.split('.').pop()}`
      const { error } = await supabase.storage.from('avatars').upload(fileName, newTeamIcon)
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
        iconUrl = data.publicUrl
      }
    }
    const { data: newTeam, error: teamErr } = await supabase.from('teams').insert({ name: newTeamName, description: newTeamDesc, icon_url: iconUrl, leader_id: userProfile.id }).select().single()
    if (teamErr) return setCreateMsg('创建失败，名字可能已存在')

    await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: userProfile.id, role: 'leader' })
    setMyTeam(newTeam); setMyRole('leader'); setIsCreating(false)
  }

  async function handleApply(teamId: number) {
    if (!userProfile) return
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userProfile.id, role: 'pending' })
    if (error) alert('申请失败，可能你已经申请过了')
    else alert('申请已发送，请等待审批！')
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
    if (!confirm('确定要退出当前战队吗？')) return
    await supabase.from('team_members').delete().eq('team_id', myTeam.id).eq('user_id', userProfile.id)
    window.location.reload()
  }

  async function handleSendMsg() {
    if (!newMsg.trim() || !myTeam || !userProfile) return
    const content = newMsg
    setNewMsg('')
    await supabase.from('team_messages').insert({ team_id: myTeam.id, user_id: userProfile.id, content })
    fetchMessages(myTeam.id)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function handlePromote(targetUserId: number, currentRole: string) {
    if (!myTeam || !userProfile) return
    if (myRole !== 'leader' && myRole !== 'vice_leader') return alert('权限不足')
    
    let nextRole = ''
    if (myRole === 'leader') {
      nextRole = currentRole === 'member' ? 'admin' : currentRole === 'admin' ? 'vice_leader' : 'member'
    } else if (myRole === 'vice_leader') {
      nextRole = currentRole === 'member' ? 'admin' : 'member'
    }
    
    await supabase.from('team_members').update({ role: nextRole }).eq('team_id', myTeam.id).eq('user_id', targetUserId)
    fetchMembers(myTeam.id)
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500">加载中...</div>

  if (myTeam) {
    return (
      <div className="min-h-screen bg-[#050B14] flex flex-col h-screen overflow-hidden">
        <Navbar />
        
        {/* 🔥 全新的战队头部资料卡 */}
        <div className="bg-[#0A111F] border-b border-cyan-500/30 p-6 flex flex-col md:flex-row items-center gap-6 shrink-0 shadow-lg z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/logo.png')] bg-right bg-no-repeat bg-contain opacity-5 pointer-events-none"></div>
          
          <img src={myTeam.icon_url || '/logo.png'} className="w-24 h-24 rounded-2xl border-2 border-cyan-400 bg-black object-cover shadow-[0_0_20px_rgba(6,182,212,0.4)] relative z-10" />
          
          <div className="flex-1 text-center md:text-left relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white font-orbitron tracking-wider">{myTeam.name}</h1>
              <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                Lv.1 初建战队
              </span>
            </div>
            <p className="text-sm text-gray-400 font-mono mb-4">{myTeam.description || '这个战队很神秘，什么都没留下。'}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-cyan-500 font-mono">
              <span>👑 会长: {members.find(m => m.role === 'leader')?.users_profile?.nickname || '未知'}</span>
              <span>👥 成员: {members.length} 人</span>
              <span>⚔️ 战力: {members.reduce((acc, cur) => acc + (cur.users_profile?.id || 0), 0)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-cyan-900/30 border border-cyan-500/30 px-4 py-2 rounded-lg text-center">
               <span className="block text-[10px] text-cyan-400 mb-1">我的职位</span>
               <span className="font-bold text-white text-sm">{myRole === 'leader' ? '👑 会长' : myRole === 'vice_leader' ? '⚔️ 副会长' : myRole === 'admin' ? '🛡️ 管理员' : '👤 成员'}</span>
            </div>
            {myRole !== 'leader' && (
              <button onClick={handleQuitTeam} className="text-xs bg-red-900/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-lg hover:bg-red-900/40 transition">退出</button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden max-w-[1400px] w-full mx-auto">
          <div className="w-48 bg-[#050B14] border-r border-gray-800 p-4 space-y-2 shrink-0 hidden md:block">
            <button onClick={() => setActiveTab('chat')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'chat' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>💬 战队群聊</button>
            <button onClick={() => setActiveTab('members')} className={`w-full text-left px-4 py-3 rounded-xl font-bold transition ${activeTab === 'members' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
              👥 成员与审批 {pendingMembers.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingMembers.length}</span>}
            </button>
          </div>

          <div className="flex-1 flex flex-col bg-[#0A111F] relative">
            {activeTab === 'chat' && (
              <>
                <div className="p-4 border-b border-gray-800 bg-black/40 md:hidden">
                   <button onClick={() => setActiveTab('members')} className="text-cyan-400 text-sm">切换至成员与审批</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(m => {
                    const isMe = m.user_id === userProfile.id
                    return (
                      <div key={m.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <img src={m.user?.avatar_url || '/logo.png'} className="w-8 h-8 rounded-full border border-gray-600 bg-black mt-1" />
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          <span className="text-[10px] text-gray-500 mb-1">{m.user?.nickname}</span>
                          <div className={`px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-cyan-600 text-white rounded-l-xl rounded-br-xl' : 'bg-gray-800 text-gray-200 rounded-r-xl rounded-bl-xl'}`}>{m.content}</div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="p-4 border-t border-gray-800 bg-black/40 flex gap-2">
                   <input className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500" placeholder="发送战队消息..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMsg()} />
                   <button onClick={handleSendMsg} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]">发送</button>
                </div>
              </>
            )}

            {activeTab === 'members' && (
              <div className="flex-1 overflow-y-auto p-6">
                {(['leader', 'vice_leader', 'admin'].includes(myRole)) && pendingMembers.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">⏳ 待审批申请 ({pendingMembers.length})</h2>
                    <div className="space-y-3">
                      {pendingMembers.map((p: any) => (
                        <div key={p.id} className="bg-yellow-900/10 border border-yellow-500/30 p-4 rounded-xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <img src={p.users_profile?.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-700 bg-black" />
                             <div>
                               <p className="text-sm font-bold text-white">{p.users_profile?.nickname}</p>
                               <p className="text-[10px] text-gray-500">ID: {p.users_profile?.id}</p>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <button onClick={() => handleApprove(p.id, true)} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-500 transition">同意</button>
                             <button onClick={() => handleApprove(p.id, false)} className="text-xs bg-gray-800 text-red-400 border border-gray-700 px-4 py-1.5 rounded hover:bg-gray-700 transition">拒绝</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-xl font-bold text-cyan-400 mb-4 font-orbitron">正式成员 ({members.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map((m: any) => (
                    <div key={m.users_profile.id} className="bg-[#050B14] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-cyan-500/50 transition">
                       <div className="flex items-center gap-3">
                         <img src={m.users_profile.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-700 bg-black" />
                         <div>
                           <p className="text-sm font-bold text-white">{m.users_profile.nickname}</p>
                           <p className="text-[10px] text-gray-500">ID: {m.users_profile.id}</p>
                         </div>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                         <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-600">
                           {m.role === 'leader' ? '👑 会长' : m.role === 'vice_leader' ? '⚔️ 副会长' : m.role === 'admin' ? '🛡️ 管理员' : '👤 成员'}
                         </span>
                         {(myRole === 'leader' || myRole === 'vice_leader') && m.users_profile.id !== userProfile.id && (
                           <button onClick={() => handlePromote(m.users_profile.id, m.role)} className="text-[10px] text-cyan-400 hover:text-white underline">修改职位</button>
                         )}
                       </div>
                    </div>
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
    <div className="min-h-screen bg-[#050B14] text-gray-200">
      <Navbar />
      
      <main className="max-w-5xl mx-auto p-6 pt-12">
        <div className="text-center mb-12 relative">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-orbitron mb-4">寻找你的星际战队</h1>
          <p className="text-cyan-600 font-mono tracking-widest">// JOIN A TEAM, CONQUER THE GALAXY</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 bg-[#0A111F] p-4 rounded-2xl border border-cyan-900/50">
          <div className="flex items-center bg-[#050B14] border border-gray-700 rounded-xl px-4 py-2 w-full md:w-96">
            <span className="text-cyan-500 mr-2">🔍</span>
            <input className="bg-transparent outline-none w-full text-white" placeholder="搜索战队名称..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchTeams(search)} />
          </div>
          <button onClick={() => setIsCreating(true)} className="w-full md:w-auto bg-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]">+ 创建战队</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allTeams.map(team => (
            <div key={team.id} className="bg-[#0A111F] p-5 rounded-2xl border border-gray-800 flex justify-between items-center hover:border-cyan-500/50 transition">
              <div className="flex items-center gap-4">
                <img src={team.icon_url || '/logo.png'} className="w-14 h-14 rounded-xl border border-gray-700 bg-black object-cover" />
                <div>
                  <h3 className="font-bold text-lg text-white font-orbitron">{team.name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">{team.description || '暂无简介'}</p>
                </div>
              </div>
              <button onClick={() => handleApply(team.id)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-500 whitespace-nowrap">申请加入</button>
            </div>
          ))}
          {allTeams.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">暂无战队，快去创建第一个吧！</p>}
        </div>
      </main>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h3 className="text-2xl font-black text-white mb-6 text-center font-orbitron">建立新战队</h3>
            <div className="space-y-4">
              <input className="w-full bg-[#050B14] border border-gray-700 rounded-xl px-4 py-2 text-white" placeholder="战队名称（唯一）" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              <textarea className="w-full bg-[#050B14] border border-gray-700 rounded-xl px-4 py-2 text-white h-24 resize-none" placeholder="战队简介..." value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} />
              <div>
                <label className="text-xs text-cyan-500 mb-1 block">上传战队图标 (小于500KB)</label>
                <input type="file" accept="image/*" className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-cyan-900/50 file:text-cyan-400 hover:file:bg-cyan-800/50" onChange={(e) => { if(e.target.files) setNewTeamIcon(e.target.files[0]) }} />
              </div>
            </div>
            {createMsg && <p className="text-red-500 text-sm mt-4 text-center">{createMsg}</p>}
            <div className="flex gap-4 mt-6">
              <button onClick={() => setIsCreating(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold">取消</button>
              <button onClick={handleCreateTeam} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]">确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}