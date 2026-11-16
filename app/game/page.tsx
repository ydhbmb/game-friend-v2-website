'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FollowUserButton from '@/components/FollowUserButton'
import UserName from '@/components/UserName'

// 引入拆分出的弹窗组件
import ModalPostRecruit from '@/components/ModalPostRecruit'
import ModalPostForum from '@/components/ModalPostForum'
import ModalRecruitComments from '@/components/ModalRecruitComments'
import ModalForumDetail from '@/components/ModalForumDetail'

function GameDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = searchParams.get('id') 

  const [game, setGame] = useState<any>(null)
  const [subGames, setSubGames] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([]) 
  const [followedRecruitIds, setFollowedRecruitIds] = useState<number[]>([])
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [isFollowingGame, setIsFollowingGame] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<'recruit' | 'forum'>('recruit')

  // 弹窗控制状态
  const [isPostingRecruit, setIsPostingRecruit] = useState(false)
  const [isPostingForum, setIsPostingForum] = useState(false)
  const [activeRecruit, setActiveRecruit] = useState<any>(null)
  const [activePost, setActivePost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [postComments, setPostComments] = useState<any[]>([])
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    async function init() {
      if (!gameId) return 
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
          if (data) {
            setUserProfile(data)
            const { data: l } = await supabase.from('likes').select('recruit_id').eq('user_id', data.id)
            if (l) setLikedIds(l.map(x => x.recruit_id))
            const { data: rf } = await supabase.from('recruit_follows').select('recruit_id').eq('user_id', data.id)
            if (rf) setFollowedRecruitIds(rf.map(x => x.recruit_id))
            const { data: gf } = await supabase.from('game_follows').select('id').eq('user_id', data.id).eq('game_id', gameId).single()
            if (gf) setIsFollowingGame(true)
          }
        }

        const { data: gameData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).eq('id', gameId).single()
        setGame(gameData)

        if (gameData && !gameData.parent_id) {
          const { data: subs } = await supabase.from('games').select(`*`).eq('parent_id', gameId).order('created_at', { ascending: false })
          if (subs) setSubGames(subs)
        }
        await fetchRecruits()
        await fetchPosts()
      } catch (err) {} finally { setLoading(false) }
    }
    init()
  }, [gameId])

  async function fetchRecruits() {
    const { data } = await supabase.from('recruits').select(`*, creator:users_profile(nickname, avatar_url, id), likes(id)`).eq('game_id', gameId).order('created_at', { ascending: false }) 
    if (data) setRecruits(data)
  }

  async function fetchPosts() {
    const { data } = await supabase.from('posts').select(`*, user:users_profile(nickname, avatar_url, id)`).eq('game_id', gameId).order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function toggleFollowGame() {
    if (!userProfile) return alert('请先登录！')
    if (isFollowingGame) {
      await supabase.from('game_follows').delete().eq('user_id', userProfile.id).eq('game_id', gameId)
      setIsFollowingGame(false)
    } else {
      await supabase.from('game_follows').insert({ user_id: userProfile.id, game_id: gameId })
      setIsFollowingGame(true)
    }
  }

  async function toggleFollowRecruit(recruitId: number) {
    if (!userProfile) return alert('请先登录！')
    if (followedRecruitIds.includes(recruitId)) {
      await supabase.from('recruit_follows').delete().eq('user_id', userProfile.id).eq('recruit_id', recruitId)
      setFollowedRecruitIds(followedRecruitIds.filter(id => id !== recruitId))
    } else {
      await supabase.from('recruit_follows').insert({ user_id: userProfile.id, recruit_id: recruitId })
      setFollowedRecruitIds([...followedRecruitIds, recruitId])
    }
  }

  async function handleLike(recruitId: number, creatorId: number) {
    if (!userProfile) return alert('请先登录！')
    if (likedIds.includes(recruitId)) return alert('你已经赞过这条通缉令啦！')
    if (creatorId === userProfile.id) return alert('不能给自己点赞哦！')
    await supabase.from('likes').insert({ user_id: userProfile.id, recruit_id: recruitId })
    const { data: creatorData } = await supabase.from('users_profile').select('experience').eq('id', creatorId).single()
    if (creatorData) await supabase.from('users_profile').update({ experience: (creatorData.experience || 0) + 1 }).eq('id', creatorId)
    setLikedIds([...likedIds, recruitId])
    fetchRecruits() 
  }

  async function onRecruitSubmit(data: any) {
    const { error } = await supabase.from('recruits').insert({ game_id: gameId, creator_id: userProfile.id, ...data })
    if (!error) { setIsPostingRecruit(false); fetchRecruits() }
  }

  async function onForumSubmit(data: any) {
    const { error } = await supabase.from('posts').insert({ game_id: gameId, user_id: userProfile.id, title: data.title, content: data.content })
    if (!error) { setIsPostingForum(false); fetchPosts() }
  }

  async function openComments(recruit: any) {
    setActiveRecruit(recruit)
    setCommentLoading(true)
    const { data } = await supabase.from('comments').select(`*, user:users_profile(nickname, avatar_url)`).eq('recruit_id', recruit.id).order('created_at', { ascending: true })
    if (data) setComments(data)
    setCommentLoading(false)
  }

  async function sendComment(content: string) {
    await supabase.from('comments').insert({ recruit_id: activeRecruit.id, user_id: userProfile.id, content })
    openComments(activeRecruit)
  }

  async function openPost(post: any) {
    setActivePost(post)
    setCommentLoading(true)
    const { data } = await supabase.from('post_comments').select(`*, user:users_profile(nickname, avatar_url)`).eq('post_id', post.id).order('created_at', { ascending: true })
    if (data) setPostComments(data)
    setCommentLoading(false)
  }

  async function sendPostComment(content: string) {
    await supabase.from('post_comments').insert({ post_id: activePost.id, user_id: userProfile.id, content })
    openPost(activePost)
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">加载中...</div>
  if (!game) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-500">错误</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="relative z-10">
        <Navbar />
        
        <div className="h-64 w-full bg-[#0A111F] relative flex items-center justify-center overflow-hidden border-b border-cyan-500/30">
          {game.cover_url ? <img src={game.cover_url} className="absolute inset-0 w-full h-full object-cover opacity-30" /> : <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain"></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-black/50"></div>
          <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center mt-6">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-widest text-center break-all drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] font-orbitron">{game.name}</h1>
            <p className="text-cyan-300 bg-cyan-950/50 border border-cyan-500/50 px-4 py-1.5 rounded-full text-sm backdrop-blur-md">👑 节点创建者: <UserName userId={game.creator_id} nickname={game.creator?.nickname || '未知'} className="font-bold text-white" /></p>
          </div>
          <button onClick={() => router.push('/')} className="absolute top-6 left-6 bg-black/60 border border-cyan-500/50 text-cyan-400 px-5 py-2 rounded-lg text-sm font-bold hover:bg-cyan-500/20 transition">← 断开连接</button>
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
          {!game.parent_id && (
            <div className="bg-[#0A111F]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white font-orbitron flex items-center gap-2"><span className="text-cyan-400">📂</span> 游戏系列版本</h2>
                <button onClick={() => setIsPostingRecruit(true)} className="bg-fuchsia-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(217,70,239,0.4)] hover:bg-fuchsia-500 transition-all">+ 创建子模块</button>
              </div>
              {subGames.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {subGames.map(sub => (
                    <div key={sub.id} onClick={() => router.push(`/game?id=${sub.id}`)} className="bg-[#050B14] border border-gray-700 p-4 rounded-xl cursor-pointer hover:border-cyan-500 hover:bg-cyan-900/20 transition-all flex items-center gap-3">
                      {sub.cover_url ? <img src={sub.cover_url} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xl">🎮</div>}
                      <span className="font-bold text-white truncate">{sub.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl">暂无子模块。你可以直接在下方大厅发布主游戏招募，或者点击右上角创建特定版本子模块。</div>
              )}
            </div>
          )}

          {(!game.parent_id && subGames.length > 0) ? null : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-center mb-8 gap-4">
                <button onClick={() => setActiveTab('recruit')} className={`px-8 py-3.5 rounded-xl font-black font-orbitron tracking-widest transition-all ${activeTab === 'recruit' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-[#0A111F] text-gray-400 border border-gray-700 hover:bg-gray-800'}`}>🚨 招募大厅</button>
                <button onClick={() => setActiveTab('forum')} className={`px-8 py-3.5 rounded-xl font-black font-orbitron tracking-widest transition-all ${activeTab === 'forum' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]' : 'bg-[#0A111F] text-gray-400 border border-gray-700 hover:bg-gray-800'}`}>💬 讨论区</button>
              </div>

              {activeTab === 'recruit' && (
                <div>
                  <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <button onClick={() => setIsPostingRecruit(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:bg-blue-500 transition-all flex items-center gap-2 tracking-widest font-orbitron"><span className="text-xl">🚨</span> 发布招募通缉令</button>
                    <button onClick={toggleFollowGame} className={`px-8 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center gap-2 tracking-widest font-orbitron border ${isFollowingGame ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-transparent text-cyan-400 border-cyan-500 hover:bg-cyan-500/10'}`}>{isFollowingGame ? '✅ 已订阅游戏频道' : '🔔 订阅游戏频道'}</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {recruits.map((recruit, index) => {
                      const isFirstBlood = index === recruits.length - 1;
                      const isClosed = recruit.is_closed;
                      const likeCount = recruit.likes?.length || 0; 
                      const isRecruitFollowed = followedRecruitIds.includes(recruit.id); 

                      return (
                        <div key={recruit.id} className={`relative bg-[#0A111F]/90 backdrop-blur-md rounded-xl border border-cyan-900/50 overflow-hidden flex flex-col transition-all duration-300 ${isClosed ? 'opacity-60 grayscale-[0.5]' : 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'}`}>
                          <div className="p-6 relative z-10 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-6 border-b border-cyan-500/20 pb-3">
                              <h2 className="text-4xl font-black text-cyan-400 font-orbitron tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">WANTED</h2>
                              <span className="text-xs font-bold bg-blue-900/50 border border-blue-500/50 text-blue-300 px-2.5 py-1 rounded">悬赏招募</span>
                            </div>
                            <div className="space-y-3 font-medium text-gray-300 mb-8 text-[15px]">
                              <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">主玩内容：</span><span className="line-clamp-2 text-white">{recruit.play_content}</span></p>
                              <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">游戏平台：</span><span className="text-blue-300">{recruit.platform}</span></p>
                              <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">大区/区服：</span><span className="text-blue-300">{recruit.server_region}</span></p>
                              <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">在线时间：</span><span className="text-cyan-100">{recruit.online_time}</span></p>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-cyan-500/20">
                              <div className="flex items-center gap-3">
                                <img src={recruit.creator?.avatar_url || '/logo.png'} className="w-11 h-11 rounded border border-fuchsia-500/50 object-cover bg-black" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <UserName userId={recruit.creator?.id} nickname={recruit.creator?.nickname} className="text-[15px] font-bold text-white" />
                                    {isFirstBlood && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/50 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)]">🩸 首杀</span>}
                                    <FollowUserButton targetId={recruit.creator?.id} currentUserId={userProfile?.id} />
                                  </div>
                                  <p className="text-xs text-fuchsia-400 font-mono">ID: {recruit.creator?.id}</p>
                                </div>
                              </div>
                              <button disabled={isClosed} onClick={() => handleLike(recruit.id, recruit.creator.id)} className={`px-3 py-1.5 rounded text-xs font-bold border ${likedIds.includes(recruit.id) ? 'bg-red-900/40 text-red-400 border-red-500/50' : 'bg-transparent text-gray-400 border-gray-600 hover:bg-red-500/20'}`}>
                                {likedIds.includes(recruit.id) ? `❤️ 已赞 (${likeCount})` : `🤍 点赞 (${likeCount})`}
                              </button>
                            </div>
                          </div>
                          <div className="flex border-t border-blue-500/30 bg-[#050B14]/80 divide-x divide-blue-500/30">
                            <button onClick={() => openComments(recruit)} className="flex-1 py-3.5 text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition">💬 留言</button>
                            <button onClick={() => toggleFollowRecruit(recruit.id)} className={`flex-1 py-3.5 text-sm font-bold transition ${isRecruitFollowed ? 'text-gray-500' : 'text-yellow-400 hover:bg-yellow-500/10'}`}>
                              {isRecruitFollowed ? '✅ 已关注' : '🔔 关注'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'forum' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white font-orbitron">战术讨论区</h2>
                    <button onClick={() => setIsPostingForum(true)} className="bg-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-fuchsia-500 transition-all">+ 发布新帖</button>
                  </div>
                  <div className="space-y-4">
                    {posts.map(post => (
                      <div key={post.id} onClick={() => openPost(post)} className="bg-[#0A111F]/90 border border-gray-800 p-5 rounded-2xl hover:border-fuchsia-500/50 transition cursor-pointer flex gap-4">
                         <img src={post.user?.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-600 bg-black mt-1" />
                         <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                              <UserName userId={post.user?.id} nickname={post.user?.nickname} />
                              <FollowUserButton targetId={post.user?.id} currentUserId={userProfile?.id} />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <ModalPostRecruit 
        isOpen={isPostingRecruit} 
        onClose={() => setIsPostingRecruit(false)} 
        onSubmit={onRecruitSubmit} 
      />
      <ModalPostForum 
        isOpen={isPostingForum} 
        onClose={() => setIsPostingForum(false)} 
        onSubmit={onForumSubmit} 
      />
      <ModalRecruitComments 
        recruit={activeRecruit} 
        comments={comments} 
        loading={commentLoading} 
        onClose={() => setActiveRecruit(null)} 
        onSend={sendComment} 
      />
      <ModalForumDetail 
        post={activePost} 
        comments={postComments} 
        loading={commentLoading} 
        onClose={() => setActivePost(null)} 
        onSend={sendPostComment} 
      />
    </div>
  )
}

export default function GameDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">加载中...</div>}>
      <GameDetailContent />
    </Suspense>
  )
}