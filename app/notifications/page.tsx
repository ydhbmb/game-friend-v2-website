'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import UserName from '@/components/UserName'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('users_profile')
          .select('id')
          .eq('auth_id', user.id)
          .single()
        if (!profile) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('notifications')
          .select(
            `*, actor:users_profile!notifications_actor_id_fkey(nickname, avatar_url, id)`
          )
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (data) {
          setNotifications(data)

          if (data.length > 0) {
            await supabase
              .from('notifications')
              .update({ is_read: true })
              .eq('user_id', profile.id)
              .eq('is_read', false)
          }
        }
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  function renderText(n: any) {
    if (n.type === 'follow') return <span className="text-[#94A3B8]">关注了你</span>
    if (n.type === 'comment')
      return (
        <span className="text-[#94A3B8]">
          评论了你的招募：
          <span className="text-[#E8EFF7]">{n.content}</span>
        </span>
      )
    if (n.type === 'new_recruit')
      return (
        <span className="text-[#94A3B8]">
          发布了新招募：
          <span className="text-[#E8EFF7]">{n.content}</span>
        </span>
      )
    return <span className="text-[#94A3B8]">有一条新消息</span>
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7]">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-white">通知中心</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            {loading ? '同步中…' : `${notifications.length} 条通知`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-white/[0.05] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                  <div className="h-2.5 w-1/3 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="暂时没有通知"
            description="有人关注你、评论你的招募时会出现在这里"
          />
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <Card key={n.id} padded={false} className={n.is_read ? 'opacity-75' : ''}>
                <div className="p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <img
                      src={n.actor?.avatar_url || '/logo.png'}
                      alt={n.actor?.nickname}
                      className="w-9 h-9 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-relaxed">
                        <UserName
                          userId={n.actor?.id}
                          nickname={n.actor?.nickname || '未知玩家'}
                          className="text-[#E8EFF7] font-medium mr-1.5 hover:text-cyan-400 transition-colors"
                        />
                        {renderText(n)}
                      </p>
                      <p className="text-[10.5px] text-[#4A5768] font-mono mt-1.5">
                        {new Date(n.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  {n.type === 'new_recruit' && n.related_id && (
                    <Link
                      href={`/game?id=${n.related_id}`}
                      className="h-7 px-2.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] transition-colors inline-flex items-center shrink-0"
                    >
                      去看看
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
