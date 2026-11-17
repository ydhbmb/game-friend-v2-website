'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { calculateLevel } from '@/lib/levels'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [unreadNotif, setUnreadNotif] = useState(0)
  const [hasUnreadMsg, setHasUnreadMsg] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUser()

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pathname])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (userProfile) {
      fetchUnread()
      interval = setInterval(fetchUnread, 5000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [userProfile, pathname])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users_profile')
        .select('*')
        .eq('auth_id', user.id)
        .single()
      if (data) {
        if (data.banned_until && new Date(data.banned_until) > new Date()) {
          alert('你的账号已被封禁，无法继续访问')
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
        setUserProfile(data)
      }
    }
    setLoading(false)
  }

  async function fetchUnread() {
    if (!userProfile) return
    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .eq('is_read', false)
    setUnreadNotif(notifCount || 0)

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userProfile.id)
      .eq('is_read', false)
    setHasUnreadMsg((msgCount || 0) > 0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleCheckIn() {
    if (!userProfile) return
    const today = new Date().toISOString().split('T')[0]
    if (userProfile.last_checkin_at === today) return alert('今天已经签到过了')
    const { error } = await supabase
      .from('users_profile')
      .update({
        experience: (userProfile.experience || 0) + 5,
        last_checkin_at: today,
      })
      .eq('id', userProfile.id)
    if (!error) {
      alert('签到成功，获得 5 经验')
      fetchUser()
    }
  }

  if (pathname === '/login' || pathname === '/register') return null

  const levelInfo = userProfile
    ? calculateLevel(userProfile.experience || 0, userProfile.id)
    : null
  const isAdmin =
    !!userProfile && (userProfile.role === 'admin' || userProfile.role === 'super_admin')
  const checkedIn =
    !!userProfile && userProfile.last_checkin_at === new Date().toISOString().split('T')[0]

  const navBtn = (active: boolean) =>
    `relative h-8 px-2.5 rounded-md text-[12px] font-medium transition-colors flex items-center ${
      active
        ? 'bg-white/[0.09] text-[#E8EFF7]'
        : 'text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7]'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-[#050B14]/85 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-[52px] flex items-center justify-between gap-3">

        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="僚机雷达"
              className="w-7 h-7 object-contain"
            />
            <span className="text-[13px] font-semibold text-white tracking-wide hidden sm:block">
              僚机雷达
            </span>
          </Link>

          {userProfile && (
            <button
              onClick={handleCheckIn}
              disabled={checkedIn}
              className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium border transition-colors shrink-0 ${
                checkedIn
                  ? 'text-[#4A5768] border-white/[0.06] cursor-default'
                  : 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10'
              }`}
            >
              {checkedIn ? '已签到' : '签到'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          {loading ? (
            <span className="text-[11.5px] text-[#4A5768]">加载中…</span>
          ) : userProfile && levelInfo ? (
            <>
              <Link href="/moments" className={`${navBtn(pathname === '/moments')} hidden sm:flex`}>
                广场
              </Link>

              <Link href="/teams" className={`${navBtn(pathname === '/teams')} hidden sm:flex`}>
                战队
              </Link>

              {isAdmin && (
                <Link href="/admin" className={`${navBtn(pathname === '/admin')} hidden sm:flex`}>
                  后台
                </Link>
              )}

              <button
                onClick={() => window.dispatchEvent(new Event('openChatWidget'))}
                className={navBtn(false)}
                aria-label="消息"
              >
                消息
                {hasUnreadMsg && (
                  <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>

              <Link href="/notifications" className={navBtn(pathname === '/notifications')}>
                通知
                {unreadNotif > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-500 text-white text-[9px] font-medium flex items-center justify-center tabular-nums">
                    {unreadNotif > 99 ? '99+' : unreadNotif}
                  </span>
                )}
              </Link>

              <div className="relative ml-1 pl-2 border-l border-white/[0.06]" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 h-8 rounded-md hover:bg-white/[0.05] px-1 transition-colors"
                >
                  <img
                    src={userProfile.avatar_url || '/logo.png'}
                    alt={userProfile.nickname}
                    className="w-7 h-7 rounded-full object-cover bg-black border border-white/[0.08]"
                  />
                  <div className="hidden lg:flex flex-col items-start leading-tight">
                    <span className="text-[12px] font-medium text-[#E8EFF7] max-w-[90px] truncate">
                      {userProfile.nickname}
                    </span>
                    <span className="text-[10px] text-[#5C6B7F] tabular-nums">
                      Lv.{levelInfo.level} {levelInfo.name}
                    </span>
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute top-full right-0 mt-1.5 w-44 rounded-lg bg-[#0A111F] border border-white/[0.08] shadow-[0_10px_25px_rgba(0,0,0,0.5)] py-1 overflow-hidden">
                    <div className="lg:hidden px-3 py-2 border-b border-white/[0.06] mb-1">
                      <p className="text-[12px] font-medium text-[#E8EFF7] truncate">
                        {userProfile.nickname}
                      </p>
                      <p className="text-[10px] text-[#5C6B7F] mt-0.5 tabular-nums">
                        Lv.{levelInfo.level} {levelInfo.name}
                      </p>
                    </div>

                    <Link
                      href={`/profile?id=${userProfile.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 h-8 leading-8 text-[12.5px] text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7] transition-colors"
                    >
                      个人主页
                    </Link>
                    <Link
                      href="/following"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 h-8 leading-8 text-[12.5px] text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7] transition-colors"
                    >
                      我的关注
                    </Link>
                    <Link
                      href="/teams"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 h-8 leading-8 text-[12.5px] text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7] transition-colors"
                    >
                      战队
                    </Link>
                    <Link
                      href="/gacha"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 h-8 leading-8 text-[12.5px] text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7] transition-colors"
                    >
                      僚机盲盒
                    </Link>
                    <Link
                      href="/user-center"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-3 h-8 leading-8 text-[12.5px] text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7] transition-colors"
                    >
                      用户中心
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-3 h-8 leading-8 text-[12.5px] text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        神权控制台
                      </Link>
                    )}

                    <div className="border-t border-white/[0.06] mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-3 h-8 text-[12.5px] text-[#4A5768] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="h-8 px-3.5 rounded-lg bg-cyan-600 text-white text-[12.5px] font-medium hover:bg-cyan-500 transition-colors inline-flex items-center"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
