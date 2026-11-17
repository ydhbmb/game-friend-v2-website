'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import UserName from '@/components/UserName'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

export default function FollowingPage() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [followingList, setFollowingList] = useState<any[]>([])
  const [fansList, setFansList] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [activeGroup, setActiveGroup] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const [assignUser, setAssignUser] = useState<any>(null)
  const [userCheckedGroups, setUserCheckedGroups] = useState<number[]>([])

  const [isShaking, setIsShaking] = useState(false)
  const [shakeMsg, setShakeMsg] = useState('')
  const [shakeLoading, setShakeLoading] = useState(false)

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
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id)
        if (follows && follows.length > 0) {
          const ids = follows.map((f) => f.following_id)
          const { data: profiles } = await supabase
            .from('users_profile')
            .select('*')
            .in('id', ids)
          if (profiles) setFollowingList(profiles)
        }

        const { data: fans } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profile.id)
        if (fans && fans.length > 0) {
          const fanIds = fans.map((f) => f.follower_id)
          const { data: fanProfiles } = await supabase
            .from('users_profile')
            .select('*')
            .in('id', fanIds)
          if (fanProfiles) setFansList(fanProfiles)
        }

        const { data: gData } = await supabase
          .from('follow_groups')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
        if (gData) {
          setGroups(gData)
          if (gData.length > 0) {
            const { data: gmData } = await supabase
              .from('group_members')
              .select('*')
              .in('group_id', gData.map((g) => g.id))
            if (gmData) setGroupMembers(gmData)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function handleCreateGroup() {
    if (!newGroupName.trim() || !userProfile) return
    const { data, error } = await supabase
      .from('follow_groups')
      .insert({ user_id: userProfile.id, name: newGroupName.trim() })
      .select()
      .single()
    if (!error) {
      setGroups([data, ...groups])
      setIsCreatingGroup(false)
      setNewGroupName('')
    }
  }

  async function handleUnfollow(targetId: number) {
    if (!confirm('确定取消关注吗？')) return
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userProfile.id)
      .eq('following_id', targetId)
    setFollowingList(followingList.filter((u) => u.id !== targetId))
  }

  async function handleFollowBack(targetId: number) {
    await supabase
      .from('follows')
      .insert({ follower_id: userProfile.id, following_id: targetId })
    await supabase
      .from('notifications')
      .insert({ user_id: targetId, actor_id: userProfile.id, type: 'follow' })

    const { data: profile } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', targetId)
      .single()
    if (profile) setFollowingList([...followingList, profile])
  }

  function openAssignModal(user: any) {
    setAssignUser(user)
    const currentGroups = groupMembers
      .filter((gm) => gm.following_id === user.id)
      .map((gm) => gm.group_id)
    setUserCheckedGroups(currentGroups)
  }

  async function handleSaveAssignment() {
    if (!assignUser) return
    const myGroupIds = groups.map((g) => g.id)

    if (myGroupIds.length > 0) {
      await supabase
        .from('group_members')
        .delete()
        .in('group_id', myGroupIds)
        .eq('following_id', assignUser.id)
    }

    if (userCheckedGroups.length > 0) {
      const newRelations = userCheckedGroups.map((gid) => ({
        group_id: gid,
        following_id: assignUser.id,
      }))
      await supabase.from('group_members').insert(newRelations)
    }

    if (myGroupIds.length > 0) {
      const { data: gmData } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', myGroupIds)
      if (gmData) setGroupMembers(gmData)
    }
    setAssignUser(null)
  }

  async function handleShake() {
    if (!shakeMsg.trim()) return alert('请输入摇人内容')
    setShakeLoading(true)

    const targetIds = displayUsers.map((u) => u.id)
    if (targetIds.length === 0) {
      setShakeLoading(false)
      return alert('当前分组没有成员')
    }

    const msgs = targetIds.map((tid) => ({
      sender_id: userProfile.id,
      receiver_id: tid,
      content: `【战术集结】${shakeMsg}`,
    }))

    const { error } = await supabase.from('messages').insert(msgs)
    setShakeLoading(false)

    if (error) {
      alert('发送失败：' + error.message)
    } else {
      setIsShaking(false)
      setShakeMsg('')
      alert(`已向 ${targetIds.length} 位好友发送`)
    }
  }

  const displayUsers =
    activeGroup === 'fans'
      ? fansList
      : followingList.filter((u) => {
          if (activeGroup === 'all') return true
          return groupMembers.some(
            (gm) =>
              gm.group_id.toString() === activeGroup && gm.following_id === u.id
          )
        })

  const isMutual = (id: number) => followingList.some((f) => f.id === id)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  const inputCls =
    'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8 flex flex-col md:flex-row gap-4">

        <div className="w-full md:w-[200px] shrink-0">
          <Card padded={false}>
            <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-white/[0.06]">
              <h2 className="text-[13px] font-semibold">分组</h2>
              <button
                onClick={() => setIsCreatingGroup(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                + 新建
              </button>
            </div>

            <div className="p-1.5 space-y-0.5">
              {[
                { key: 'fans', label: '粉丝', count: fansList.length },
                { key: 'all', label: '全部关注', count: followingList.length },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveGroup(item.key)}
                  className={`w-full flex items-center justify-between px-2.5 h-9 rounded-md text-[12.5px] transition-colors ${
                    activeGroup === item.key
                      ? 'bg-white/[0.09] text-[#E8EFF7]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10.5px] text-[#5C6B7F] tabular-nums shrink-0 ml-2">
                    {item.count}
                  </span>
                </button>
              ))}

              {groups.map((g) => {
                const count = groupMembers.filter((gm) => gm.group_id === g.id).length
                const active = activeGroup === g.id.toString()
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id.toString())}
                    className={`w-full flex items-center justify-between px-2.5 h-9 rounded-md text-[12.5px] transition-colors ${
                      active
                        ? 'bg-white/[0.09] text-[#E8EFF7]'
                        : 'text-[#94A3B8] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="text-[10.5px] text-[#5C6B7F] tabular-nums shrink-0 ml-2">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[15px] font-semibold">
              {activeGroup === 'fans' ? '粉丝列表' : '关注列表'}
            </h1>
            {activeGroup !== 'all' &&
              activeGroup !== 'fans' &&
              displayUsers.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setIsShaking(true)}>
                  一键摇人
                </Button>
              )}
          </div>

          {displayUsers.length === 0 ? (
            <EmptyState
              title={activeGroup === 'fans' ? '还没有粉丝' : '当前分组没有成员'}
              description={
                activeGroup === 'fans'
                  ? '去大厅活跃一下，让别人找到你'
                  : '在「全部关注」里把人分配到这个分组'
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayUsers.map((u) => {
                const lvl = calculateLevel(u.experience || 0, u.id)
                const alreadyFollowing = isMutual(u.id)
                return (
                  <Card key={u.id} padded={false}>
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={u.avatar_url || '/logo.png'}
                          alt={u.nickname}
                          className="w-9 h-9 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                        />
                        <div className="min-w-0">
                          <UserName
                            userId={u.id}
                            nickname={u.nickname}
                            className="text-[13px] text-[#E8EFF7] truncate block hover:text-cyan-400 transition-colors"
                          />
                          <p className="text-[10.5px] text-[#5C6B7F] truncate mt-0.5">
                            Lv.{lvl.level} · {lvl.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => router.push(`/messages?target=${u.id}`)}
                          className="h-7 px-2 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] transition-colors"
                        >
                          私信
                        </button>

                        {activeGroup === 'fans' ? (
                          alreadyFollowing ? (
                            <span className="text-[11px] text-[#4A5768] px-1">已互关</span>
                          ) : (
                            <button
                              onClick={() => handleFollowBack(u.id)}
                              className="h-7 px-2 rounded-md text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            >
                              回关
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleUnfollow(u.id)}
                            className="h-7 px-2 rounded-md text-[11px] text-[#4A5768] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            取关
                          </button>
                        )}
                      </div>
                    </div>

                    {activeGroup !== 'fans' && (
                      <button
                        onClick={() => openAssignModal(u)}
                        className="w-full py-2 border-t border-white/[0.06] text-[11px] text-[#5C6B7F] hover:text-[#94A3B8] hover:bg-white/[0.03] transition-colors"
                      >
                        管理分组
                      </button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {isCreatingGroup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold">新建分组</h3>
              <button
                onClick={() => setIsCreatingGroup(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                maxLength={12}
                placeholder="如：吃鸡车队、深夜修仙"
                className={inputCls}
              />
            </div>
            <div className="px-5 pb-4 pt-1 flex gap-2">
              <Button variant="ghost" full onClick={() => setIsCreatingGroup(false)}>
                取消
              </Button>
              <Button variant="primary" full onClick={handleCreateGroup}>
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {assignUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold truncate">
                分配 {assignUser.nickname}
              </h3>
              <button
                onClick={() => setAssignUser(null)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-3 py-3 max-h-[50vh] overflow-y-auto">
              {groups.length === 0 ? (
                <p className="text-[11.5px] text-[#4A5768] text-center py-6">
                  还没有分组，先新建一个
                </p>
              ) : (
                groups.map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2.5 px-2 h-10 rounded-md hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={userCheckedGroups.includes(g.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setUserCheckedGroups([...userCheckedGroups, g.id])
                        else
                          setUserCheckedGroups(
                            userCheckedGroups.filter((id) => id !== g.id)
                          )
                      }}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <span className="text-[12.5px] text-[#94A3B8] truncate">
                      {g.name}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="px-5 pb-4 pt-1 flex gap-2">
              <Button variant="ghost" full onClick={() => setAssignUser(null)}>
                取消
              </Button>
              <Button variant="primary" full onClick={handleSaveAssignment}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {isShaking && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold">战术集结</h3>
              <button
                onClick={() => setIsShaking(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-[11.5px] text-[#5C6B7F] mb-3">
                将向当前分组内的{' '}
                <span className="text-cyan-400">{displayUsers.length}</span> 位好友群发私信
              </p>
              <textarea
                value={shakeMsg}
                onChange={(e) => setShakeMsg(e.target.value)}
                maxLength={200}
                placeholder="输入你的摇人喊话…"
                className="w-full h-24 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
              />
            </div>

            <div className="px-5 pb-4 pt-1 flex gap-2">
              <Button variant="ghost" full onClick={() => setIsShaking(false)}>
                取消
              </Button>
              <Button variant="primary" full loading={shakeLoading} onClick={handleShake}>
                确认群发
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
