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
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [pathname])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (userProfile) {
      fetchUnread()
      interval = setInterval(fetchUnread, 5000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [userProfile, pathname])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      if (data) {
        if (data.banned_until && new Date(data.banned_until) > new Date()) {
          alert('您已经被巡游天官发现您的违禁行为，禁止进入！')
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
    const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userProfile.id).eq('is_read', false)
    setUnreadNotif(notifCount || 0)

    const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userProfile.id).eq('is_read', false)
    setHasUnreadMsg((msgCount || 0) > 0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleCheckIn() {
    if (!userProfile) return
    const today = new Date().toISOString().split('T')[0]
    if (userProfile.last_checkin_at === today) return alert('今天已经签到过啦！')
    const { error } = await supabase.from('users_profile').update({ experience: (userProfile.experience || 0) + 5, last_checkin_at: today }).eq('id', userProfile.id)
    if (!error) {
      alert('签到成功！获得 5 经验！')
      fetchUser() 
    }
  }

  if (pathname === '/login' || pathname === '/register') return null

  const levelInfo = userProfile ? calculateLevel(userProfile.experience || 0, userProfile.id) : null

  return (
    <nav className="bg-[#050B14]/80 backdrop-blur-md border-b border-cyan-900/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2 md:gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="僚机雷达" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hidden sm:block tracking-widest font-orbitron">僚机雷达</span>
        </Link>

        {userProfile && (
          <button onClick={handleCheckIn} className="text-[10px] md:text-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-2 md:px-3 py-1.5 rounded-full font-bold hover:scale-105 transition">
            📅 <span className="hidden sm:inline">签到领经验</span><span className="sm:hidden">签到</span>
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {loading ? (
          <span className="text-cyan-500 text-xs animate-pulse">加载中...</span>
        ) : userProfile && levelInfo ? (
          <div className="flex items-center gap-1 md:gap-3 relative">
            
            <button 
              onClick={() => window.dispatchEvent(new Event('openChatWidget'))}
              className="relative text-xs font-bold px-2 py-1.5 rounded-lg text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
            >
              <span className="hidden md:inline">消息</span><span className="md:hidden">✉️</span>
              {hasUnreadMsg && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#050B14] animate-pulse"></span>}
            </button>
            
            <Link href="/notifications" className="relative text-xs font-bold px-2 py-1.5 rounded-lg text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20">
              <span className="hidden md:inline">通知</span><span className="md:hidden">🔔</span>
              {unreadNotif > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full border-2 border-[#050B14]">
                  {unreadNotif > 99 ? '99+' : unreadNotif}
                </span>
              )}
            </Link>

            <div className="relative ml-1 md:ml-2 pl-2 md:pl-4 border-l border-gray-700" ref={menuRef}>
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <img src={userProfile.avatar_url || '/logo.png'} className="w-8 h-8 rounded-full object-cover border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                <div className="hidden lg:flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-200">{userProfile.nickname}</span>
                    <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">Lv.{levelInfo.level}</span>
                  </div>
                  <span className="text-[10px] text-blue-400 font-bold">{levelInfo.icon} {levelInfo.name}</span>
                </div>
              </div>
              
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-[#0A111F] border border-cyan-500/30 rounded-xl shadow-xl py-2">
                  <div className="lg:hidden px-4 py-2 border-b border-gray-700 mb-1">
                    <p className="text-xs text-white font-bold">{userProfile.nickname}</p>
                    <p className="text-[10px] text-cyan-400">Lv.{levelInfo.level} {levelInfo.name}</p>
                  </div>
                  <Link href={`/profile?id=${userProfile.id}`} onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-cyan-500/20">个人主页</Link>
                  <Link href="/user-center" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-cyan-500/20">用户中心</Link>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20">退出登录</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <a href="/login" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 md:px-6 md:py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            登录
          </a>
        )}
      </div>
    </nav>
  )
}