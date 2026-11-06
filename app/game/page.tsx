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
  const [userProfile, setUserProfile] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<number[]>([])
  const [isFollowingGame, setIsFollowingGame] = useState(false)
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  const [isPosting, setIsPosting] = useState(false)
  const [playContent, setPlayContent] = useState('')
  const [onlineTime, setOnlineTime] = useState('')
  const [personality, setPersonality] = useState('')
  const [platform, setPlatform] = useState('')
  const [serverRegion, setServerRegion] = useState('')
  const [postMsg, setPostMsg] = useState('')

  const [activeRecruit, setActiveRecruit] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

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

        const { data: gameData } = await supabase.from('games').select(`*, creator:users_profile(nickname)`).eq('id', gameId).single()
        setGame(gameData)
        fetchRecruits()
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
        const { data: updatedCreator, error: creatorErr } = await supabase.from('users_profile')
          .update({ experience: (creatorData.experience || 0) + 1 })
          .eq('id', creatorId)
          .select() 
        if (creatorErr || !updatedCreator || updatedCreator.length === 0) throw new Error('给创作者加经验被数据库拦截')
      }

      const { data: updatedMe, error: updateMeErr } = await supabase.from('users_profile')
        .update({ 
          experience: (userProfile.experience || 0) + 1,
          last_like_at: today,
          daily_like_count: currentLikeCount + 1
        })
        .eq('id', userProfile.id)
        .select() 

      if (updateMeErr || !updatedMe || updatedMe.length === 0) throw new Error('给你加经验被数据库拦截')

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
      game_id: gameId, 
      creator_id: userProfile.id, 
      play_content: playContent, 
      online_time: onlineTime, 
      personality: personality,
      platform: platform,
      server_region: serverRegion
    })

    if (error) {
      setPostMsg('发布失败：' + error.message)
    } else {
      const today = new Date().toISOString().split('T')[0]
      if (userProfile.last_recruit_at !== today) {
        await supabase.from('users_profile').update({ experience: (userProfile.experience || 0) + 1, last_recruit_at: today }).eq('id', userProfile.id)
      }

      const { data: followers } = await supabase.from('game_follows').select('user_id').eq('game_id', gameId).neq('user_id', userProfile.id)
      if (followers && followers.length > 0) {
        const notifications = followers.map(f => ({
          user_id: f.user_id,
          actor_id: userProfile.id,
          type: 'new_recruit',
          content: `在 [${game?.name}] 发布了新招募：${playContent}`,
          related_id: parseInt(gameId as string)
        }))
        await supabase.from('notifications').insert(notifications)
      }

      setIsPosting(false); setPlayContent(''); setOnlineTime(''); setPersonality(''); setPlatform(''); setServerRegion(''); setPostMsg(''); fetchRecruits()
    }
  }

  async function handleDeleteRecruit(recruitId: number) {
    if (!confirm('⚠️ 警告：确定要删除这条悬赏通缉令吗？')) return
    await supabase.from('recruits').delete().eq('id', recruitId)
    fetchRecruits()
  }

  // 🔥 新增：结案功能
  async function handleCloseRecruit(recruitId: number, currentStatus: boolean) {
    await supabase.from('recruits').update({ is_closed: !currentStatus }).eq('id', recruitId)
    fetchRecruits()
  }

  async function openComments(recruit: any) {
    setActiveRecruit(recruit)
    fetchComments(recruit.id)
  }

  async function fetchComments(recruitId: number) {
    setCommentLoading(true)
    const { data } = await supabase.from('comments').select(`*, user:users_profile(nickname, avatar_url)`).eq('recruit_id', recruitId).order('created_at', { ascending: true })
    if (data) setComments(data)
    setCommentLoading(false)
  }

  async function handleSendComment() {
    if (!newComment.trim() || !userProfile || !activeRecruit) return
    const content = newComment
    setNewComment('')

    const { error } = await supabase.from('comments').insert({
      recruit_id: activeRecruit.id, user_id: userProfile.id, content: content
    })

    if (!error) {
      if (activeRecruit.creator.id !== userProfile.id) {
        await supabase.from('notifications').insert({
          user_id: activeRecruit.creator.id, actor_id: userProfile.id, type: 'comment', content: content, related_id: parseInt(gameId as string)
        })
        const { data: creatorData } = await supabase.from('users_profile').select('experience').eq('id', activeRecruit.creator.id).single()
        if (creatorData) {
          await supabase.from('users_profile').update({ experience: (creatorData.experience || 0) + 1 }).eq('id', activeRecruit.creator.id)
        }
      }

      const today = new Date().toISOString().split('T')[0]
      let currentCommentCount = userProfile.last_comment_at === today ? (userProfile.daily_comment_count || 0) : 0
      
      if (currentCommentCount < 5) {
        await supabase.from('users_profile').update({ 
          experience: (userProfile.experience || 0) + 1,
          last_comment_at: today,
          daily_comment_count: currentCommentCount + 1
        }).eq('id', userProfile.id)
        
        setUserProfile({
          ...userProfile,
          experience: (userProfile.experience || 0) + 1,
          last_comment_at: today,
          daily_comment_count: currentCommentCount + 1
        })
      }
      fetchComments(activeRecruit.id)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">数据接入中...</div>
  if (!game) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-500">错误：未找到该游戏数据</div>

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="relative z-10">
        <Navbar />
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
              const isClosed = recruit.is_closed; // 🔥 判断是否已结案

              return (
                <div key={recruit.id} className={`relative bg-[#0A111F]/90 backdrop-blur-md rounded-xl border border-cyan-900/50 overflow-hidden flex flex-col group transition-all duration-300 ${isClosed ? 'opacity-60 grayscale-[0.5]' : 'hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]'}`}>
                  
                  {/* 已结案印章 */}
                  {isClosed && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                      <div className="border-4 border-red-500 text-red-500 text-4xl font-black font-orbitron px-6 py-2 rounded-lg transform -rotate-12 opacity-80 bg-black/40 backdrop-blur-sm">
                        已满 / 结案
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
                    {recruit.creator?.avatar_url ? <img src={recruit.creator.avatar_url} className="w-56 h-56 object-cover grayscale rounded-full" /> : <span className="text-9xl font-black text-white">!</span>}
                  </div>
                  <div className="p-6 relative z-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b border-cyan-500/20 pb-3">
                      <h2 className="text-4xl font-black text-cyan-400 font-orbitron tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">WANTED</h2>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold bg-blue-900/50 border border-blue-500/50 text-blue-300 px-2.5 py-1 rounded">悬赏招募</span>
                        {userProfile && isAdmin(userProfile.id) && (
                           <button onClick={() => handleDeleteRecruit(recruit.id)} className="text-xs text-red-400 bg-red-900/20 hover:bg-red-900/50 border border-red-500/30 px-2 py-1 rounded transition">🗑️ 删除</button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3 font-medium text-gray-300 mb-8 text-[15px]">
                      <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">主玩内容：</span><span className="line-clamp-2 text-white">{recruit.play_content}</span></p>
                      <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">游戏平台：</span><span className="text-blue-300">{recruit.platform}</span></p>
                      <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">大区/区服：</span><span className="text-blue-300">{recruit.server_region}</span></p>
                      <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">在线时间：</span><span className="text-cyan-100">{recruit.online_time}</span></p>
                      {recruit.personality && <p className="flex items-start gap-2"><span className="text-cyan-500 font-bold shrink-0">战术要求：</span><span className="line-clamp-3 text-gray-400">{recruit.personality}</span></p>}
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
                        <button disabled={isClosed} onClick={() => handleLike(recruit.id, recruit.creator.id)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center gap-1 ${likedIds.includes(recruit.id) ? 'bg-red-900/40 text-red-400 border-red-500/50' : 'bg-transparent text-gray-400 border-gray-600 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50'} ${isClosed && 'opacity-50 cursor-not-allowed'}`}>
                          {likedIds.includes(recruit.id) ? '❤️ 已赞' : '🤍 点赞'}
                        </button>
                        {userProfile && userProfile.id !== recruit.creator?.id && (
                          <button disabled={isClosed} onClick={() => handleFollow(recruit.creator.id)} className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${followedIds.includes(recruit.creator.id) ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50' : 'bg-transparent text-blue-400 border-blue-500/50 hover:bg-blue-500/20'} ${isClosed && 'opacity-50 cursor-not-allowed'}`}>
                            {followedIds.includes(recruit.creator.id) ? '已关注' : '+ 关注'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 底部操作区 */}
                  <div className="flex border-t border-blue-500/30 bg-[#050B14]/80 divide-x divide-blue-500/30">
                    <button onClick={() => openComments(recruit)} className="flex-1 py-3.5 text-cyan-400 text-sm font-bold hover:bg-cyan-500/10 transition">💬 查看留言</button>
                    
                    {/* 结案按钮（仅限发帖人可见） */}
                    {userProfile && userProfile.id === recruit.creator?.id && (
                      <button onClick={() => handleCloseRecruit(recruit.id, isClosed)} className={`flex-1 py-3.5 text-sm font-bold transition ${isClosed ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-gray-400 hover:bg-gray-500/10'}`}>
                        {isClosed ? '🔓 重新开启' : '✅ 结案'}
                      </button>
                    )}
                    
                    {/* 举报按钮 */}
                    <button 
                      onClick={async () => {
                        if (!userProfile) return alert('请先登录！')
                        const reason = prompt('请输入举报理由（如：诈骗、代练广告、辱骂等）：')
                        if (!reason) return
                        await supabase.from('feedbacks').insert({ 
                          user_id: userProfile.id, 
                          type: '举报', 
                          content: `举报用户[ID:${recruit.creator.id}]的招募令: ${recruit.play_content}。理由: ${reason}` 
                        })
                        alert('举报已提交，巡游天官会尽快处理！')
                      }} 
                      className="flex-1 py-3.5 text-red-400 text-sm font-bold hover:bg-red-500/10 transition"
                    >
                      🚩 举报
                    </button>

                    {!isClosed && (
                      <button onClick={() => router.push(`/messages?target=${recruit.creator.id}`)} className="flex-1 py-3.5 text-blue-400 text-sm font-bold hover:bg-blue-500/10 transition">✉️ 私信</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {isPosting && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h3 className="text-xl md:text-2xl font-black mb-6 text-white text-center tracking-widest font-orbitron">发布赛博通缉令</h3>
            <label className="block text-xs font-bold text-cyan-500 mb-1">主玩内容 *</label>
            <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="如：大乱斗 / 排位上分" value={playContent} onChange={(e) => setPlayContent(e.target.value)} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-cyan-500 mb-1">游戏平台 *</label>
                <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="如：PC / 手游 / 主机" value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-500 mb-1">大区/区服 *</label>
                <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="如：电一 / 亚服" value={serverRegion} onChange={(e) => setServerRegion(e.target.value)} />
              </div>
            </div>
            <label className="block text-xs font-bold text-cyan-500 mb-1">在线时间 *</label>
            <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="如：每晚 20:00 - 23:00" value={onlineTime} onChange={(e) => setOnlineTime(e.target.value)} />
            <label className="block text-xs font-bold text-cyan-500 mb-1">战术要求 (选填)</label>
            <textarea className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 h-24 resize-none" placeholder="如：脾气好，不压力队友..." value={personality} onChange={(e) => setPersonality(e.target.value)} />
            {postMsg && <p className="text-red-500 text-sm mb-4 text-center">{postMsg}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsPosting(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-700">取消</button>
              <button onClick={handlePostRecruit} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]">确认发布</button>
            </div>
          </div>
        </div>
      )}

      {activeRecruit && (
        <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-[80vh] max-h-[600px] overflow-hidden">
            <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-[#0A111F]">
              <h3 className="font-bold text-cyan-400 tracking-wider font-orbitron">通讯留言</h3>
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