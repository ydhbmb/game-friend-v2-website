'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('target') // 如果是从详情页点私信过来的，会带目标ID

  const [userProfile, setUserProfile] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [activeContact, setActiveContact] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  
  // 拉黑相关状态
  const [blockedIds, setBlockedIds] = useState<number[]>([])
  const [isBlockedByMe, setIsBlockedByMe] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

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

        // 3. 如果是从详情页点“私信”跳转来的，自动选中那个人
        if (targetId) {
          const { data: targetProfile } = await supabase.from('users_profile').select('*').eq('id', targetId).single()
          if (targetProfile) {
            selectContact(targetProfile)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [router, targetId])

  // 获取与选中联系人的聊天记录
  async function fetchMessages(contactId: number) {
    if (!userProfile) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userProfile.id})`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // 选中联系人
  function selectContact(contact: any) {
    setActiveContact(contact)
    setIsBlockedByMe(blockedIds.includes(contact.id))
    fetchMessages(contact.id)
  }

  // 发送消息
  async function handleSend() {
    if (!newMsg.trim() || !activeContact || !userProfile || isBlockedByMe) return
    const content = newMsg
    setNewMsg('')
    
    const { error } = await supabase.from('messages').insert({
      sender_id: userProfile.id,
      receiver_id: activeContact.id,
      content: content
    })

    if (!error) {
      fetchMessages(activeContact.id)
    }
  }

  // 拉黑 / 解除拉黑
  async function toggleBlock() {
    if (!activeContact || !userProfile) return
    
    if (isBlockedByMe) {
      // 解除拉黑
      await supabase.from('blocked_users').delete().eq('blocker_id', userProfile.id).eq('blocked_id', activeContact.id)
      setBlockedIds(blockedIds.filter(id => id !== activeContact.id))
      setIsBlockedByMe(false)
    } else {
      // 拉黑
      await supabase.from('blocked_users').insert({ blocker_id: userProfile.id, blocked_id: activeContact.id })
      setBlockedIds([...blockedIds, activeContact.id])
      setIsBlockedByMe(true)
    }
  }

  if (loading) return <div className="p-20 text-center text-gray-500">加载中...</div>

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-6xl w-full mx-auto shadow-xl my-4 rounded-2xl overflow-hidden bg-white border">
        {/* 左侧联系人列表 */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white">
            <h2 className="font-bold text-gray-800">最近聊天</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">还没有好友<br/>去游戏里关注找搭子吧！</p>
            ) : (
              contacts.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => selectContact(c)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition ${activeContact?.id === c.id ? 'bg-orange-50 border-l-4 border-orange-500' : 'hover:bg-gray-100 border-l-4 border-transparent'}`}
                >
                  <img src={c.avatar_url || '/logo.png'} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{c.nickname}</p>
                    <p className="text-xs text-gray-400">ID: {c.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右侧聊天窗口 */}
        <div className="flex-1 flex flex-col bg-white">
          {activeContact ? (
            <>
              {/* 聊天头部 */}
              <div className="p-4 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-lg text-gray-800">{activeContact.nickname}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ID: {activeContact.id}</span>
                </div>
                <button 
                  onClick={toggleBlock}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${isBlockedByMe ? 'border-gray-300 text-gray-500 hover:bg-gray-100' : 'border-red-200 text-red-500 hover:bg-red-50'}`}
                >
                  {isBlockedByMe ? '解除拉黑' : '加入黑名单'}
                </button>
              </div>
              
              {/* 聊天记录 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.map(m => {
                  const isMe = m.sender_id === userProfile.id
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[15px] ${isMe ? 'bg-orange-500 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* 输入框 */}
              <div className="p-4 border-t bg-white flex gap-3">
                {isBlockedByMe ? (
                  <div className="w-full text-center text-gray-400 text-sm py-2">
                    你已将该用户拉黑，无法发送消息。解除拉黑后可继续聊天。
                  </div>
                ) : (
                  <>
                    <input 
                      className="flex-1 border rounded-xl px-4 py-3 outline-none focus:border-orange-500 bg-gray-50 focus:bg-white transition"
                      placeholder="输入消息..."
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} className="bg-orange-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-orange-600 transition shadow-sm">发送</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
              <img src="/logo.png" className="w-24 h-24 opacity-20 mb-4 grayscale" />
              <p>选择一个联系人开始聊天</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-gray-500">加载中...</div>}>
      <MessagesContent />
    </Suspense>
  )
}