'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase.from('users_profile').select('id').eq('auth_id', user.id).single()
        if (!profile) return

        const { data } = await supabase
          .from('notifications')
          .select(`*, actor:users_profile!notifications_actor_id_fkey(nickname, avatar_url, id)`)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (data) setNotifications(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 pt-10">
        <h1 className="text-2xl font-black text-cyan-400 mb-6 font-orbitron tracking-wider flex items-center gap-2">
          <span className="text-3xl">🔔</span> 通知中心
        </h1>
        
        {loading ? (
          <p className="text-center text-gray-500 animate-pulse">加载中...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-[#0A111F] rounded-2xl border border-dashed border-gray-700 p-10 text-center text-gray-500">
            暂时没有新通知，快去大厅逛逛吧！
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(n => (
              <div key={n.id} className="bg-[#0A111F]/80 backdrop-blur-sm p-4 rounded-xl border border-cyan-900/50 flex items-start justify-between hover:border-cyan-500/50 transition">
                <div className="flex items-start gap-4">
                  <img src={n.actor?.avatar_url || '/logo.png'} className="w-12 h-12 rounded-full object-cover bg-gray-800 border border-gray-700 mt-1" />
                  <div>
                    <p className="text-[15px] leading-relaxed">
                      <span className="font-bold text-white mr-2">{n.actor?.nickname}</span>
                      {n.type === 'follow' && <span className="text-gray-300">关注了你</span>}
                      {n.type === 'comment' && (
                        <span className="text-gray-300">评论了你的招募：<span className="text-cyan-400">"{n.content}"</span></span>
                      )}
                      {n.type === 'new_recruit' && (
                        <span className="text-gray-300">
                          发布了一条新招募：<span className="text-cyan-400">"{n.content}"</span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 font-mono">
                      ID: {n.actor?.id} · {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* 如果是新招募通知，加上直接前往按钮 */}
                {n.type === 'new_recruit' && n.related_id && (
                  <Link href={`/game/${n.related_id}`} className="text-xs bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 px-3 py-1.5 rounded-lg hover:bg-cyan-600 hover:text-white transition whitespace-nowrap">
                    去围观 →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}