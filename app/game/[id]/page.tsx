'use client'
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

function GameDetailContent() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string

  const [game, setGame] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  const [isPosting, setIsPosting] = useState(false)
  const [playContent, setPlayContent] = useState('')
  const [onlineTime, setOnlineTime] = useState('')
  const [personality, setPersonality] = useState('')
  const [postMsg, setPostMsg] = useState('')

  const [activeRecruit, setActiveRecruit] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
        if (data) {
          setUserProfile(data)
          const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', data.id)
          if (followsData) setFollowedIds(followsData.map(f => f.following_id))
        }
      }

      const { data: gameData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).eq('id', gameId).single()
      setGame(gameData)
      fetchRecruits()
      setLoading(false)
    }
    if (gameId) init()
  }, [gameId])

  async function fetchRecruits() {
    const { data } = await supabase
      .from('recruits')
      .select(`*, creator:users_profile(nickname, avatar_url, id)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
    if (data) setRecruits(data)
  }

  async function handleFollow(targetId: number) {
    if (!userProfile) return alert('请先登录！')
    if (targetId === userProfile.id) return

    const isFollowed = followedIds.includes(targetId)
    if (isFollowed) {
      await supabase.from('follows').delete().eq('follower_id', userProfile.id).eq('following_id', targetId)
      setFollowedIds(followedIds.filter(id => id !== targetId))
    } else {
      await supabase.from('follows').insert({ follower_id: userProfile.id, following_id: targetId })
      await supabase.from('notifications').insert({
        user_id: targetId,
        actor_id: userProfile.id,
        type: 'follow'
      })
      setFollowedIds([...followedIds, targetId])
    }
  }

  async function handlePostRecruit() {
    if (!playContent || !onlineTime) return setPostMsg('主玩内容和上线时间是必填项')
    if (!userProfile) return setPostMsg('请先登录！')

    const { error } = await supabase.from('recruits').insert({
      game_id: gameId,
      creator_id: userProfile.id,
      play_content: playContent,
      online_time: onlineTime,
      personality: personality
    })

    if (error) {
      setPostMsg('发布失败：' + error.message)
    } else {
      setIsPosting(false)
      setPlayContent('')
      setOnlineTime('')
      setPersonality('')
      setPostMsg('')
      fetchRecruits()
    }
  }

  async function openComments(recruit: any) {
    setActiveRecruit(recruit)
    fetchComments(recruit.id)
  }

  async function fetchComments(recruitId: number) {
    setCommentLoading(true)
    const { data } = await supabase
      .from('comments')
      .select(`*, user:users_profile(nickname, avatar_url)`)
      .eq('recruit_id', recruitId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
    setCommentLoading(false)
  }

  async function handleSendComment() {
    if (!newComment.trim() || !userProfile || !activeRecruit) return
    const content = newComment
    setNewComment('')

    const { error } = await supabase.from('comments').insert({
      recruit_id: activeRecruit.id,
      user_id: userProfile.id,
      content: content
    })

    if (!error) {
      if (activeRecruit.creator.id !== userProfile.id) {
        await supabase.from('notifications').insert({
          user_id: activeRecruit.creator.id,
          actor_id: userProfile.id,
          type: 'comment',
          content: content,
          related_id: parseInt(gameId)
        })
      }
      fetchComments(activeRecruit.id)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-cyan-500 animate-pulse">数据接入中...</div>
  if (!game) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-red-500">错误：未找到该游戏数据</div>

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-200 relative overflow-hidden pb-20">
      {/* 赛博背景特效 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]"></div>
      
      <div className="relative z-10">
        <Navbar />

        {/* 游戏头部背景 */}
        <div className="h-64 w-full bg-black relative flex items-center justify-center overflow-hidden border-b border-cyan-500/30">
          {game.cover_url ? (
            <img src={game.cover_url} className="absolute inset-0 w-full h-full object-cover opacity-30" />
          ) : (
            <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-black/50"></div>

          <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center mt-6">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2 tracking-widest text-center break-all drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
              {game.name}
            </h1>
            <p className="text-cyan-300 bg-cyan-950/50 border border-cyan-500/50 px-4 py-1.5 rounded-full text-sm backdrop-blur-md">
              👑 节点创建者: {game.creator?.nickname || '未知'}
            </p>
          </div>

          <button 
            onClick={() => router.push('/')}
            className="absolute top-6 left-6 bg-black/60 border border-cyan-500/50 text-cyan-400 px-5 py-2 rounded-lg text-sm font-bold hover:bg-cyan-500/20 transition shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            ← 断开连接
          </button>
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
          <div className="flex justify-center mb-8">
            <button 
              onClick={() => setIsPosting(true)}
              className="bg-fuchsia-600 text-white px-8 py-3.5 rounded-xl font-black shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:bg-fuchsia-500 hover:scale-105 transition-all flex items-center gap-2 tracking-widest"
            >
              <span className="text-xl">🚨</span> 发布招募通缉令
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {recruits.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-black/40 border border-cyan-500/30 rounded-2xl text-cyan-500/50">
                暂无数据流，快来发布第一张赛博通缉令吧！
              </div>
            ) : (
              recruits.map((recruit) => (
                <div key={recruit.id} className="relative bg-black/60 backdrop-blur-md rounded-xl border border-fuchsia-500/30 overflow-hidden flex flex-col group hover:border-fuchsia-400 hover:shadow-[0_0_20px_rgba(217,70,239,0.2)] transition-all duration-300">
                  
                  {/* 背景水印 */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                    {recruit.creator?.avatar_url ? (
                      <img src={recruit.creator.avatar_url} className="w-56 h-56 object-cover grayscale rounded-full" />
                    ) : (
                      <span className="text-9xl font-black text-white">!</span>
                    )}
                  </div>

                  <div className="p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b border-cyan-500/20 pb-3">
                      <h2 className="text-4xl font-black text-cyan-400 font-mono tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">WANTED</h2>
                      <span className="text-xs font-bold bg-fuchsia-900/50 border border-fuchsia-500/50 text-fuchsia-300 px-2.5 py-1 rounded">悬赏招募</span>
                    </div>

                    <div className="space-y-3 font-medium text-gray-300 mb-8 text-[15px]">
                      <p className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold shrink-0">主玩内容：</span>
                        <span className="line-clamp-2 text-white">{recruit.play_content}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-cyan-500 font-bold shrink-0">在线时间：</span>
                        <span className="text-cyan-100">{recruit.online_time}</span>
                      </p>
                      {recruit.personality && (
                        <p className="flex items-start gap-2">
                          <span className="text-cyan-500 font-bold shrink-0">战术要求：</span>
                          <span className="line-clamp-3 text-gray-400">{recruit.personality}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-cyan-500/20">
                      <div className="flex items-center gap-3">
                        <img src={recruit.creator?.avatar_url || '/logo.png'} className="w-11 h-11 rounded border border-fuchsia-500/50 object-cover bg-black" />
                        <div>
                          <p className="text-[15px] font-bold text-white">{recruit.creator?.nickname}</p>
                          <p className="text-xs text-fuchsia-400 font-mono">ID: {recruit.creator?.id}</p>
                        </div>
                      </div>

                      {userProfile && userProfile.id !== recruit.creator?.id && (
                        <button 
                          onClick={() => handleFollow(recruit.creator.id)}
                          className={`px-4 py-1.5 rounded text-xs font-bold transition-all border ${
                            followedIds.includes(recruit.creator.id)
                              ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50' 
                              : 'bg-transparent text-fuchsia-400 border-fuchsia-500/50 hover:bg-fuchsia-500/20'
                          }`}
                        >
                          {followedIds.includes(recruit.creator.id) ? '已建立连接' : '+ 建立连接'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex border-t border-fuchsia-500/30 bg-black/80 divide-x divide-fuchsia-500/30">
                    <button onClick={() => openComments(recruit)} className="flex-1 py-3.5 text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition">💬 查看留言</button>
                    <button onClick={() => router.push(`/messages?target=${recruit.creator.id}`)} className="flex-1 py-3.5 text-fuchsia-400 text-sm font-bold hover:bg-fuchsia-500/10 transition">✉️ 发送私信</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* 发布招募弹窗 */}
      {isPosting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-cyan-500/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h3 className="text-xl md:text-2xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-center tracking-widest">
              发布赛博通缉令
            </h3>
            
            <label className="block text-xs font-bold text-cyan-500 mb-1">主玩内容 *</label>
            <input className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="如：大乱斗 / 排位上分" value={playContent} onChange={(e) => setPlayContent(e.target.value)} />
            
            <label className="block text-xs font-bold text-cyan-500 mb-1">在线时间 *</label>
            <input className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 transition-colors" placeholder="如：每晚 20:00 - 23:00" value={onlineTime} onChange={(e) => setOnlineTime(e.target.value)} />
            
            <label className="block text-xs font-bold text-cyan-500 mb-1">战术要求 (选填)</label>
            <textarea className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 transition-colors h-24 resize-none" placeholder="如：脾气好，不压力队友..." value={personality} onChange={(e) => setPersonality(e.target.value)} />
            
            {postMsg && <p className="text-red-500 text-sm mb-4 text-center">{postMsg}</p>}
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsPosting(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700 transition">取消</button>
              <button onClick={handlePostRecruit} className="flex-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-fuchsia-500 hover:to-purple-500 shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all">确认发布</button>
            </div>
          </div>
        </div>
      )}

      {/* 评论弹窗 */}
      {activeRecruit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-cyan-500/50 rounded-2xl w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-[80vh] max-h-[600px] overflow-hidden">
            <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-black/50">
              <h3 className="font-bold text-cyan-400 tracking-wider">通讯留言</h3>
              <button onClick={() => setActiveRecruit(null)} className="text-gray-400 hover:text-red-500 text-2xl leading-none transition-colors">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
              {commentLoading ? (
                <p className="text-center text-cyan-500 text-sm mt-4 animate-pulse">解析数据中...</p>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 text-sm mt-10">暂无留言记录</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.user?.avatar_url || '/logo.png'} className="w-8 h-8 rounded border border-gray-600 object-cover bg-black mt-1" />
                    <div>
                      <p className="text-xs text-cyan-500 mb-1">{c.user?.nickname}</p>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm px-4 py-2 text-sm text-gray-200 shadow-sm">
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-cyan-500/30 bg-black flex gap-2">
              <input 
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm text-white focus:border-cyan-500 transition-colors"
                placeholder="输入通讯内容..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
              />
              <button onClick={handleSendComment} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all">发送</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GameDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090b] flex items-center justify-center text-cyan-500 animate-pulse">加载中...</div>}>
      <GameDetailContent />
    </Suspense>
  )
}