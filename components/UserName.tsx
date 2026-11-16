'use client'

import Link from 'next/link'

interface UserNameProps {
  userId: number | string
  nickname: string
  className?: string
  showLink?: boolean
}

export default function UserName({ userId, nickname, className = '', showLink = true }: UserNameProps) {
  if (!showLink) {
    return <span className={className}>{nickname}</span>
  }

  return (
    <Link 
      href={`/profile?id=${userId}`} 
      className={`hover:text-cyan-400 hover:underline transition-all cursor-pointer ${className}`}
      onClick={(e) => e.stopPropagation()} // 防止在卡片内点击时误触卡片跳转
    >
      {nickname}
    </Link>
  )
}