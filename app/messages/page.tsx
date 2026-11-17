'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/ui/Button'

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target')

  const [userProfile, setUserProfile] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [activeContact, setActiveContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const [blockedIds, setBlockedIds] = useState<number[]>([])
  const [isBlockedByMe, setIsBlockedByMe] = useState(false)

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
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id)
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profile.id)

        let contactIds: number[] = []
        if (following) contactIds = [...contactIds, ...following.map((f) => f.following_id)]
        if (followers) contactIds = [...contactIds, ...followers.map((f) => f.follower_id)]
        contactIds = Array.from(new Set(contactIds)).filter((id) => id !== profile.id)

        if (contactIds.length > 0) {
          const { data: contactsData } = await supabase
            .from('users_profile')
            .select('*')
            .in('id', contactIds)
          if (contactsData) setContacts(contactsData)
        }

        const { data: blockedData } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', profile.id)
        if (blockedData) setBlockedIds(blockedData.map((b) => b.blocked_id))

        if (targetId) {
          const { data: targetProfile } = await supabase
            .from('users_profile')
            .select('*')
            .eq('id', targetId)
            .single()
          if (targetProfile) {
            setActiveContact(targetProfile)
            setIsBlockedByMe(
              (blockedData || []).some((b) => b.blocked_id === targetProfile.id)
            )
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [router, targetId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    const currentId = activeContact?.id

    if (currentId) {
      fetchMessages(currentId, false)
      interval = setInterval(() => fetchMessages(currentId, true), 3000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeContact?.id])

  async function fetchMessages(contactId: number, isSilent = false) {
    if (!userProfile) return

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userProfile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userProfile.id})`
      )
      .order('created_at', { ascending: true })

    if (!error && data) {
      if (data.length !== prevMsgLength.current || !isSilent) {
        setMessages(data)
        if (isSilent && data.length > prevMsgLength.current) {
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
            100
          )
        }
        prevMsgLength.current = data.length

        const unread = data.filter(
          (m) =>
            m.sender_id === contactId &&
            m.receiver_id === userProfile.id &&
            !m.is_read
        )
        if (unread.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unread.map((m) => m.id))
        }
      }
    }
  }

  function selectContact(contact: any) {
    setActiveContact(contact)
    setIsBlockedByMe(blockedIds.includes(contact.id))
    prevMsgLength.current = 0
  }

  async function handleSend() {
    if (!newMsg.trim() || !activeContact || !userProfile || isBlockedByMe) return
    const content = newMsg
    setNewMsg('')

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender_id: userProfile.id,
        receiver_id: activeContact.id,
        content,
        created_at: new Date().toISOString(),
        is_read: false,
      },
    ])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    prevMsgLength.current += 1

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: userProfile.id,
        receiver_id: activeContact.id,
        content,
      })

    if (!error) {
      fetchMessages(activeContact.id, true)
    } else {
      alert('发送失败，请检查网络')
    }
  }

  async function toggleBlock() {
    if (!activeContact || !userProfile) return
    if (isBlockedByMe) {
      await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', userProfile.id)
        .eq('blocked_id', activeContact.id)
      setBlockedIds(blockedIds.filter((id) => id !== activeContact.id))
      setIsBlockedByMe(false)
    } else {
      await supabase
        .from('blocked_users')
        .insert({ blocker_id: userProfile.id, blocked_id: activeContact.id })
      setBlockedIds([...blockedIds, activeContact.id])
      setIsBlockedByMe(true)
    }
  }

  if (loading && !activeContact) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#050B14] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-5xl w-full mx-auto overflow-hidden md:rounded-xl md:my-4 border border-white/[0.06] bg-[#0A111F]/70">

        <div
          className={`w-full md:w-[220px] shrink-0 border-r border-white/[0.06] flex-col ${
            activeContact ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="px-3.5 py-3 border-b border-white/[0.06]">
            <h2 className="text-[12.5px] font-semibold">通讯录</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {contacts.length === 0 ? (
              <p className="text-[11px] text-[#4A5768] text-center mt-8 px-3 leading-relaxed">
                还没有可以聊天的联系人
                <br />
                去大厅关注或发布招募吧
              </p>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectContact(c)}
                  className={`w-full flex items-center gap-2.5 px-2 h-12 rounded-md transition-colors text-left ${
                    activeContact?.id === c.id
                      ? 'bg-white/[0.09]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <img
                    src={c.avatar_url || '/logo.png'}
                    alt={c.nickname}
                    className="w-8 h-8 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#E8EFF7] truncate">
                      {c.nickname}
                    </p>
                    <p className="text-[10px] text-[#4A5768] font-mono">
                      ID:{c.id}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`flex-1 flex-col min-w-0 ${
            !activeContact ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeContact ? (
            <>
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setActiveContact(null)}
                    className="md:hidden text-[#5C6B7F] hover:text-[#E8EFF7] text-sm shrink-0"
                  >
                    ←
                  </button>
                  <span className="text-[13px] font-medium text-[#E8EFF7] truncate">
                    {activeContact.nickname}
                  </span>
                  <span className="text-[10px] text-[#4A5768] font-mono shrink-0">
                    ID:{activeContact.id}
                  </span>
                </div>

                <button
                  onClick={toggleBlock}
                  className={`h-7 px-2.5 rounded-md border text-[11px] shrink-0 transition-colors ${
                    isBlockedByMe
                      ? 'bg-white/[0.05] text-[#94A3B8] border-white/[0.08] hover:bg-white/[0.09]'
                      : 'bg-transparent text-[#4A5768] border-white/[0.06] hover:text-red-400 hover:border-red-500/30'
                  }`}
                >
                  {isBlockedByMe ? '解除拉黑' : '拉黑'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-[11.5px] text-[#4A5768] text-center mt-10">
                    还没有消息，说点什么吧
                  </p>
                )}

                {messages.map((m, index) => {
                  const isMe = m.sender_id === userProfile.id
                  return (
                    <div
                      key={m.id || index}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-3 py-2 rounded-lg text-[13px] leading-relaxed break-words ${
                          isMe
                            ? 'bg-cyan-600 text-white rounded-br-sm'
                            : 'bg-white/[0.06] text-[#E8EFF7] rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="px-3 py-2.5 border-t border-white/[0.06]">
                {isBlockedByMe ? (
                  <p className="text-center text-[11.5px] text-[#4A5768] py-2">
                    已拉黑该用户，解除后可继续聊天
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      maxLength={500}
                      placeholder="输入消息…"
                      className="flex-1 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <Button variant="primary" onClick={handleSend} disabled={!newMsg.trim()}>
                      发送
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-2">
              <p className="text-[12px] text-[#4A5768]">选择联系人开始聊天</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
          加载中…
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}
