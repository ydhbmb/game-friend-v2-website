'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

function GameDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = searchParams.get('id') 

  const [game, setGame] = useState<any>(null)
  const [subGames, setSubGames] = useState<any[]>([]) // 子模块列表
  const [userProfile, setUserProfile] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([]) // 论坛帖子列表
  
  const [followedIds, setFollowedIds] = useState<number[]>([])
  const [isFollowingGame, setIsFollowingGame] = useState(false)
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  
  // 页面 Tab 切换：招募大厅 or 讨论区
  const [activeTab, setActiveTab] = useState<'recruit' | 'forum'>('recruit')

  // 招募令发布状态
  const [isPosting, setIsPosting] = useState(false)
  const [playContent, setPlayContent] = useState('')
  const [onlineTime, setOnlineTime] = useState('')
  const [personality, setPersonality] = useState('')
  const [platform, setPlatform] = useState('')
  const [serverRegion, setServerRegion] = useState('')
  const [postMsg, setPostMsg] = useState('')

  // 论坛发帖状态
  const [isPostingForum, setIsPostingForum] = useState(false)
  const [forumTitle, setForumTitle] = useState('')
  const [forumContent, setForumContent] = useState('')
  const [forumMsg, setForumMsg] = useState('')

  // 帖子详情与评论状态
  const [activePost, setActivePost] = useState<any>(null)
  const [postComments, setPostComments] = useState<any[]>([])
  const [newPostComment, setNewPostComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // 招募令评论弹窗状态（保留原有功能）
  const [activeRecruit, setActiveRecruit] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')

  const isAdmin = (uid: number) => {
    const admins = [1, 10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999]
    return admins.includes(uid)
  }

  useEffect(() => {
    async function init() {
      if (!gameId) return 
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
          if (data) {
            setUserProfile(data)
            const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', data.id)
            if (followsData) setFollowedIds(followsData.map(f => f.following_id))
            const { data: likesData } = await supabase.from('likes').select('recruit_id').eq('user_id', data.id)
            if (likesData) setLikedIds(likesData.map(l => l.recruit_id))
            const { data: gameFollowData } = await supabase.from('game_follows').select('id').eq('user_id', data.id).eq('game_id', gameId).single()
            if (gameFollowData) setIsFollowingGame(true)
          }
        }

        // 1. 获取游戏信息
        const { data: gameData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).eq('id', gameId).single()
        setGame(gameData)

        // 2. 如果当前是主游戏，获取它的子模块列表
        if (gameData && !gameData.parent_id) {
          const { data: subs } = await supabase.from('games').select(`*`).eq('parent_id', gameId).order('created_at', { ascending: false })
          if (subs) setSubGames(subs)
        } else {
          setSubGames([])
        }

        // 3. 获取招募列表和论坛帖子
        await fetchRecruits()
        await fetchPosts()
        
      } catch (err) {
        console.error("加载数据失败", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [gameId])

  async function fetchRecruits() {
    if (!gameId) return
    const { data } = await supabase
      .from('recruits')
      .select(`*, creator:users_profile(nickname, avatar_url, id)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false }) 
    if (data) setRecruits(data)
  }

  async function fetchPosts() {
    if (!gameId) return
    const { data } = await supabase
      .from('posts')
      .select(`*, user:users_profile(nickname, avatar_url, id)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  // ============ 招募大厅逻辑 ============
  async function toggleFollowGame() {
    if (!userProfile) return alert('请先登录！')
    try {
      if (isFollowingGame) {
        await supabase.from('game_follows').delete().eq('user_id', userProfile.id).eq('game_id', gameId)
        setIsFollowingGame(false)
      } else {
        await supabase.from('game_follows').insert({ user_id: userProfile.id, game_id: gameId })
        setIsFollowingGame(true)
      }
    } catch (err: any) {
      alert('操作失败：' + err.message)
    }
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
      await supabase.from('notifications').insert({ user_id: targetId, actor_id: userProfile.id, type: 'follow' })
      setFollowedIds([...followedIds, targetId])
    }
  }

  async function handleLike(recruitId: number, creatorId: number) {
    if (!userProfile) return alert('请先登录！')
    if (likedIds.includes(recruitId)) return alert('你已经赞过这条通缉令啦！')
    if (creatorId === userProfile.id) return alert('不能给自己点赞哦！')

    const today = new Date().toISOString().split('T')[0]
    let currentLikeCount = userProfile.last_like_at === today ? (userProfile.daily_like_count || 0) : 0
    if (currentLikeCount >= 5) return alert('你今天已经点赞 5 次啦，明天再来吧！')

    try {
      const { error: likeError } = await supabase.from('likes').insert({ user_id: userProfile.id, recruit_id: recruitId })
      if (likeError) throw new Error(likeError.message)

      const { data: creatorData } = await supabase.from('users_profile').select('experience').eq('id', creatorId).single()
      if (creatorData) {
        await supabase.from('users_profile').update({ experience: (creatorData.experience || 0) + 1 }).eq('id', creatorId)
      }

      await supabase.from('users_profile').update({ 
        experience: (userProfile.experience || 0) + 1, last_like_at: today, daily_like_count: currentLikeCount + 1
      }).eq('id', userProfile.id)

      setLikedIds([...likedIds, recruitId])
      setUserProfile({ ...userProfile, experience: (userProfile.experience || 0) + 1, last_like_at: today, daily_like_count: currentLikeCount + 1 })
      alert('点赞成功！双方各获得 1 经验！')
      window.location.reload(); 
    } catch (err: any) {
      alert('点赞失败：' + err.message)
    }
  }

  async function handlePostRecruit() {
    if (!playContent || !onlineTime || !platform || !serverRegion) {
      return setPostMsg('请填写完整：主玩内容、在线时间、游戏平台和区服')
    }
    if (!userProfile) return setPostMsg('请先登录！')

    const { error } = await supabase.from('recruits').insert({
      game_id: gameId, creator_id: userProfile.id, play_content: playContent, online_time: onlineTime, 
      personality: personality, platform: platform, server_region: serverRegion
    })

    if (error) {
      setPostMsg('发布失败：' + error.message)
    } else {
      const today = new Date().toISOString().split('T')[0]
      if (userProfile.last_recruit_at !== today) {
        await supabase.from('users_profile').update({ experience: (userProfile.experience || 0) + 1, last_recruit_at: today }).eq('id', userProfile.id)
      }
      setIsPosting(false); setPlayContent(''); setOnlineTime(''); setPersonality(''); setPlatform(''); setServerRegion(''); setPostMsg(''); fetchRecruits()
    }
  }

  async function handleCloseRecruit(recruitId: number, currentStatus: boolean) {
    await supabase.from('recruits').update({ is_closed: !currentStatus }).eq('id', recruitId)
    fetchRecruits()
  }

  async function handleReport(recruit: any) {
    if (!userProfile) return alert('请先登录！')
    const reason = prompt('请输入举报理由（如：诈骗、代练广告、辱骂等）：')
    if (!reason || !reason.trim()) return

    try {
      const { error } = await supabase.from('feedbacks').insert({ 
        user_id: userProfile.id, type: '举报', 
        content: `举报用户[ID:${recruit.creator.id}]的招募令: ${recruit.play_content}。理由: ${reason}` 
      })
      if (error) throw new Error(error.message)
      alert('举报已提交，巡游天官会尽快处理！')
    } catch (err: any) {
      alert('举报发送失败：' + err.message)
    }
  }

  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('⚠️ 警告：确定要删除这条悬赏通缉令吗？')) return
    await supabase.from('recruits').delete().eq('id', recruitId)
    fetchRecruits()
  }

  async function openComments(recruit: any) {
    setActiveRecruit(recruit)
    setCommentLoading(true)
    const { data } = await supabase.from('comments').select(`*, user:users_profile(nickname, avatar_url)`).eq('recruit_id', recruit.id).order('created_at', { ascending: true })
    if (data) setComments(data)
    setCommentLoading(false)
  }

  async function handleSendComment() {
    if (!newComment.trim() || !userProfile || !activeRecruit) return
    const content = newComment
    setNewComment('')
    await supabase.from('comments').insert({ recruit_id: activeRecruit.id, user_id: userProfile.id, content: content })
    openComments(activeRecruit)
  }

  // ============ 论坛讨论区逻辑 ============
  async function handlePostForum() {
    if (!forumTitle.trim() || !forumContent.trim()) return setForumMsg('请填写标题和内容')
    if (!userProfile) return setForumMsg('请先登录！')

    const { error } = await supabase.from('posts').insert({
      game_id: gameId, user_id: userProfile.id, title: forumTitle, content: forumContent
    })

    if (error) {
      setForumMsg('发布失败：' + error.message)
    } else {
      setIsPostingForum(false); setForumTitle(''); setForumContent(''); setForumMsg(''); fetchPosts()
    }
  }

  async function openPost(post: any) {
    setActivePost(post)
    setCommentLoading(true)
    const { data } = await supabase.from('post_comments').select(`*, user:users_profile(nickname, avatar_url)`).eq('post_id', post.id).order('created_at', { ascending: true })
    if (data) setPostComments(data)
    setCommentLoading(false)
  }

  async function handleSendPostComment() {
    if (!newPostComment.trim() || !userProfile || !activePost) return
    const content = newPostComment
    setNewPostComment('')
    await supabase.from('post_comments').insert({ post_id: activePost.id, user_id: userProfile.id, content: content })
    openPost(activePost)
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">扫描游戏数据中...</div>
  if (!game) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-500">错误：未找到该游戏数据</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10">
        <Navbar />
        
        {/* 游戏头部 Banner */}
        <div className="h-64 w-full bg-[#0A111F] relative flex items-center justify-center overflow-hidden border-b border-cyan-500/30">
          {game.cover_url ? <img src={game.cover_url} className="absolute inset-0 w-full h-full object-cover opacity-30" /> : <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain"></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-transparent to-black/50"></div>

          <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center mt-6">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-widest text-center break-all drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] font-orbitron">{game.name}</h1>
            <p className="text-cyan-300 bg-cyan-950/50 border border-cyan-500/50 px-4 py-1.5 rounded-full text-sm backdrop-blur-md">👑 节点创建者: {game.creator?.nickname || '未知'}</p>
          </div>
          <button onClick={() => router.push('/')} className="absolute top-6 left-6 bg-black/60 border border-cyan-500/50 text-cyan-400 px-5 py-2 rounded-lg text-sm font-bold hover:bg-cyan-500/20 transition">← 断开连接</button>
        </div>

        <main className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
          
          {/* 如果是主游戏，且有子模块，显示子模块列表 */}
          {subGames.length > 0 ? (
            <div className="bg-[#0A111F]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-8">
              <h2 className="text-2xl font-black text-white font-orbitron mb-4 flex items-center gap-2">
                <span className="text-cyan-400">📂</span> 选择游戏子模块
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {subGames.map(sub => (
                  <div key={sub.id} onClick={() => router.push(`/game?id=${sub.id}`)} className="bg-[#050B14] border border-gray-700 p-4 rounded-xl cursor-pointer hover:border-cyan-500 hover:bg-cyan-900/20 transition-all flex items-center gap-3">
                    {sub.cover_url ? <img src={sub.cover_url} className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xl">🎮</div>}
                    <span className="font-bold text-white truncate">{sub.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Tab 切换栏 */}
              <div className="flex justify-center mb-8 gap-4">
                <button onClick={() => setActiveTab('recruit')} className={`px-8 py-3.5 rounded-xl font-black font-orbitron tracking-widest transition-all ${activeTab === 'recruit' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-[#0A111F] text-gray-400 border border-gray-700 hover:bg-gray-800'}`}>
                  🚨 招募大厅
                </button>
                <button onClick={() => setActiveTab('forum')} className={`px-8 py-3.5 rounded-xl font-black font-orbitron tracking-widest transition-all ${activeTab === 'forum' ? 'bg-fuchsia-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]' : 'bg-[#0A111F] text-gray-400 border border-gray-700 hover:bg-gray-800'}`}>
                  💬 讨论区
                </button>
              </div>

              {/* ================= 招募大厅视图 ================= */}
              {activeTab === 'recruit' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <button onClick={() => setIsPosting(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:bg-blue-500 hover:scale-105 transition-all flex items-center gap-2 tracking-widest font-orbitron">
                      <span className="text-xl">🚨</span> 发布招募通缉令
                    </button>
                    <button onClick={toggleFollowGame} className={`px-8 py-3.5 rounded-xl font-black shadow-lg transition-all flex items-center gap-2 tracking-widest font-orbitron border ${isFollowingGame ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-transparent text-cyan-400 border-cyan-500 hover:bg-cyan-500/10'}`}>
                      {isFollowingGame ? '✅ 已订阅本频道' : '🔔 订阅频道更新'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {recruits.map((recruit, index) => {
                      const isFirstBlood = index === recruits.length - 1;
                      const isClosed = recruit.is_closed;
                      return (
                        <div key={recruit.id} className={`relative bg-[#0A111F]/90 backdrop-blur-md rounded-xl border border-cyan-900/50 overflow-hidden flex flex-col group transition-all duration-300 ${isClosed ? 'opacity-60 grayscale-[0.5]' : 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'}`}>
                          {isClosed && <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"><div className="border-4 border-red-500 text-red-500 text-4xl font-black font-orbitron px-6 py-2 rounded-lg transform -rotate-12 opacity-80 bg-black/40 backdrop-blur-sm">已满 / 结案</div></div>}
                          <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">{recruit.creator?.avatar_url ? <img src={recruit.creator.avatar_url} className="w-56 h-56 object-cover grayscale rounded-full" /> : <span className="text-9xl font-black text-white">!</span>}</div>
                          <div className="p-6 relative z-10 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-6 border-b border-cyan-500/20 pb-3">
                              <h2 className="text-4xl font-black text-cyan-400 font-orbitron tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">WANTED</h2>
                              <div className="flex gap-2 items-center">
                                <span className="text-xs font-bold bg-blue-900/50 border border-blue-500/50 text-blue-300 px-2.5 py-1 rounded">悬赏招募</span>
                                {userProfile && isAdmin(userProfile.id) && <button onClick={() => handleDeleteRecruit(recruit.id)} className="text-xs text-red-400 bg-red-900/20 hover:bg-red-900/50 border border-red-500/30 px-2 py-1 rounded transition">🗑️ 删除</button>}
                              </div>
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
                                    <p className="text-[15px] font-bold text-white">{recruit.creator?.nickname}</p>
                                    {isFirstBlood && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/50 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)]">🩸 首杀</span>}
                                  </div>
                                  <p className="text-xs text-fuchsia-400 font-mono">ID: {recruit.creator?.id}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button disabled={isClosed} onClick={() => handleLike(recruit.id, recruit.creator.id)} className={`px-3 py-1.5 rounded text-xs font-bold border ${likedIds.includes(recruit.id) ? 'bg-red-900/40 text-red-400 border-red-500/50' : 'bg-transparent text-gray-400 border-gray-600 hover:bg-red-500/20 hover:text-red-400'}`}>{likedIds.includes(recruit.id) ? '❤️ 已赞' : '🤍 点赞'}</button>
                                {userProfile && userProfile.id !== recruit.creator?.id && <button disabled={isClosed} onClick={() => handleFollow(recruit.creator.id)} className={`px-3 py-1.5 rounded text-xs font-bold border ${followedIds.includes(recruit.creator.id) ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-blue-400 border-blue-500/50 hover:bg-blue-500/20'}`}>{followedIds.includes(recruit.creator.id) ? '已关注' : '+ 关注'}</button>}
                              </div>
                            </div>
                          </div>
                          <div className="flex border-t border-blue-500/30 bg-[#050B14]/80 divide-x divide-blue-500/30">
                            <button onClick={() => openComments(recruit)} className="flex-1 py-3.5 text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition">💬 留言</button>
                            {userProfile && userProfile.id === recruit.creator?.id && <button onClick={() => handleCloseRecruit(recruit.id, isClosed)} className={`flex-1 py-3.5 text-sm font-bold transition ${isClosed ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:bg-gray-500/10'}`}>{isClosed ? '🔓 重开' : '✅ 结案'}</button>}
                            <button onClick={() => handleReport(recruit)} className="flex-1 py-3.5 text-red-400 text-sm font-bold hover:bg-red-500/10 transition">🚩 举报</button>
                            {!isClosed && <button onClick={() => router.push(`/messages?target=${recruit.creator.id}`)} className="flex-1 py-3.5 text-blue-400 text-sm font-bold hover:bg-blue-500/10 transition">✉️ 私信</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ================= 论坛讨论区视图 ================= */}
              {activeTab === 'forum' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* 🔥 合规警告横幅 */}
                  <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex gap-3 text-sm">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-bold text-red-400 mb-1">【僚机雷达网络通信管理条例】</p>
                      <p className="text-gray-300">严禁发布涉政、涉黄、涉赌、涉暴恐等违法违规内容。禁止发布诈骗、代练外挂等黑产广告。违者将被直接永久封禁并移交公安机关！请文明交流，共建良好战术社区。</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-white font-orbitron">战术讨论区</h2>
                    <button onClick={() => setIsPostingForum(true)} className="bg-fuchsia-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all">+ 发布新帖</button>
                  </div>

                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <div className="text-center py-20 bg-[#0A111F]/50 border border-gray-800 rounded-2xl text-gray-500">暂无讨论，快来发布第一张帖子吧！</div>
                    ) : (
                      posts.map(post => (
                        <div key={post.id} onClick={() => openPost(post)} className="bg-[#0A111F]/90 backdrop-blur-md border border-gray-800 p-5 rounded-2xl hover:border-fuchsia-500/50 transition cursor-pointer flex gap-4">
                           <img src={post.user?.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-600 bg-black mt-1" />
                           <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-white mb-2 hover:text-fuchsia-400 transition-colors">{post.title}</h3>
                              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{post.content}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                                <span>{post.user?.nickname}</span>
                                <span>{new Date(post.created_at).toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ================= 招募令发帖弹窗 ================= */}
      {isPosting && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h3 className="text-xl md:text-2xl font-black mb-6 text-white text-center tracking-widest font-orbitron">发布赛博通缉令</h3>
            <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="主玩内容 (如：大乱斗)" value={playContent} onChange={(e) => setPlayContent(e.target.value)} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="游戏平台 (如：PC)" value={platform} onChange={(e) => setPlatform(e.target.value)} />
              <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="大区/区服 (如：亚服)" value={serverRegion} onChange={(e) => setServerRegion(e.target.value)} />
            </div>
            <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="在线时间 (如：每晚 8点)" value={onlineTime} onChange={(e) => setOnlineTime(e.target.value)} />
            <textarea className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 h-24 resize-none" placeholder="战术要求 (选填)" value={personality} onChange={(e) => setPersonality(e.target.value)} />
            {postMsg && <p className="text-red-500 text-sm mb-4 text-center">{postMsg}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsPosting(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold">取消</button>
              <button onClick={handlePostRecruit} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)]">确认发布</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 论坛发帖弹窗 ================= */}
      {isPostingForum && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-fuchsia-500/50 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-[0_0_30px_rgba(217,70,239,0.2)]">
            <h3 className="text-xl md:text-2xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 text-center tracking-widest font-orbitron">发布讨论帖</h3>
            <input className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white outline-none focus:border-fuchsia-500 font-bold" placeholder="帖子标题（如：求个双排上分攻略）" value={forumTitle} onChange={(e) => setForumTitle(e.target.value)} />
            <textarea className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 mb-2 text-white outline-none focus:border-fuchsia-500 h-40 resize-none" placeholder="详细内容..." value={forumContent} onChange={(e) => setForumContent(e.target.value)} />
            <p className="text-[10px] text-gray-500 mb-4">* 发布即代表您同意《网络通信管理条例》，严禁发布违法违规内容。</p>
            {forumMsg && <p className="text-red-500 text-sm mb-4 text-center">{forumMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setIsPostingForum(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold">取消</button>
              <button onClick={handlePostForum} className="flex-1 bg-fuchsia-600 text-white py-3 rounded-lg font-bold hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]">确认发布</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 招募令评论弹窗 ================= */}
      {activeRecruit && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-[80vh] max-h-[600px] overflow-hidden">
            <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-[#0A111F]">
              <h3 className="font-bold text-cyan-400 tracking-wider font-orbitron">招募留言</h3>
              <button onClick={() => setActiveRecruit(null)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050B14]/50">
              {commentLoading ? <p className="text-center text-cyan-500 text-sm mt-4 animate-pulse">解析数据中...</p> : comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.user?.avatar_url || '/logo.png'} className="w-8 h-8 rounded border border-gray-600 object-cover bg-black mt-1" />
                    <div>
                      <p className="text-xs text-cyan-500 mb-1">{c.user?.nickname}</p>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm px-4 py-2 text-sm text-gray-200 shadow-sm">{c.content}</div>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="p-4 border-t border-cyan-500/30 bg-[#0A111F] flex gap-2">
              <input className="flex-1 bg-[#050B14] border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm text-white focus:border-cyan-500" placeholder="输入通讯内容..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} />
              <button onClick={handleSendComment} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]">发送</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 论坛帖子详情弹窗 ================= */}
      {activePost && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-fuchsia-500/50 rounded-2xl w-full max-w-2xl shadow-[0_0_30px_rgba(217,70,239,0.2)] flex flex-col h-[85vh] max-h-[700px] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
              <h3 className="font-bold text-white text-lg truncate pr-4">{activePost.title}</h3>
              <button onClick={() => setActivePost(null)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 帖子正文 */}
              <div className="flex gap-4">
                <img src={activePost.user?.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border border-gray-600 bg-black" />
                <div>
                  <p className="text-sm font-bold text-fuchsia-400 mb-1">{activePost.user?.nickname}</p>
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{activePost.content}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-800 pt-6">
                <h4 className="text-sm text-gray-400 mb-4">全部回复 ({postComments.length})</h4>
                <div className="space-y-4">
                  {commentLoading ? <p className="text-center text-gray-500 text-sm">加载中...</p> : postComments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <img src={c.user?.avatar_url || '/logo.png'} className="w-8 h-8 rounded border border-gray-600 object-cover bg-black mt-1" />
                      <div>
                        <p className="text-xs text-fuchsia-400 mb-1">{c.user?.nickname}</p>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm px-4 py-2 text-sm text-gray-200 shadow-sm">{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-black/40 flex gap-2">
              <input className="flex-1 bg-[#050B14] border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm text-white focus:border-fuchsia-500" placeholder="回复帖子..." value={newPostComment} onChange={(e) => setNewPostComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendPostComment()} />
              <button onClick={handleSendPostComment} className="bg-fuchsia-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.4)]">发送</button>
            </div>
          </div>
        </div>
      )}

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