'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { calculateLevel } from '@/lib/levels'
import FollowUserButton from '@/components/FollowUserButton'
import Link from 'next/link'

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
  
  const [fansCount, setFansCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false) 

  // 评价系统状态
  const [hasReviewed, setHasReviewed] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')

  const [isBindingSteam, setIsBindingSteam] = useState(false)
  const [inputSteamId, setInputSteamId] = useState('')

  const isSelf = currentUser && profile && currentUser.id === profile.id

  useEffect(() => {
    async function init() {
      if (!targetId) return
      
      let currentUserId = null
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: uProfile } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
        if (uProfile) {
          setCurrentUser(uProfile)
          currentUserId = uProfile.id
        }
      }

      const { data: pData } = await supabase.from('users_profile').select('*').eq('id', targetId).single()
      if (pData) setProfile(pData)

      const { count: fans } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId)
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId)
      setFansCount(fans || 0)
      setFollowingCount(following || 0)

      const { data: rData } = await supabase.from('recruits').select(`*, games(name)`).eq('creator_id', targetId).order('created_at', { ascending: false }).limit(4)
      if (rData) setRecruits(rData)

      const { data: teamData } = await supabase.from('team_members').select(`role, teams(*)`).eq('user_id', targetId).neq('role', 'pending').single()
      if (teamData && teamData.teams) setMyTeam(teamData.teams)

      const { data: gamesData } = await supabase.from('user_steam_games').select('*').eq('user_id', targetId).order('playtime_forever', { ascending: false }).limit(6)
      if (gamesData) setSteamGames(gamesData)

      const { data: fGameData } = await supabase.from('game_follows').select('game_id, games(*)').eq('user_id', targetId).order('created_at', { ascending: false }).limit(6)
      if (fGameData) setFollowedGames(fGameData.map(f => f.games).filter(Boolean))

      if (currentUserId && currentUserId !== parseInt(targetId)) {
        const { data: cData } = await supabase.rpc('get_common_games', { user_a: currentUserId, user_b: parseInt(targetId) })
        if (cData) setCommonGames(cData)

        // 查我是否评价过对方
        const { data: revData } = await supabase.from('reviews').select('id').eq('reviewer_id', currentUserId).eq('target_id', targetId).single()
        if (revData) setHasReviewed(true)
      }

      setLoading(false)
    }
    init()
  }, [targetId])

  async function handleBindSteam() {
    if (!inputSteamId.trim()) return alert('请输入 Steam 17位数字ID')
    await supabase.from('users_profile').update({ steam_id: inputSteamId.trim() }).eq('id', currentUser.id)
    setProfile({ ...profile, steam_id: inputSteamId.trim() })
    setIsBindingSteam(false)
    alert('Steam 档案绑定成功！')
  }

  async function handleSyncSteam() {
    if (!profile.steam_id) return
    setSyncing(true)
    try {
      const res = await supabase.functions.invoke('get-steam-games', { body: { steamId: profile.steam_id } })
      if (res.error || res.data.error) throw new Error(res.error?.message || res.data.error)
      const fetchedGames = res.data.games
      if (!fetchedGames || fetchedGames.length === 0) throw new Error("未获取到游戏数据")

      await supabase.from('user_steam_games').delete().eq('user_id', profile.id)
      const insertData = fetchedGames.slice(0, 100).map((g: any) => ({ user_id: profile.id, app_id: g.appid, game_name: g.name, playtime_forever: g.playtime_forever }))
      await supabase.from('user_steam_games').insert(insertData)

      const { data: newGames } = await supabase.from('user_steam_games').select('*').eq('user_id', profile.id).order('playtime_forever', { ascending: false }).limit(6)
      if (newGames) setSteamGames(newGames)
      alert(`✅ 成功同步并保存了 ${insertData.length} 款游戏！`)
    } catch (err: any) { alert('同步失败：' + err.message) }
    setSyncing(false)
  }

  // 🔥 核心：提交评价
  async function handleReview(isPositive: boolean) {
    if (hasReviewed) return alert('你已经评价过该玩家啦！')
    setReviewMsg('提交中...')
    
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: currentUser.id,
      target_id: profile.id,
      is_positive: isPositive
    })

    if (!error) {
      // 更新用户表的好评/差评数
      const field = isPositive ? 'positive_reviews' : 'negative_reviews'
      const currentCount = profile[field] || 0
      await supabase.from('users_profile').update({ [field]: currentCount + 1 }).eq('id', profile.id)
      
      setProfile({ ...profile, [field]: currentCount + 1 })
      setHasReviewed(true)
      setReviewMsg(isPositive ? '已标记为靠谱搭子！' : '已记录反馈，感谢净化社区！')
    } else {
      setReviewMsg('评价失败')
    }
  }

  if (loading) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500 animate-pulse">解析玩家数据中...</div>
  if (!profile) return <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-red-500">该玩家不存在或已注销</div>

  const lvl = calculateLevel(profile.experience || 0, profile.id)
  const progressPercent = lvl.isMaxLevel ? 100 : Math.min(100, Math.floor((lvl.currentLevelExp / lvl.nextLevelExp) * 100))
  
  // 计算好评率
  const totalReviews = (profile.positive_reviews || 0) + (profile.negative_reviews || 0)
  const goodRate = totalReviews === 0 ? '暂无' : Math.round(((profile.positive_reviews || 0) / totalReviews) * 100) + '%'

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 relative overflow-hidden pb-20">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/80 to-[#050B14]"></div>
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10">
          
          <div className="bg-[#0A111F]/90 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>

            <div className="relative">
              <img src={profile.avatar_url || '/logo.png'} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-cyan-500/50 object-cover shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-black" />
              {profile.id === 1 && <span className="absolute -top-4 -left-4 text-4xl drop-shadow-lg">👑</span>}
            </div>
            
            <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-white font-orbitron">{profile.nickname}</h1>
                {profile.equipped_title && (
                  <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 border border-fuchsia-500/50 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.3)] bg-fuchsia-900/20">
                    {profile.equipped_title}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-cyan-500 font-mono mb-4">ID: {profile.id} · {profile.gender || '保密'}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-6 mb-6">
                <div className="text-center"><span className="block text-xl font-bold text-white">{fansCount}</span><span className="text-xs text-gray-500">粉丝</span></div>
                <div className="text-center"><span className="block text-xl font-bold text-white">{followingCount}</span><span className="text-xs text-gray-500">关注</span></div>
                <div className="text-center"><span className="block text-xl font-bold text-cyan-400">{profile.experience || 0}</span><span className="text-xs text-gray-500">经验</span></div>
              </div>

              {!isSelf && <div className="flex justify-center md:justify-start"><FollowUserButton targetId={profile.id} currentUserId={currentUser?.id} /></div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            
            <div className="space-y-6">
              
              {/* 信誉分面板 */}
              <div className="bg-[#0A111F]/80 border border-green-500/30 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-green-400 mb-4 font-orbitron flex items-center gap-2">🛡️ 信誉档案</h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-xs">综合好评率</span>
                  <span className={`text-2xl font-black font-orbitron ${goodRate === '暂无' ? 'text-gray-500' : parseInt(goodRate) >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                    {goodRate}
                  </span>
                </div>
                <div className="flex gap-4 text-xs font-mono mb-4">
                  <span className="text-green-400">👍 靠谱: {profile.positive_reviews || 0}</span>
                  <span className="text-red-400">🕊️ 鸽子: {profile.negative_reviews || 0}</span>
                </div>
                
                {/* 评价按钮（如果不是自己） */}
                {!isSelf && (
                  <div className="pt-3 border-t border-gray-700/50">
                    {hasReviewed ? (
                      <p className="text-xs text-gray-500 text-center">你已经评价过该玩家</p>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(true)} className="flex-1 bg-green-600/20 text-green-400 border border-green-500/50 py-1.5 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition">点赞靠谱</button>
                        <button onClick={() => handleReview(false)} className="flex-1 bg-red-600/20 text-red-400 border border-red-500/50 py-1.5 rounded text-xs font-bold hover:bg-red-600 hover:text-white transition">标记鸽子</button>
                      </div>
                    )}
                    {reviewMsg && <p className="text-[10px] text-center text-cyan-400 mt-2">{reviewMsg}</p>}
                  </div>
                )}
              </div>

              <div className="bg-[#0A111F]/80 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cyan-400 mb-4 font-orbitron flex items-center gap-2">📊 战术评级</h3>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-cyan-400 font-bold text-sm">{lvl.icon} {lvl.name}</span>
                  <span className="text-2xl font-black text-white font-orbitron">Lv.{lvl.level}</span>
                </div>
                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700 mb-2">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              <div className="bg-[#0A111F]/80 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">🎮</div>
                <h3 className="text-sm font-bold text-blue-400 mb-4 font-orbitron flex items-center gap-2">🕹️ Steam 档案</h3>
                
                {profile.steam_id ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-3 truncate">已绑定 ID: <span className="text-white">{profile.steam_id}</span></p>
                    <a href={`https://steamcommunity.com/profiles/${profile.steam_id}`} target="_blank" rel="noopener noreferrer" className="block text-center bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 py-2 rounded-xl text-sm font-bold transition-all mb-2">
                      查看 Steam 主页 →
                    </a>
                    
                    {isSelf && (
                      <div className="space-y-2 mt-4">
                        <button onClick={handleSyncSteam} disabled={syncing} className="w-full bg-fuchsia-600 text-white py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-fuchsia-500 disabled:opacity-50 transition">
                          {syncing ? '同步中...' : '🔄 同步游戏库'}
                        </button>
                        <button onClick={() => { setInputSteamId(profile.steam_id); setIsBindingSteam(true); }} className="w-full bg-gray-800 text-gray-400 py-2 rounded-xl text-xs font-bold hover:bg-gray-700 transition">修改 ID</button>
                      </div>
                    )}

                    {steamGames.length > 0 && (
                      <div className="mt-6 border-t border-gray-700/50 pt-4">
                         <p className="text-[10px] text-gray-500 mb-3">最常玩的游戏：</p>
                         <div className="flex flex-wrap gap-2">
                           {steamGames.map((g, idx) => (
                             <div key={idx} className="bg-black border border-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded truncate max-w-full">{g.game_name}</div>
                           ))}
                         </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500 mb-3">该玩家暂未绑定 Steam 数据</p>
                    {isSelf && <button onClick={() => setIsBindingSteam(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">立即绑定</button>}
                  </div>
                )}
              </div>

              <div className="bg-[#0A111F]/80 border border-fuchsia-500/30 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-fuchsia-400 mb-4 font-orbitron flex items-center gap-2">🛡️ 所属战队</h3>
                {myTeam ? (
                  <div className="flex items-center gap-3">
                    <img src={myTeam.icon_url || '/logo.png'} className="w-10 h-10 rounded-lg object-cover border border-gray-600" />
                    <div><p className="text-sm font-bold text-white truncate">{myTeam.name}</p></div>
                  </div>
                ) : <p className="text-xs text-gray-500">该玩家目前是独狼。</p>}
              </div>

              <div className="bg-[#0A111F]/80 border border-cyan-500/30 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-cyan-400 mb-4 font-orbitron flex items-center gap-2">📌 关注的游戏</h3>
                {followedGames.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {followedGames.map(g => (
                      <Link key={g.id} href={`/game?id=${g.id}`} className="flex items-center gap-2 bg-black/40 border border-gray-700 p-2 rounded-lg hover:border-cyan-500/50 transition group">
                        <span className="text-xs font-bold text-gray-300 group-hover:text-cyan-400 truncate">{g.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-500">暂无关注。</p>}
              </div>

            </div>

            <div className="md:col-span-2 space-y-6">
              {!isSelf && profile.steam_id && (
                <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/20 border border-blue-500/50 rounded-2xl p-5 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-black text-white font-orbitron">🎯 雷达匹配结果</h3>
                     <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">拥有 {commonGames.length} 款共同游戏</span>
                   </div>
                   {commonGames.length > 0 ? (
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {commonGames.slice(0, 9).map((g: any, idx) => (
                         <div key={idx} className="bg-black/50 border border-blue-500/30 text-blue-300 text-xs px-3 py-2 rounded-lg truncate">{g.game_name}</div>
                       ))}
                     </div>
                   ) : <p className="text-sm text-gray-400">暂时没有共同游戏。</p>}
                </div>
              )}

              <div className="bg-[#0A111F]/80 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-lg font-black text-white mb-6 font-orbitron flex items-center gap-2"><span className="w-2 h-5 bg-cyan-400 rounded-full"></span> 历史招募通缉</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recruits.map(r => (
                    <div key={r.id} onClick={() => router.push(`/game?id=${r.game_id}`)} className="bg-[#050B14] border border-gray-700 p-4 rounded-xl hover:border-cyan-500/50 transition cursor-pointer group">
                       <p className="text-[10px] text-cyan-500 mb-2 truncate">游戏: {r.games?.name}</p>
                       <p className="font-bold text-white mb-3 line-clamp-1 group-hover:text-cyan-400 transition">{r.play_content}</p>
                    </div>
                  ))}
                  {recruits.length === 0 && <p className="text-gray-500 text-sm">暂无招募。</p>}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {isBindingSteam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A111F] border border-blue-500/50 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-black text-white mb-2 font-orbitron text-center">绑定 Steam 档案</h3>
            <input className="w-full bg-[#050B14] border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 mb-4 font-mono text-center" placeholder="7656119..." value={inputSteamId} onChange={e => setInputSteamId(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setIsBindingSteam(false)} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-xl font-bold">取消</button>
              <button onClick={handleBindSteam} className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold">确认绑定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B14] flex items-center justify-center text-cyan-500">加载中...</div>}>
      <ProfileContent />
    </Suspense>
  )
}