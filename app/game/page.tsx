'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import FollowUserButton from '@/components/FollowUserButton'
import UserName from '@/components/UserName'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import SectionTitle from '@/components/ui/SectionTitle'
import EmptyState from '@/components/ui/EmptyState'

import ModalPostRecruit from '@/components/ModalPostRecruit'
import ModalPostForum from '@/components/ModalPostForum'
import ModalRecruitComments from '@/components/ModalRecruitComments'
import ModalForumDetail from '@/components/ModalForumDetail'
import ModalCreateGame from '@/components/ModalCreateGame'

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

  const [isPostingRecruit, setIsPostingRecruit] = useState(false)
  const [isPostingForum, setIsPostingForum] = useState(false)
  const [isCreatingSub, setIsCreatingSub] = useState(false)
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
          const { data } = await supabase
            .from('users_profile')
            .select('*')
            .eq('auth_id', user.id)
            .single()
          if (data) {
            setUserProfile(data)
            const { data: l } = await supabase
              .from('likes')
              .select('recruit_id')
              .eq('user_id', data.id)
            if (l) setLikedIds(l.map((x) => x.recruit_id))

            const { data: rf } = await supabase
              .from('recruit_follows')
              .select('recruit_id')
              .eq('user_id', data.id)
            if (rf) setFollowedRecruitIds(rf.map((x) => x.recruit_id))

            const { data: gf } = await supabase
              .from('game_follows')
              .select('id')
              .eq('user_id', data.id)
              .eq('game_id', gameId)
              .maybeSingle()
            if (gf) setIsFollowingGame(true)
          }
        }

        const { data: gameData } = await supabase
          .from('games')
          .select(`*, creator:users_profile(nickname)`)
          .eq('id', gameId)
          .single()
        setGame(gameData)

        if (gameData && !gameData.parent_id) {
          const { data: subs } = await supabase
            .from('games')
            .select(`*`)
            .eq('parent_id', gameId)
            .order('created_at', { ascending: false })
          if (subs) setSubGames(subs)
        }

        await fetchRecruits()
        await fetchPosts()
      } catch (err) {
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [gameId])

  async function fetchRecruits() {
    const { data } = await supabase
      .from('recruits')
      .select(`*, creator:users_profile(nickname, avatar_url, id), likes(id)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
    if (data) setRecruits(data)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select(`*, user:users_profile(nickname, avatar_url, id)`)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function toggleFollowGame() {
    if (!userProfile) return alert('请先登录！')
    if (isFollowingGame) {
      await supabase
        .from('game_follows')
        .delete()
        .eq('user_id', userProfile.id)
        .eq('game_id', gameId)
      setIsFollowingGame(false)
    } else {
      await supabase
        .from('game_follows')
        .insert({ user_id: userProfile.id, game_id: gameId })
      setIsFollowingGame(true)
    }
  }

  async function toggleFollowRecruit(recruitId: number) {
    if (!userProfile) return alert('请先登录！')
    if (followedRecruitIds.includes(recruitId)) {
      await supabase
        .from('recruit_follows')
        .delete()
        .eq('user_id', userProfile.id)
        .eq('recruit_id', recruitId)
      setFollowedRecruitIds(followedRecruitIds.filter((id) => id !== recruitId))
    } else {
      await supabase
        .from('recruit_follows')
        .insert({ user_id: userProfile.id, recruit_id: recruitId })
      setFollowedRecruitIds([...followedRecruitIds, recruitId])
    }
  }

  async function handleLike(recruitId: number, creatorId: number) {
    if (!userProfile) return alert('请先登录！')
    if (likedIds.includes(recruitId)) return alert('你已经赞过这条招募啦！')
    if (creatorId === userProfile.id) return alert('不能给自己点赞哦！')

    const { error } = await supabase.rpc('give_like', { p_recruit_id: recruitId })

    if (error) {
      alert(error.message)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const currentLikeCount =
      userProfile.last_like_at === today ? userProfile.daily_like_count || 0 : 0

    setLikedIds([...likedIds, recruitId])
    setUserProfile({
      ...userProfile,
      experience: (userProfile.experience || 0) + 1,
      last_like_at: today,
      daily_like_count: currentLikeCount + 1,
    })
    fetchRecruits()
  }

  async function onRecruitSubmit(data: any) {
    if (!userProfile) {
      alert('错误：未获取到当前用户信息')
      return
    }

    const { error } = await supabase.from('recruits').insert({
      game_id: gameId,
      creator_id: userProfile.id,
      play_content: data.playContent,
      online_time: data.onlineTime,
      personality: data.personality,
      platform: data.platform,
      server_region: data.serverRegion,
    })

    if (error) {
      alert('发布失败：' + error.message)
    } else {
      setIsPostingRecruit(false)
      fetchRecruits()
    }
  }

  async function onForumSubmit(data: any) {
    if (!userProfile) {
      alert('请先登录！')
      return
    }
    const { error } = await supabase.from('posts').insert({
      game_id: gameId,
      user_id: userProfile.id,
      title: data.title,
      content: data.content,
    })
    if (!error) {
      setIsPostingForum(false)
      fetchPosts()
    }
  }

  async function openComments(recruit: any) {
    setActiveRecruit(recruit)
    setCommentLoading(true)
    const { data } = await supabase
      .from('comments')
      .select(`*, user:users_profile(nickname, avatar_url)`)
      .eq('recruit_id', recruit.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
    setCommentLoading(false)
  }

  async function sendComment(content: string) {
    if (!userProfile) return alert('请先登录！')
    await supabase
      .from('comments')
      .insert({ recruit_id: activeRecruit.id, user_id: userProfile.id, content })
    openComments(activeRecruit)
  }

  async function openPost(post: any) {
    setActivePost(post)
    setCommentLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select(`*, user:users_profile(nickname, avatar_url)`)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setPostComments(data)
    setCommentLoading(false)
  }

  async function sendPostComment(content: string) {
    if (!userProfile) return alert('请先登录！')
    await supabase
      .from('post_comments')
      .insert({ post_id: activePost.id, user_id: userProfile.id, content })
    openPost(activePost)
  }

  if (loading)
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )

  if (!game)
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-400 text-[13px]">
        该节点不存在或已被删除
      </div>
    )

  const showTabs = game.parent_id || subGames.length === 0

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] pb-20">
      <Navbar />

      <div className="relative h-44 md:h-56 w-full overflow-hidden border-b border-white/[0.06]">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.name}
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0C1826] to-[#050B14]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/40 to-transparent" />

        <button
          onClick={() => router.push('/')}
          className="absolute top-4 left-4 z-10 h-8 px-3 rounded-lg bg-black/50 border border-white/[0.12] text-[12px] text-[#94A3B8] hover:text-[#E8EFF7] hover:bg-black/70 transition-colors"
        >
          ← 返回大厅
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="max-w-5xl mx-auto px-4 md:px-6 pb-5">
            <h1 className="text-2xl md:text-3xl font-semibold text-white break-words leading-tight">
              {game.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-[11.5px] text-[#5C6B7F]">
              <span>创建者</span>
              <UserName
                userId={game.creator_id}
                nickname={game.creator?.nickname || '未知'}
                className="text-[#94A3B8] hover:text-cyan-400 transition-colors"
              />
              {!game.parent_id && subGames.length > 0 && (
                <>
                  <span className="text-[#2E3A48]">·</span>
                  <span>{subGames.length} 个子模块</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6">

        {!game.parent_id && (
          <section className="mb-6">
            <SectionTitle
              count={subGames.length > 0 ? `${subGames.length} 个` : undefined}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreatingSub(true)}
                >
                  + 创建子模块
                </Button>
              }
            >
              游戏系列版本
            </SectionTitle>

            {subGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subGames.map((sub) => (
                  <Card
                    key={sub.id}
                    padded={false}
                    hover
                    className="cursor-pointer overflow-hidden"
                  >
                    <button
                      onClick={() => router.push(`/game?id=${sub.id}`)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <div className="w-11 h-11 rounded-lg bg-white/[0.04] border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
                        {sub.cover_url ? (
                          <img
                            src={sub.cover_url}
                            alt={sub.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-[#4A5768]">无图</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#E8EFF7] truncate">
                          {sub.name}
                        </p>
                        <p className="text-[10.5px] text-[#5C6B7F] mt-0.5">
                          进入子模块 →
                        </p>
                      </div>
                    </button>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title="还没有子模块"
                description="如果有不同版本或服务器，可以创建子模块分开管理"
              />
            )}
          </section>
        )}

        {showTabs && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setActiveTab('recruit')}
                  className={`h-8 px-4 rounded-md text-[12.5px] font-medium transition-colors ${
                    activeTab === 'recruit'
                      ? 'bg-white/[0.09] text-[#E8EFF7]'
                      : 'text-[#5C6B7F] hover:text-[#94A3B8]'
                  }`}
                >
                  招募大厅
                </button>
                <button
                  onClick={() => setActiveTab('forum')}
                  className={`h-8 px-4 rounded-md text-[12.5px] font-medium transition-colors ${
                    activeTab === 'forum'
                      ? 'bg-white/[0.09] text-[#E8EFF7]'
                      : 'text-[#5C6B7F] hover:text-[#94A3B8]'
                  }`}
                >
                  讨论区
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {activeTab === 'recruit' ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={toggleFollowGame}
                    >
                      {isFollowingGame ? '已订阅' : '订阅频道'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsPostingRecruit(true)}
                    >
                      + 发布招募
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsPostingForum(true)}
                  >
                    + 发布帖子
                  </Button>
                )}
              </div>
            </div>

            {activeTab === 'recruit' && (
              <div>
                {recruits.length === 0 ? (
                  <EmptyState
                    title="还没有人发布招募"
                    description="第一个发布招募，让搭子找到你"
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsPostingRecruit(true)}
                      >
                        发布招募
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {recruits.map((recruit, index) => {
                      const isFirstBlood = index === recruits.length - 1
                      const isClosed = recruit.is_closed
                      const likeCount = recruit.likes?.length || 0
                      const isRecruitFollowed = followedRecruitIds.includes(recruit.id)
                      const isLiked = likedIds.includes(recruit.id)

                      return (
                        <Card
                          key={recruit.id}
                          padded={false}
                          className={`flex flex-col overflow-hidden ${
                            isClosed ? 'opacity-55' : ''
                          }`}
                        >
                          <div className="p-4 flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[9.5px] tracking-[0.2em] text-cyan-400/60 font-mono">
                                WANTED
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isFirstBlood && <Badge tone="danger">首杀</Badge>}
                                <Badge tone={isClosed ? 'neutral' : 'accent'}>
                                  {isClosed ? '已结案' : '招募中'}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-[14px] leading-relaxed text-[#E8EFF7] line-clamp-2 mb-3.5">
                              {recruit.play_content}
                            </p>

                            <div className="space-y-1.5 text-[11.5px]">
                              <div className="flex gap-2">
                                <span className="w-[52px] shrink-0 text-[#5C6B7F]">平台</span>
                                <span className="text-[#94A3B8] truncate">
                                  {recruit.platform || '不限'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="w-[52px] shrink-0 text-[#5C6B7F]">区服</span>
                                <span className="text-[#94A3B8] truncate">
                                  {recruit.server_region || '不限'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="w-[52px] shrink-0 text-[#5C6B7F]">在线</span>
                                <span className="text-[#94A3B8] truncate">
                                  {recruit.online_time || '未填写'}
                                </span>
                              </div>
                              {recruit.personality && (
                                <div className="flex gap-2">
                                  <span className="w-[52px] shrink-0 text-[#5C6B7F]">要求</span>
                                  <span className="text-[#94A3B8] line-clamp-1">
                                    {recruit.personality}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={recruit.creator?.avatar_url || '/logo.png'}
                                alt={recruit.creator?.nickname}
                                className="w-7 h-7 rounded-full object-cover bg-black shrink-0"
                              />
                              <UserName
                                userId={recruit.creator?.id}
                                nickname={recruit.creator?.nickname}
                                className="text-[12px] text-[#94A3B8] truncate hover:text-cyan-400 transition-colors"
                              />
                              <FollowUserButton
                                targetId={recruit.creator?.id}
                                currentUserId={userProfile?.id}
                              />
                            </div>

                            <button
                              disabled={isClosed}
                              onClick={() => handleLike(recruit.id, recruit.creator.id)}
                              className={`h-7 px-2.5 rounded-md border text-[11px] font-medium transition-colors shrink-0 ${
                                isLiked
                                  ? 'bg-red-500/12 text-red-400 border-red-500/25'
                                  : 'bg-transparent text-[#5C6B7F] border-white/[0.08] hover:text-red-400 hover:border-red-500/25'
                              }`}
                            >
                              {isLiked ? '已赞' : '点赞'} {likeCount}
                            </button>
                          </div>

                          <div className="flex border-t border-white/[0.06] divide-x divide-white/[0.06]">
                            <button
                              onClick={() => openComments(recruit)}
                              className="flex-1 py-2.5 text-[12px] text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#E8EFF7] transition-colors"
                            >
                              留言
                            </button>
                            <button
                              onClick={() => toggleFollowRecruit(recruit.id)}
                              className={`flex-1 py-2.5 text-[12px] transition-colors hover:bg-white/[0.04] ${
                                isRecruitFollowed
                                  ? 'text-[#4A5768]'
                                  : 'text-[#94A3B8] hover:text-[#E8EFF7]'
                              }`}
                            >
                              {isRecruitFollowed ? '已关注' : '关注'}
                            </button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'forum' && (
              <div>
                {posts.length === 0 ? (
                  <EmptyState
                    title="讨论区还很安静"
                    description="发第一帖子，聊聊这个游戏"
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsPostingForum(true)}
                      >
                        发布帖子
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2.5">
                    {posts.map((post) => (
                      <Card key={post.id} padded={false} hover>
                        <button
                          onClick={() => openPost(post)}
                          className="w-full flex gap-3 p-4 text-left"
                        >
                          <img
                            src={post.user?.avatar_url || '/logo.png'}
                            alt={post.user?.nickname}
                            className="w-8 h-8 rounded-full object-cover bg-black shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-medium text-[#E8EFF7] mb-1.5 truncate">
                              {post.title}
                            </h3>
                            <p className="text-[12.5px] text-[#5C6B7F] line-clamp-2 leading-relaxed mb-2">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-[#4A5768]">
                              <span className="truncate">
                                {post.user?.nickname || '未知玩家'}
                              </span>
                              <span className="text-[#2E3A48]">·</span>
                              <span className="shrink-0">
                                {new Date(post.created_at).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

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
      <ModalCreateGame
        isOpen={isCreatingSub}
        onClose={() => setIsCreatingSub(false)}
        onSuccess={() => {
          if (gameId) {
            supabase
              .from('games')
              .select(`*`)
              .eq('parent_id', gameId)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data) setSubGames(data)
              })
          }
        }}
        currentUserId={userProfile?.id}
        defaultParentId={game.id}
        lockParent
      />
    </div>
  )
}

export default function GameDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
          加载中…
        </div>
      }
    >
      <GameDetailContent />
    </Suspense>
  )
}
