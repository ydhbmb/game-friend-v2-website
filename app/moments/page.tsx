'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

type Moment = {
  id: number
  content: string
  created_at: string
  user_id: number
  user: { id: number; nickname: string; avatar_url: string | null } | null
  moment_likes: { user_id: number }[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

export default function MomentsPage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [moments, setMoments] = useState<Moment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users_profile')
          .select('*')
          .eq('auth_id', user.id)
          .single()
        if (data) setUserProfile(data)
      }
      await fetchMoments()
      setLoading(false)
    }
    init()
  }, [])

  async function fetchMoments() {
    const { data, error } = await supabase
      .from('moments')
      .select(`id, content, created_at, user_id,
               user:users_profile(id, nickname, avatar_url),
               moment_likes(user_id)`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setMsg('读取动态失败：' + error.message)
      return
    }
    if (data) setMoments(data as any)
  }

  async function handlePost() {
    const text = content.trim()
    if (!text) return setMsg('说点什么再发吧')
    if (!userProfile) return setMsg('请先登录')
    if (text.length > 200) return setMsg('最多 200 字')

    setPosting(true)
    setMsg('')

    const { error } = await supabase
      .from('moments')
      .insert({ user_id: userProfile.id, content: text })

    setPosting(false)

    if (error) {
      setMsg('发布失败：' + error.message)
      return
    }
    setContent('')
    await fetchMoments()
  }

  async function toggleLike(moment: Moment) {
    if (!userProfile) return alert('请先登录！')
    const liked = moment.moment_likes.some(l => l.user_id === userProfile.id)

    // 先动界面，点下去立即有反馈
    setMoments(prev =>
      prev.map(m =>
        m.id === moment.id
          ? {
              ...m,
              moment_likes: liked
                ? m.moment_likes.filter(l => l.user_id !== userProfile.id)
                : [...m.moment_likes, { user_id: userProfile.id }],
            }
          : m
      )
    )

    if (liked) {
      const { error } = await supabase
        .from('moment_likes')
        .delete()
        .eq('moment_id', moment.id)
        .eq('user_id', userProfile.id)
      if (error) {
        alert('取消失败：' + error.message)
        fetchMoments()
      }
    } else {
      const { error } = await supabase
        .from('moment_likes')
        .insert({ moment_id: moment.id, user_id: userProfile.id })
      if (error) {
        alert('点赞失败：' + error.message)
        fetchMoments()
      }
    }
  }

  async function handleDelete(moment: Moment) {
    if (!userProfile || moment.user_id !== userProfile.id) return
    if (!confirm('确定删除这条动态吗？')) return
    const { error } = await supabase.from('moments').delete().eq('id', moment.id)
    if (!error) fetchMoments()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">
        正在接入频道...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="relative z-10">
        <Navbar />

        <main className="max-w-2xl mx-auto px-4 md:px-6 pt-8">

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-orbitron tracking-widest">
              动态广场
            </h1>
            <p className="text-xs text-gray-500 mt-2 font-mono">PUBLIC CHANNEL · 说说你现在在打什么</p>
          </div>

          {/* 发布框 */}
          <div className="bg-[#0A111F]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 mb-8 shadow-[0_0_25px_rgba(6,182,212,0.12)]">
            {userProfile ? (
              <>
                <div className="flex gap-3">
                  <img
                    src={userProfile.avatar_url || '/logo.png'}
                    className="w-11 h-11 rounded-full border border-cyan-500/40 object-cover bg-black shrink-0"
                  />
                  <textarea
                    className="flex-1 bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 h-24 resize-none text-sm"
                    placeholder="今天想找什么搭子？或者就想吐槽两句..."
                    maxLength={200}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs font-mono ${content.length > 180 ? 'text-fuchsia-400' : 'text-gray-600'}`}>
                    {content.length} / 200
                  </span>
                  <button
                    onClick={handlePost}
                    disabled={posting || !content.trim()}
                    className="bg-cyan-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:bg-cyan-500 disabled:opacity-40 disabled:shadow-none transition-all"
                  >
                    {posting ? '发送中...' : '发布动态'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">登录后才能发布动态</p>
                <a href="/login" className="inline-block bg-cyan-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-cyan-500 transition">
                  去登录
                </a>
              </div>
            )}
          </div>

          {msg && (
            <p className="text-sm text-center text-fuchsia-400 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-xl py-2 mb-6">
              {msg}
            </p>
          )}

          {/* 动态列表 */}
          {moments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-700 rounded-2xl">
              <p className="text-gray-500 text-sm">频道还很安静，发第一条动态破个冰。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {moments.map(m => {
                const liked = !!userProfile && m.moment_likes.some(l => l.user_id === userProfile.id)
                const isMine = !!userProfile && m.user_id === userProfile.id
                return (
                  <div
                    key={m.id}
                    className="bg-[#0A111F]/80 backdrop-blur-md border border-cyan-900/40 rounded-2xl p-5 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={m.user?.avatar_url || '/logo.png'}
                        className="w-10 h-10 rounded-full border border-fuchsia-500/40 object-cover bg-black shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white truncate">
                            {m.user?.nickname || '未知玩家'}
                          </span>
                          {m.user && (
                            <a
                              href={`/profile?id=${m.user.id}`}
                              className="text-[10px] text-fuchsia-400 font-mono hover:underline"
                            >
                              ID:{m.user.id}
                            </a>
                          )}
                          <span className="text-[11px] text-gray-600 ml-auto shrink-0">
                            {timeAgo(m.created_at)}
                          </span>
                        </div>
                        <p className="text-[15px] text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-cyan-500/10">
                      <button
                        onClick={() => toggleLike(m)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                          liked
                            ? 'bg-red-900/30 text-red-400 border-red-500/50'
                            : 'bg-transparent text-gray-500 border-gray-700 hover:bg-red-500/10 hover:text-red-400'
                        }`}
                      >
                        {liked ? '❤️' : '🤍'} {m.moment_likes.length}
                      </button>
                      {isMine && (
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-xs text-gray-600 hover:text-red-400 transition"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
