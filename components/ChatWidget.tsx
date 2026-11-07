'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([]) // 我关注的所有人
  const [activeContact, setActiveContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  
  // 分页状态：chat(最近聊天) 或 following(我的关注)
  const [viewMode, setViewMode] = useState<'chat' | 'following'>('chat')
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMsgLength = useRef(0)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('openChatWidget', handleOpen)

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      setUserProfile(profile)
      
      if (profile) {
        // 1. 获取互关好友（用于最近聊天列表）
        const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
        const { data: followersData } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id)
        
        let mutualIds: number[] = []
        if (followingData && followersData) {
          const followingIds = followingData.map(f => f.following_id)
          const followerIds = followersData.map(f => f.follower_id)
          mutualIds = followingIds.filter(id => followerIds.includes(id))
        }

        if (mutualIds.length > 0) {
          const { data: contactsData } = await supabase.from('users_profile').select('*').in('id', mutualIds)
          if (contactsData) setContacts(contactsData)
        }

        // 2. 获取我关注的所有人（用于"我的关注"列表）
        if (followingData && followingData.length > 0) {
          const allFollowingIds = followingData.map(f => f.following_id)
          const { data: allFollowingData } = await supabase.from('users_profile').select('*').in('id', allFollowingIds)
          if (allFollowingData) setFollowing(allFollowingData)
        }
      }
    }
    init()

    return () => window.removeEventListener('openChatWidget', handleOpen)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (activeContact && userProfile && isOpen) {
      fetchMessages(activeContact.id, false)
      interval = setInterval(() => fetchMessages(activeContact.id, true), 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [activeContact, userProfile, isOpen])

  async function fetchMessages(contactId: number, isSilent = false) {
    if (!userProfile) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userProfile.id})`)
      .order('created_at', { ascending: true })
    
    if (data) {
      if (data.length !== prevMsgLength.current || !isSilent) {
        setMessages(data)
        if (isSilent && data.length > prevMsgLength.current) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
        prevMsgLength.current = data.length
        await supabase.from('messages').update({ is_read: true }).eq('sender_id', contactId).eq('receiver_id', userProfile.id).eq('is_read', false)
      }
    }
  }

  async function handleSend() {
    if (!newMsg.trim() || !activeContact || !userProfile) return
    const content = newMsg
    setNewMsg('')
    setMessages(prev => [...prev, { id: Date.now(), sender_id: userProfile.id, receiver_id: activeContact.id, content, created_at: new Date().toISOString(), is_read: false }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    
    await supabase.from('messages').insert({ sender_id: userProfile.id, receiver_id: activeContact.id, content })
  }

  function selectContact(contact: any) {
    setActiveContact(contact)
    prevMsgLength.current = 0
  }

  if (!isOpen) return null

  // 根据当前 Tab 决定展示的列表
  const displayList = viewMode === 'chat' ? contacts : following

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-[#0A111F] border border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col z-[999] overflow-hidden animate-in slide-in-from-bottom-5">
      {/* 头部 */}
      <div className="bg-[#050B14] p-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-cyan-400 font-bold font-orbitron text-sm">✉️ 战术通讯</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500 text-xl leading-none">&times;</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧列表区域 */}
        <div className={`w-1/3 border-r border-gray-800 bg-[#050B14]/50 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
          {/* 分页 Tab */}
          <div className="flex border-b border-gray-800 bg-black/40">
            <button 
              onClick={() => { setViewMode('chat'); setActiveContact(null); }} 
              className={`flex-1 py-2 text-[10px] font-bold ${viewMode === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500'}`}
            >
              聊天
            </button>
            <button 
              onClick={() => { setViewMode('following'); setActiveContact(null); }} 
              className={`flex-1 py-2 text-[10px] font-bold ${viewMode === 'following' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-gray-500'}`}
            >
              关注
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayList.length === 0 ? (
               <p className="text-center text-gray-600 text-[10px] mt-4 px-2">
                 {viewMode === 'chat' ? '暂未建立互关聊天' : '还没有关注任何人'}
               </p>
            ) : (
              displayList.map(c => (
                <div key={c.id} onClick={() => selectContact(c)} className="p-2 flex flex-col items-center cursor-pointer hover:bg-cyan-900/20 border-b border-gray-800/50">
                  <img src={c.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-700 object-cover bg-black" />
                  <span className="text-[10px] text-gray-300 mt-1 truncate w-full text-center">{c.nickname}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧聊天区域 */}
        <div className={`flex-1 flex flex-col ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
          {activeContact ? (
            <>
              <div className="p-2 bg-black/40 border-b border-gray-800 flex items-center gap-2">
                <button onClick={() => setActiveContact(null)} className="text-cyan-500 font-bold text-xs md:hidden">←</button>
                <span className="text-xs font-bold text-white truncate">{activeContact.nickname}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id === userProfile?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-1.5 text-xs rounded-lg ${m.sender_id === userProfile?.id ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-200'}`}>{m.content}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="p-2 border-t border-gray-800 bg-black/40 flex gap-1">
                <input className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500" placeholder="发送消息..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                <button onClick={handleSend} className="bg-cyan-600 text-white px-3 py-1 rounded text-xs font-bold">发送</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 flex-col p-4 text-center">
              <p className="text-[10px]">选择好友开始聊天</p>
              {viewMode === 'following' && (
                <a href="/following" className="mt-2 text-[10px] text-cyan-500 hover:underline border border-cyan-900 px-2 py-1 rounded">去管理关注分组</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}