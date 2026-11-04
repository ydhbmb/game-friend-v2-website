'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'

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
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const prevMsgLength = useRef(0) // 用于判断是否有新消息

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)
      
      if (profile) {
        // 1. 获取互相关注的联系人
        const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
        const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id)

        let contactIds: number[] = []
        if (following) contactIds = [...contactIds, ...following.map(f => f.following_id)]
        if (followers) contactIds = [...contactIds, ...followers.map(f => f.follower_id)]
        contactIds = Array.from(new Set(contactIds)).filter(id => id !== profile.id)

        if (contactIds.length > 0) {
          const { data: contactsData } = await supabase.from('users_profile').select('*').in('id', contactIds)
          if (contactsData) setContacts(contactsData)
        }

        // 2. 获取我拉黑的人
        const { data: blockedData } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', profile.id)
        if (blockedData) {
          setBlockedIds(blockedData.map(b => b.blocked_id))
        }

        // 3. 自动选中
        if (targetId) {
          const { data: targetProfile } = await supabase.from('users_profile').select('*').eq('id', targetId).single()
          if (targetProfile) selectContact(targetProfile)
        }
      }
      setLoading(false)
    }
    init()
  }, [router, targetId])

  // 🔥 核心：实时轮询（每3秒刷新一次聊天记录）
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeContact && userProfile) {
      interval = setInterval(() => {
        fetchMessages(activeContact.id, true) // 传入 true 代表是后台静默刷新
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeContact, userProfile])

  async function fetchMessages(contactId: number, isSilent = false) {
    if (!userProfile) return
    if (!isSilent) setLoading(true) // 如果不是静默刷新，显示加载动画

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userProfile.id})`)
      .order('created_at', { ascending: true })
    
    if (data) {
      setMessages(data)
      
      // 只有当有新消息，且是静默刷新时，才自动滚到底部
      if (isSilent && data.length > prevMsgLength.current) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
      prevMsgLength.current = data.length
    }
    if (!isSilent) setLoading(false)
  }

  function selectContact(contact: any) {
    setActiveContact(contact)
    setIsBlockedByMe(blockedIds.includes(contact.id))
    prevMsgLength.current = 0 // 切换联系人重置消息长度
    fetchMessages(contact.id)
  }

  async function handleSend() {
    if (!newMsg.trim() || !activeContact || !userProfile || isBlockedByMe) return
    const content = newMsg
    setNewMsg('')
    
    // 发送后立刻更新本地UI（乐观更新），不用等轮询
    const tempMsg = {
      id: Date.now(),
      sender_id: userProfile.id,
      receiver_id: activeContact.id,
      content: content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    prevMsgLength.current += 1

    const { error } = await supabase.from('messages').insert({
      sender_id: userProfile.id,
      receiver_id: activeContact.id,
      content: content
    })
    if (error) {
      alert('发送失败，请检查网络')
      fetchMessages(activeContact.id) // 失败则重新拉取真实数据
    }
  }

  async function toggleBlock() {
    if (!activeContact || !userProfile) return
    if (isBlockedByMe) {
      await supabase.from('blocked_users').delete().eq('blocker_id', userProfile.id).eq('blocked_id', activeContact.id)
      setBlockedIds(blockedIds.filter(id => id !== activeContact.id))
      setIsBlockedByMe(false)
    } else {
      await supabase.from('blocked_users').insert({ blocker_id: userProfile.id, blocked_id: activeContact.id })
      setBlockedIds([...blockedIds, activeContact.id])
      setIsBlockedByMe(true)
    }
  }

  if (loading && !activeContact) return <div className="min-h-screen bg-[#050B14] p-20 text-center text-cyan-500 animate-pulse">建立加密信道中...</div>

  return (
    <div className="h-screen bg-[#050B14] flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <Navbar />

        <div className="flex-1 flex max-w-6xl w-full mx-auto shadow-[0_0_30px_rgba(0,0,0,0.8)] my-0 md:my-4 md:rounded-2xl overflow-hidden border border-gray-800 bg-[#0A111F]">
          
          {/* 左侧联系人列表 */}
          <div className={`w-full md:w-1/3 border-r border-gray-800 bg-[#050B14]/50 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-800 bg-black/40">
              <h2 className="font-bold text-cyan-400 tracking-wider font-orbitron">通讯录</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-center text-gray-500 text-sm mt-10">暂未建立任何连接<br/>去大厅关注找搭子吧！</p>
              ) : (
                contacts.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => selectContact(c)}
                    className={`p-4 flex items-center gap-3 cursor-pointer transition-all border-l-4 ${activeContact?.id === c.id ? 'bg-cyan-900/20 border-cyan-500' : 'border-transparent hover:bg-gray-800/50'}`}
                  >
                    <div className="relative">
                      <img src={c.avatar_url || '/logo.png'} className="w-12 h-12 rounded border border-gray-700 object-cover bg-black" />
                      {activeContact?.id === c.id && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A111F]"></span>}
                    </div>
                    <div>
                      <p className="font-bold text-gray-200 text-sm">{c.nickname}</p>
                      <p className="text-xs text-cyan-500/70 font-mono">ID: {c.id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧聊天窗口 */}
          <div className={`flex-1 flex flex-col bg-[#0A111F] ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
            {activeContact ? (
              <>
                <div className="p-4 border-b border-gray-800 bg-black/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveContact(null)} className="md:hidden text-cyan-500 font-bold mr-2">←</button>
                    <h2 className="font-bold text-lg text-white">{activeContact.nickname}</h2>
                    <span className="text-xs text-fuchsia-400 border border-fuchsia-500/30 px-2 py-0.5 rounded">ID: {activeContact.id}</span>
                  </div>
                  <button 
                    onClick={toggleBlock}
                    className={`text-xs px-3 py-1.5 rounded transition border ${isBlockedByMe ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40'}`}
                  >
                    {isBlockedByMe ? '解除拉黑' : '加入黑名单'}
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" ref={messageContainerRef}>
                  {messages.map((m, index) => {
                    const isMe = m.sender_id === userProfile.id
                    return (
                      <div key={m.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-[15px] shadow-sm ${
                          isMe ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-sm' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="p-4 border-t border-gray-800 bg-black/40 flex gap-3">
                  {isBlockedByMe ? (
                    <div className="w-full text-center text-red-400 text-sm py-2 border border-red-500/30 bg-red-900/10 rounded-lg">
                      你已将该用户拉黑，解除后可继续聊天。
                    </div>
                  ) : (
                    <>
                      <input 
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                        placeholder="输入加密信息..."
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      />
                      <button onClick={handleSend} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all">发送</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600 flex-col">
                <img src="/logo.png" className="w-24 h-24 opacity-10 mb-4 grayscale" />
                <p className="tracking-widest text-sm font-orbitron">选择联系人开始聊天</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B14] p-20 text-center text-cyan-500">加载中...</div>}>
      <MessagesContent />
    </Suspense>
  )
}