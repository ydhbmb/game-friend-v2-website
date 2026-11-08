'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FollowUserButton({ targetId, currentUserId }: { targetId: number, currentUserId?: number }) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUserId || currentUserId === targetId) { setLoading(false); return }
    supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', targetId).single().then(({ data }) => {
      setIsFollowing(!!data)
      setLoading(false)
    })
  }, [currentUserId, targetId])

  async function toggleFollow(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!currentUserId) return alert('请先登录！')
    if (currentUserId === targetId) return

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', targetId)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      await supabase.from('notifications').insert({ user_id: targetId, actor_id: currentUserId, type: 'follow' })
      setIsFollowing(true)
    }
  }

  if (loading || !currentUserId || currentUserId === targetId) return null

  return (
    <button 
      onClick={toggleFollow} 
      className={`px-3 py-1 rounded text-xs font-bold transition-all border ${
        isFollowing 
          ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50' 
          : 'bg-transparent text-blue-400 border-blue-500/50 hover:bg-blue-500/20'
      }`}
    >
      {isFollowing ? '已关注' : '+ 关注'}
    </button>
  )
}