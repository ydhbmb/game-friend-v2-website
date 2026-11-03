'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreatePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [playTime, setPlayTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/register') // 没登录跳去注册
      } else {
        setUser(data.user)
      }
    })
  }, [router])

  async function handleCreate() {
    if (!title || !playTime) {
      setMsg('游戏名称和常玩时间必填')
      return
    }
    setLoading(true)
    setMsg('')

    const { error } = await supabase.from('modules').insert({
      title,
      description,
      play_time: playTime,
      user_id: user.id,
      user_name: user.user_metadata?.name || '匿名玩家',
    })

    setLoading(false)
    if (error) {
      setMsg('发布失败：' + error.message)
    } else {
      router.push('/') // 成功回首页
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold text-center">发布找搭子模块</h1>
        
        <input
          className="w-full border rounded-lg px-4 py-2"
          placeholder="游戏名称（如：英雄联盟）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-lg px-4 py-2"
          placeholder="补充说明（如：要求段位、脾气好等）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="w-full border rounded-lg px-4 py-2"
          placeholder="常玩时间（如：每晚 20:00-23:00）"
          value={playTime}
          onChange={(e) => setPlayTime(e.target.value)}
        />

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? '发布中...' : '确认发布'}
        </button>

        {msg && <p className="text-sm text-center text-red-500">{msg}</p>}
      </div>
    </div>
  )
}