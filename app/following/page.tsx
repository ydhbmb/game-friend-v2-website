'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import Link from 'next/link'

export default function FollowingPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [followingList, setFollowingList] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([]) // 记录谁在哪个组
  const [activeGroup, setActiveGroup] = useState<string>('all') 
  const [loading, setLoading] = useState(true)

  // 新建分组状态
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // 分配分组状态
  const [assignUser, setAssignUser] = useState<any>(null) // 当前要分配的用户
  const [userCheckedGroups, setUserCheckedGroups] = useState<number[]>([]) // 选中的组

  // 一键摇人状态
  const [isShaking, setIsShaking] = useState(false)
  const [shakeMsg, setShakeMsg] = useState('')
  const [shakeLoading, setShakeLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)

      if (profile) {
        // 获取关注的人
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
        if (follows && follows.length > 0) {
          const ids = follows.map(f => f.following_id)
          const { data: profiles } = await supabase.from('users_profile').select('*').in('id', ids)
          if (profiles) setFollowingList(profiles)
        }

        // 获取分组
        const { data: gData } = await supabase.from('follow_groups').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
        if (gData) setGroups(gData)

        // 获取所有组员关系
        const { data: gmData } = await supabase.from('group_members').select('*')
        if (gmData) setGroupMembers(gmData)
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    const { data, error } = await supabase.from('follow_groups').insert({ user_id: userProfile.id, name: newGroupName }).select().single()
    if (!error) {
      setGroups([data, ...groups])
      setIsCreatingGroup(false)
      setNewGroupName('')
    }
  }

  async function handleUnfollow(targetId: number) {
    if (!confirm('确定要取消关注吗？')) return
    await supabase.from('follows').delete().eq('follower_id', userProfile.id).eq('following_id', targetId)
    setFollowingList(followingList.filter(u => u.id !== targetId))
  }

  // ================ 分配分组逻辑 ================
  function openAssignModal(user: any) {
    setAssignUser(user)
    // 找出该用户目前所在的所有分组
    const currentGroups = groupMembers
      .filter(gm => gm.following_id === user.id)
      .map(gm => gm.group_id)
    setUserCheckedGroups(currentGroups)
  }

  async function handleSaveAssignment() {
    if (!assignUser) return
    
    // 简单粗暴的覆盖式更新：先删掉该用户的所有分组记录，再重新插入
    await supabase.from('group_members').delete().eq('following_id', assignUser.id)
    
    if (userCheckedGroups.length > 0) {
      const newRelations = userCheckedGroups.map(gid => ({ group_id: gid, following_id: assignUser.id }))
      await supabase.from('group_members').insert(newRelations)
    }

    // 刷新全局数据
    const { data: gmData } = await supabase.from('group_members').select('*')
    if (gmData) setGroupMembers(gmData)
    setAssignUser(null)
  }

  // ================ 一键摇人逻辑 ================
  async function handleShake() {
    if (!shakeMsg.trim()) return alert('请输入摇人喊话内容')
    setShakeLoading(true)

    // 找出当前分组下所有好友的 ID
    const targetIds = displayUsers.map(u => u.id)
    if (targetIds.length === 0) {
      setShakeLoading(false)
      return alert('当前分组没有任何人')
    }

    // 批量生成私信记录
    const msgs = targetIds.map(tid => ({
      sender_id: userProfile.id,
      receiver_id: tid,
      content: `【战术集结】${shakeMsg}`
    }))

    const { error } = await supabase.from('messages').insert(msgs)
    
    setShakeLoading(false)
    if (error) {
      alert('摇人失败：' + error.message)
    } else {
      setIsShaking(false)
      setShakeMsg('')
      alert(`✅ 已成功向当前列表的 ${targetIds.length} 位好友群发战术集结令！`)
    }
  }

  // 过滤当前展示的用户
  const displayUsers = followingList.filter(u => {
    if (activeGroup === 'all') return true
    // 看这个人在不在当前选中的分组里
    return groupMembers.some(gm => gm.group_id.toString() === activeGroup && gm.following_id === u.id)
  })

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">建立战术连接中...</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200">
      <Navbar />
      
      <main className="max-w-6xl mx-auto p-6 pt-10 flex flex-col md:flex-row gap-6">
        
        {/* 左侧：分组列表 */}
        <div className="w-full md:w-1/4 shrink-0">
          <div className="bg-[#0A111F] border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-cyan-400 font-orbitron">战术分组</h2>
              <button onClick={() => setIsCreatingGroup(true)} className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded">+ 新建</button>
            </div>
            
            <div className="space-y-2">
              <div 
                onClick={() => setActiveGroup('all')} 
                className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center ${activeGroup === 'all' ? 'bg-cyan-900/40 border border-cyan-500/50' : 'hover:bg-gray-800'}`}
              >
                <span className="font-bold text-sm text-gray-200">全部关注</span>
                <span className="text-xs text-cyan-400 bg-black/50 px-2 py-0.5 rounded-full">{followingList.length}</span>
              </div>
              {groups.map(g => {
                const count = groupMembers.filter(gm => gm.group_id === g.id).length
                return (
                  <div 
                    key={g.id} 
                    onClick={() => setActiveGroup(g.id.toString())}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center ${activeGroup === g.id.toString() ? 'bg-cyan-900/40 border border-cyan-500/50' : 'hover:bg-gray-800'}`}
                  >
                    <span className="font-bold text-sm text-gray-200">{g.name}</span>
                    <span className="text-xs text-gray-500 bg-black/50 px-2 py-0.5 rounded-full">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右侧：关注的人 */}
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-end mb-6">
            <h1 className="text-2xl font-black text-white font-orbitron">
              我的关注列表
            </h1>
            {activeGroup !== 'all' && displayUsers.length > 0 && (
              <button onClick={() => setIsShaking(true)} className="bg-fuchsia-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(217,70,239,0.4)] hover:bg-fuchsia-500 transition">
                📢 一键摇人
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayUsers.map(u => {
              const lvl = calculateLevel(u.experience || 0, u.id)
              return (
                <div key={u.id} className="bg-[#0A111F]/80 backdrop-blur-md border border-gray-800 p-4 rounded-2xl flex items-center justify-between hover:border-cyan-500/50 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || '/logo.png'} className="w-12 h-12 rounded-full border border-cyan-500/50 object-cover bg-black" />
                    <div>
                      <Link href={`/profile?id=${u.id}`} className="text-sm font-bold text-white hover:text-cyan-400 transition">{u.nickname}</Link>
                      <p className="text-xs text-cyan-500 font-mono">Lv.{lvl.level} {lvl.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/messages?target=${u.id}`)} className="text-xs bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-500/20">私信</button>
                      <button onClick={() => handleUnfollow(u.id)} className="text-xs text-red-400 hover:text-red-300 px-1">取关</button>
                    </div>
                    <button onClick={() => openAssignModal(u)} className="text-[10px] text-gray-500 hover:text-white underline mt-1">管理分组</button>
                  </div>
                </div>
              )
            })}
            {displayUsers.length === 0 && <p className="col-span-full text-gray-500 py-10 text-center border border-dashed border-gray-800 rounded-xl">当前分组下没有任何好友。</p>}
          </div>
        </div>
      </main>

      {/* 新建分组弹窗 */}
      {isCreatingGroup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">新建分组</h3>
            <input className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:border-cyan-500 mb-4" placeholder="如:吃鸡车队 / 深夜修仙" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setIsCreatingGroup(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg font-bold">取消</button>
              <button onClick={handleCreateGroup} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 分配分组弹窗 */}
      {assignUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-2">为 <span className="text-cyan-400">{assignUser.nickname}</span> 分配分组</h3>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={userCheckedGroups.includes(g.id)}
                    onChange={(e) => {
                      if (e.target.checked) setUserCheckedGroups([...userCheckedGroups, g.id])
                      else setUserCheckedGroups(userCheckedGroups.filter(id => id !== g.id))
                    }}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-sm text-gray-300">{g.name}</span>
                </label>
              ))}
              {groups.length === 0 && <p className="text-xs text-gray-500">你还没有创建任何分组，请先创建。</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAssignUser(null)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg font-bold">取消</button>
              <button onClick={handleSaveAssignment} className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold">保存分配</button>
            </div>
          </div>
        </div>
      )}

      {/* 一键摇人弹窗 */}
      {isShaking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-fuchsia-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(217,70,239,0.3)]">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 mb-2 font-orbitron flex items-center gap-2">
              📢 战术集结令
            </h3>
            <p className="text-xs text-gray-400 mb-4">你将向当前分组内的 <span className="text-fuchsia-400 font-bold">{displayUsers.length}</span> 位好友群发私信。</p>
            <textarea 
              className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-fuchsia-500 h-24 resize-none mb-4" 
              placeholder="输入你的摇人喊话 (如：兄弟们，晚上8点吃鸡，速来！)" 
              value={shakeMsg} 
              onChange={e => setShakeMsg(e.target.value)} 
            />
            <div className="flex gap-2">
              <button onClick={() => setIsShaking(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg font-bold">取消</button>
              <button onClick={handleShake} disabled={shakeLoading} className="flex-1 bg-fuchsia-600 text-white py-2 rounded-lg font-bold hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                {shakeLoading ? '发送中...' : '确认群发'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}