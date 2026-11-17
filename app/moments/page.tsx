'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import SectionTitle from '@/components/ui/SectionTitle'

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
      .select(
        `id, content, created_at, user_id,
         user:users_profile(id, nickname, avatar_url),
         moment_likes(user_id)`
      )
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
    if (!userProfile) return alert('请先登录')
    const liked = moment.moment_likes.some((l) => l.user_id === userProfile.id)

    setMoments((prev) =>
      prev.map((m) =>
        m.id === moment.id
          ? {
              ...m,
              moment_likes: liked
                ? m.moment_likes.filter((l) => l.user_id !== userProfile.id)
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
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] pb-20">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

        <div className="mb-4">
          <h1 className="text-xl font-semibold text-white">动态广场</h1>
          <p className="text-[11.5px] text-[#5C6B7F] mt-1">
            说说你现在在打什么
          </p>
        </div>

        <Card className="mb-4">
          {userProfile ? (
            <>
              <div className="flex gap-3">
                <img
                  src={userProfile.avatar_url || '/logo.png'}
                  alt={userProfile.nickname}
                  className="w-9 h-9 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={200}
                  placeholder="今天想找什么搭子？或者就想吐槽两句…"
                  className="flex-1 min-h-[80px] rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <span
                  className={`text-[10.5px] tabular-nums ${
                    content.length > 180 ? 'text-amber-400' : 'text-[#4A5768]'
                  }`}
                >
                  {content.length} / 200
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePost}
                  loading={posting}
                  disabled={!content.trim()}
                >
                  发布
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-[12px] text-[#5C6B7F] mb-3">登录后才能发布动态</p>
              <a
                href="/login"
                className="inline-flex items-center h-8 px-4 rounded-lg bg-cyan-600 text-white text-[12px] font-medium hover:bg-cyan-500 transition-colors"
              >
                去登录
              </a>
            </div>
          )}
        </Card>

        {msg && (
          <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            {msg}
          </p>
        )}

        <SectionTitle count={`${moments.length} 条`}>全部动态</SectionTitle>

        {moments.length === 0 ? (
          <EmptyState
            title="频道还很安静"
            description="发第一条动态，让搭子认识你"
          />
        ) : (
          <div className="space-y-2.5">
            {moments.map((m) => {
              const liked =
                !!userProfile && m.moment_likes.some((l) => l.user_id === userProfile.id)
              const isMine = !!userProfile && m.user_id === userProfile.id

              return (
                <Card key={m.id} padded={false}>
                  <div className="p-4">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={m.user?.avatar_url || '/logo.png'}
                        alt={m.user?.nickname}
                        className="w-8 h-8 rounded-full object-cover bg-black border border-white/[0.08] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12.5px] text-[#E8EFF7] truncate">
                            {m.user?.nickname || '未知玩家'}
                          </span>
                          {m.user && (
                            <a
                              href={`/profile?id=${m.user.id}`}
                              className="text-[10px] text-[#4A5768] font-mono hover:text-cyan-400 transition-colors shrink-0"
                            >
                              ID:{m.user.id}
                            </a>
                          )}
                          <span className="text-[10.5px] text-[#4A5768] ml-auto shrink-0">
                            {timeAgo(m.created_at)}
                          </span>
                        </div>
                        <p className="text-[13.5px] text-[#E8EFF7] whitespace-pre-wrap break-words leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                      <button
                        onClick={() => toggleLike(m)}
                        className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors ${
                          liked
                            ? 'bg-red-500/12 text-red-400 border-red-500/25'
                            : 'bg-transparent text-[#5C6B7F] border-white/[0.08] hover:text-red-400 hover:border-red-500/25'
                        }`}
                      >
                        {liked ? '已赞' : '点赞'} {m.moment_likes.length}
                      </button>

                      {isMine && (
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-[11px] text-[#4A5768] hover:text-red-400 transition-colors"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
