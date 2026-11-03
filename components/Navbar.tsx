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
  
  // 用于点击外部关闭菜单
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchUser()
    
    // 监听点击事件，点击菜单外部关闭菜单
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [pathname])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('users_profile').select('*').eq('auth_id', user.id).single()
      if (data) setUserProfile(data)
    }
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleCheckIn() {
    if (!userProfile) return
    const today = new Date().toISOString().split('T')[0]
    
    if (userProfile.last_checkin_at === today) {
      alert('今天已经签到过啦，明天再来吧！')
      return
    }

    const { error } = await supabase
      .from('users_profile')
      .update({ 
        experience: (userProfile.experience || 0) + 5,
        last_checkin_at: today
      })
      .eq('id', userProfile.id)

    if (!error) {
      alert('签到成功！获得 5 经验！')
      fetchUser() 
    }
  }

  if (pathname === '/login' || pathname === '/register') return null

  const levelInfo = userProfile ? calculateLevel(userProfile.experience || 0, userProfile.id) : null

  return (
    <nav className="bg-[#050B14]/80 backdrop-blur-md border-b border-cyan-900/50 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.png" alt="Wingman Games" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform" />
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hidden sm:block tracking-widest">
            Wingman Games
          </span>
        </Link>

        {userProfile && (
          <button 
            onClick={handleCheckIn}
            className="text-xs bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-3 py-1.5 rounded-full font-bold hover:scale-105 transition shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          >
            📅 签到领经验
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {loading ? (
          <span className="text-cyan-500 text-sm animate-pulse">加载中...</span>
        ) : userProfile && levelInfo ? (
          <div className="flex items-center gap-2 md:gap-3 relative">
            <Link href="/messages" className="text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg transition-all text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20">
              消息
            </Link>
            <Link href="/notifications" className="text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg transition-all text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20">
              通知
            </Link>

            <div className="relative ml-2 pl-4 border-l border-gray-700" ref={menuRef}>
              <div 
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setIsMenuOpen(!isMenuOpen)} // 改为点击触发
              >
                <img src={userProfile.avatar_url || '/logo.png'} className="w-9 h-9 rounded-full object-cover border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                
                <div className="hidden md:flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-200">{userProfile.nickname}</span>
                    <span className="text-[10px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                      Lv.{levelInfo.level}
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-400">
                    {levelInfo.name} | 经验: {userProfile.experience || 0}
                  </span>
                </div>
              </div>
              
              {/* 下拉菜单 */}
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-[#0A111F] border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] py-2 overflow-hidden">
                  <Link href="/user-center" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-cyan-500/20 hover:text-white transition">用户中心</Link>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition">退出登录</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Link href="/login" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            接入网络
          </Link>
        )}
      </div>
    </nav>
  )
}