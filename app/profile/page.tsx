'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import FollowUserButton from '@/components/FollowUserButton'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SectionTitle from '@/components/ui/SectionTitle'
import EmptyState from '@/components/ui/EmptyState'

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

function ProfileContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetId = searchParams.get('id')

  const [profile, setProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [recruits, setRecruits] = useState<any[]>([])
  const [myTeam, setMyTeam] = useState<any>(null)
  const [steamGames, setSteamGames] = useState<any[]>([])
  const [commonGames, setCommonGames] = useState<any[]>([])
  const [followedGames, setFollowedGames] = useState<any[]>([])
  const [moments, setMoments] = useState<any[]>([])

  const [fansCount, setFansCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')

  const [isBindingSteam, setIsBindingSteam] = useState(false)
  const [inputSteamId, setInputSteamId] = useState('')

  const isSelf = currentUser && profile && currentUser.id === profile.id

  useEffect(() => {
    async function init() {
      if (!targetId) return

      let currentUserId: number | null = null
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: uProfile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('auth_id', user.id)
          .single()
        if (uProfile) {
          setCurrentUser(uProfile)
          currentUserId = uProfile.id
        }
      }

      const { data: pData } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', targetId)
        .single()
      if (pData) setProfile(pData)

      const { count: fans } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetId)
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetId)
      setFansCount(fans || 0)
      setFollowingCount(following || 0)

      const { data: rData } = await supabase
        .from('recruits')
        .select(`*, games(name)`)
        .eq('creator_id', targetId)
        .order('created_at', { ascending: false })
        .limit(4)
      if (rData) setRecruits(rData)

      const { data: teamRows } = await supabase
        .from('team_members')
        .select(`role, teams(*)`)
        .eq('user_id', targetId)
        .neq('role', 'pending')
        .limit(1)
      if (teamRows && teamRows.length > 0 && teamRows[0].teams) {
        setMyTeam(teamRows[0].teams)
      }

      const { data: gamesData } = await supabase
        .from('user_steam_games')
        .select('*')
        .eq('user_id', targetId)
        .order('playtime_forever', { ascending: false })
        .limit(6)
      if (gamesData) setSteamGames(gamesData)

      const { data: fGameData } = await supabase
        .from('game_follows')
        .select('game_id, games(*)')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(6)
      if (fGameData) setFollowedGames(fGameData.map((f) => f.games).filter(Boolean))

      const { data: mData } = await supabase
        .from('moments')
        .select('id, content, created_at, moment_likes(user_id)')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(6)
      if (mData) setMoments(mData)

      if (currentUserId && currentUserId !== parseInt(targetId)) {
        const { data: cData } = await supabase.rpc('get_common_games', {
          user_a: currentUserId,
          user_b: parseInt(targetId),
        })
        if (cData) setCommonGames(cData)

        const { data: revData } = await supabase
          .from('reviews')
          .select('id')
          .eq('reviewer_id', currentUserId)
          .eq('target_id', targetId)
          .maybeSingle()
        if (revData) setHasReviewed(true)
      }

      setLoading(false)
    }
    init()
  }, [targetId])

  async function handleBindSteam() {
    if (!inputSteamId.trim()) return alert('请输入 Steam 17 位数字 ID')
    await supabase
      .from('users_profile')
      .update({ steam_id: inputSteamId.trim() })
      .eq('id', currentUser.id)
    setProfile({ ...profile, steam_id: inputSteamId.trim() })
    setIsBindingSteam(false)
    alert('Steam 档案绑定成功')
  }

  async function handleSyncSteam() {
    if (!profile.steam_id) return
    setSyncing(true)
    try {
      const res = await supabase.functions.invoke('get-steam-games', {
        body: { steamId: profile.steam_id },
      })
      if (res.error || res.data.error) throw new Error(res.error?.message || res.data.error)
      const fetchedGames = res.data.games
      if (!fetchedGames || fetchedGames.length === 0) throw new Error('未获取到游戏数据')

      await supabase.from('user_steam_games').delete().eq('user_id', profile.id)
      const insertData = fetchedGames.slice(0, 100).map((g: any) => ({
        user_id: profile.id,
        app_id: g.appid,
        game_name: g.name,
        playtime_forever: g.playtime_forever,
      }))
      await supabase.from('user_steam_games').insert(insertData)

      const { data: newGames } = await supabase
        .from('user_steam_games')
        .select('*')
        .eq('user_id', profile.id)
        .order('playtime_forever', { ascending: false })
        .limit(6)
      if (newGames) setSteamGames(newGames)
      alert(`已同步 ${insertData.length} 款游戏`)
    } catch (err: any) {
      alert('同步失败：' + err.message)
    }
    setSyncing(false)
  }

  async function handleReview(isPositive: boolean) {
    if (hasReviewed) return alert('你已经评价过该玩家啦')
    setReviewMsg('提交中…')

    const { error } = await supabase.rpc('give_review', {
      p_target_id: profile.id,
      p_is_positive: isPositive,
    })

    if (error) {
      setReviewMsg(error.message)
      return
    }

    const field = isPositive ? 'positive_reviews' : 'negative_reviews'
    setProfile({ ...profile, [field]: (profile[field] || 0) + 1 })
    setHasReviewed(true)
    setReviewMsg(isPositive ? '已标记为靠谱搭子' : '已记录反馈')
  }

  async function handleDeleteMoment(id: number) {
    if (!confirm('确定删除这条动态吗？')) return
    const { error } = await supabase.from('moments').delete().eq('id', id)
    if (error) {
      alert('删除失败：' + error.message)
    } else {
      setMoments((prev) => prev.filter((m) => m.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
        加载中…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-400 text-[13px]">
        该玩家不存在或已注销
      </div>
    )
  }

  const lvl = calculateLevel(profile.experience || 0, profile.id)
  const progressPercent = lvl.isMaxLevel
    ? 100
    : Math.min(100, Math.floor((lvl.currentLevelExp / lvl.nextLevelExp) * 100))

  const totalReviews = (profile.positive_reviews || 0) + (profile.negative_reviews || 0)
  const goodRate =
    totalReviews === 0
      ? null
      : Math.round(((profile.positive_reviews || 0) / totalReviews) * 100)

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] relative overflow-hidden pb-20">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 to-[#050B14]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6 md:pt-8">

          <Card className="mb-4" padded={false}>
            <div className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-5">

                <div className="relative shrink-0">
                  <img
                    src={profile.avatar_url || '/logo.png'}
                    alt={profile.nickname}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover bg-black border border-white/[0.08]"
                  />
                  {profile.id === 1 && (
                    <span className="absolute -top-2 -right-2 text-base leading-none">👑</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex flex-col md:flex-row items-center gap-2 mb-1.5">
                    <h1 className="text-xl md:text-2xl font-semibold text-white truncate max-w-full">
                      {profile.nickname}
                    </h1>
                    {profile.equipped_title && (
                      <Badge tone="accent">{profile.equipped_title}</Badge>
                    )}
                  </div>

                  <p className="text-[11.5px] text-[#5C6B7F] font-mono mb-3">
                    ID:{profile.id} · {profile.gender || '保密'}
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-5 mb-4">
                    <div className="text-center">
                      <p className="text-[15px] font-semibold text-white tabular-nums">
                        {fansCount}
                      </p>
                      <p className="text-[10.5px] text-[#5C6B7F] mt-0.5">粉丝</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-semibold text-white tabular-nums">
                        {followingCount}
                      </p>
                      <p className="text-[10.5px] text-[#5C6B7F] mt-0.5">关注</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-semibold text-cyan-400 tabular-nums">
                        {profile.experience || 0}
                      </p>
                      <p className="text-[10.5px] text-[#5C6B7F] mt-0.5">经验</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex justify-center md:justify-start">
                      <FollowUserButton
                        targetId={profile.id}
                        currentUserId={currentUser?.id}
                      />
                    </div>
                  )}
                </div>

                <div className="w-full md:w-[180px] shrink-0 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#5C6B7F]">Lv.{lvl.level}</span>
                    <span className="text-[11px] text-[#94A3B8] truncate max-w-[90px] text-right">
                      {lvl.name}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#4A5768] mt-2 tabular-nums">
                    {lvl.isMaxLevel
                      ? '已满级'
                      : `${lvl.currentLevelExp} / ${lvl.nextLevelExp}`}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="space-y-4">

              <Card>
                <SectionTitle>信誉档案</SectionTitle>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[11.5px] text-[#5C6B7F]">综合好评率</span>
                  <span
                    className={`text-lg font-semibold tabular-nums ${
                      goodRate === null
                        ? 'text-[#4A5768]'
                        : goodRate >= 80
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {goodRate === null ? '暂无' : `${goodRate}%`}
                  </span>
                </div>

                <div className="flex gap-4 text-[11.5px] mb-3">
                  <span className="text-green-400">
                    靠谱 {profile.positive_reviews || 0}
                  </span>
                  <span className="text-red-400">
                    鸽子 {profile.negative_reviews || 0}
                  </span>
                </div>

                {!isSelf && (
                  <div className="pt-3 border-t border-white/[0.06]">
                    {hasReviewed ? (
                      <p className="text-[11px] text-[#4A5768] text-center py-1">
                        你已评价过该玩家
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          full
                          onClick={() => handleReview(true)}
                        >
                          靠谱
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          full
                          onClick={() => handleReview(false)}
                        >
                          鸽子
                        </Button>
                      </div>
                    )}
                    {reviewMsg && (
                      <p className="text-[10.5px] text-cyan-400 text-center mt-2">
                        {reviewMsg}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              <Card>
                <SectionTitle>Steam 档案</SectionTitle>

                {profile.steam_id ? (
                  <div>
                    <p className="text-[11px] text-[#5C6B7F] mb-2 truncate font-mono">
                      {profile.steam_id}
                    </p>
                    <a
                      href={`https://steamcommunity.com/profiles/${profile.steam_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center h-8 leading-8 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[12px] text-[#94A3B8] hover:bg-white/[0.09] hover:text-[#E8EFF7] transition-colors mb-2"
                    >
                      查看 Steam 主页
                    </a>

                    {isSelf && (
                      <div className="space-y-2 mt-3">
                        <Button
                          variant="primary"
                          size="sm"
                          full
                          loading={syncing}
                          onClick={handleSyncSteam}
                        >
                          同步游戏库
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          full
                          onClick={() => {
                            setInputSteamId(profile.steam_id)
                            setIsBindingSteam(true)
                          }}
                        >
                          修改 ID
                        </Button>
                      </div>
                    )}

                    {steamGames.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <p className="text-[10.5px] text-[#4A5768] mb-2">最常玩</p>
                        <div className="flex flex-wrap gap-1.5">
                          {steamGames.map((g, idx) => (
                            <span
                              key={idx}
                              className="text-[10.5px] text-[#94A3B8] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 truncate max-w-full"
                            >
                              {g.game_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-[11px] text-[#4A5768] mb-3">暂未绑定 Steam</p>
                    {isSelf && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsBindingSteam(true)}
                      >
                        立即绑定
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              <Card>
                <SectionTitle>所属战队</SectionTitle>
                {myTeam ? (
                  <div className="flex items-center gap-2.5">
                    <img
                      src={myTeam.icon_url || '/logo.png'}
                      alt={myTeam.name}
                      className="w-9 h-9 rounded-lg object-cover bg-black border border-white/[0.08]"
                    />
                    <p className="text-[13px] text-[#E8EFF7] truncate">{myTeam.name}</p>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-[#4A5768]">目前是独狼</p>
                )}
              </Card>

              <Card>
                <SectionTitle>关注的游戏</SectionTitle>
                {followedGames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {followedGames.map((g) => (
                      <Link
                        key={g.id}
                        href={`/game?id=${g.id}`}
                        className="text-[11.5px] text-[#94A3B8] bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-1 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors truncate max-w-full"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-[#4A5768]">暂无关注</p>
                )}
              </Card>
            </div>

            <div className="md:col-span-2 space-y-4">

              {!isSelf && profile.steam_id && (
                <Card>
                  <SectionTitle count={`${commonGames.length} 款共同游戏`}>
                    雷达匹配
                  </SectionTitle>
                  {commonGames.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {commonGames.slice(0, 9).map((g: any, idx) => (
                        <div
                          key={idx}
                          className="text-[11.5px] text-cyan-300 bg-cyan-500/[0.08] border border-cyan-500/20 rounded-md px-2 py-1.5 truncate"
                        >
                          {g.game_name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-[#4A5768]">暂时没有共同游戏</p>
                  )}
                </Card>
              )}

              <Card>
                <SectionTitle
                  action={
                    <Link
                      href="/moments"
                      className="text-[11.5px] text-[#5C6B7F] hover:text-cyan-400 transition-colors"
                    >
                      去广场 →
                    </Link>
                  }
                >
                  动态
                </SectionTitle>

                {moments.length > 0 ? (
                  <div className="space-y-2">
                    {moments.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3"
                      >
                        <p className="text-[13px] text-[#E8EFF7] whitespace-pre-wrap break-words leading-relaxed">
                          {m.content}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10.5px] text-[#4A5768]">
                          <span>{timeAgo(m.created_at)}</span>
                          <span>{m.moment_likes?.length || 0} 赞</span>
                          {isSelf && (
                            <button
                              onClick={() => handleDeleteMoment(m.id)}
                              className="ml-auto text-[#4A5768] hover:text-red-400 transition-colors"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    title={isSelf ? '你还没有发过动态' : '该玩家还没有发过动态'}
                    description={isSelf ? '去广场说两句，让搭子认识你' : undefined}
                    action={
                      isSelf ? (
                        <Link
                          href="/moments"
                          className="text-[11.5px] text-cyan-400 hover:underline"
                        >
                          去发第一条 →
                        </Link>
                      ) : undefined
                    }
                  />
                )}
              </Card>

              <Card>
                <SectionTitle count={recruits.length > 0 ? `${recruits.length} 条` : undefined}>
                  历史招募
                </SectionTitle>

                {recruits.length > 0 ? (
                  <div className="space-y-2">
                    {recruits.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => router.push(`/game?id=${r.game_id}`)}
                        className="w-full text-left rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors"
                      >
                        <p className="text-[10.5px] text-[#5C6B7F] mb-1 truncate">
                          {r.games?.name || '未知游戏'}
                        </p>
                        <p className="text-[12.5px] text-[#E8EFF7] line-clamp-1">
                          {r.play_content}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="暂无招募记录" />
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>

      {isBindingSteam && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-[#E8EFF7]">绑定 Steam</h3>
              <button
                onClick={() => setIsBindingSteam(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4">
              <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                17 位数字 Steam ID
              </label>
              <input
                value={inputSteamId}
                onChange={(e) => setInputSteamId(e.target.value)}
                placeholder="7656119..."
                className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors font-mono"
              />
            </div>

            <div className="px-5 pb-4 pt-1 flex gap-2">
              <Button variant="ghost" full onClick={() => setIsBindingSteam(false)}>
                取消
              </Button>
              <Button variant="primary" full onClick={handleBindSteam}>
                确认绑定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#5C6B7F] text-[13px]">
          加载中…
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  )
}
