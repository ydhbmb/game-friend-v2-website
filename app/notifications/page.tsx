'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        // 1. 获取当前系统登录用户
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          console.log("没有获取到登录用户", authError)
          setLoading(false)
          return
        }

        // 2. 去资料表里找这个用户的 ID
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('id')
          .eq('auth_id', user.id)
          .single()

        if (profileError || !profile) {
          console.log("没找到对应的资料", profileError)
          setLoading(false)
          return
        }

        // 3. 查询发给我的通知（已修复双外键冲突）
        const { data, error: notifError } = await supabase
          .from('notifications')
          .select(`*, actor:users_profile!notifications_actor_id_fkey(nickname, avatar_url, id)`)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })

        if (notifError) {
          console.error("查询通知报错:", notifError)
        } else {
          setNotifications(data || [])
        }
      } catch (err) {
        console.error("发生异常:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 pt-10">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">🔔 通知中心</h1>
        
        {loading ? (
          <p className="text-center text-gray-500">加载中...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed p-10 text-center text-gray-400">
            暂时没有新通知
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(n => (
              <div key={n.id} className="p-4 rounded-xl border bg-white flex items-center justify-between hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <img src={n.actor?.avatar_url || '/logo.png'} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                  <div>
                    <p className="text-[15px]">
                      <span className="font-bold text-gray-800">{n.actor?.nickname || '未知用户'}</span> 
                      {n.type === 'follow' ? ' 关注了你' : ` 评论了你的招募：${n.content}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">ID: {n.actor?.id}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}