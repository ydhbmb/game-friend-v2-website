'use client'

import UserName from '@/components/UserName'
import { calculateLevel } from '@/lib/levels'

interface Props {
  leaderboard: any[]
}

export default function Leaderboard({ leaderboard }: Props) {
  return (
    <div className="w-full lg:w-1/4 flex-shrink-0">
      <div className="bg-[#0A111F]/80 backdrop-blur-xl border border-cyan-900/50 rounded-2xl p-5 shadow-lg lg:sticky lg:top-24">
        <div className="flex items-center gap-2 mb-6 border-b border-cyan-900/50 pb-4">
          <span className="text-xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">🏆</span>
          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider font-orbitron">荣耀排行榜</h2>
        </div>
        
        <div className="space-y-2">
          {leaderboard.map((user, index) => {
            const lvl = calculateLevel(user.experience, user.id)
            const isTop1 = index === 0
            const isTop2 = index === 1
            const isTop3 = index === 2
            
            return (
              <div key={user.id} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all hover:translate-x-1 ${
                  isTop1 ? 'bg-gradient-to-r from-yellow-500/20 to-transparent border border-yellow-500/30' : 
                  isTop2 ? 'bg-gradient-to-r from-gray-300/10 to-transparent border border-gray-400/20' :
                  isTop3 ? 'bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20' :
                  'hover:bg-cyan-900/30'
                }`}>
                <div className={`w-6 text-center font-black italic font-orbitron ${
                  isTop1 ? 'text-yellow-400 text-2xl' : 
                  isTop2 ? 'text-gray-300 text-xl' : 
                  isTop3 ? 'text-orange-400 text-xl' : 'text-gray-600'
                }`}>{index + 1}</div>
                <div className="relative">
                  <img src={user.avatar_url || '/logo.png'} className="w-10 h-10 rounded-full border-2 border-gray-700 object-cover" />
                  {user.id === 1 && <span className="absolute -top-3 -left-2 text-sm drop-shadow-md">👑</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <UserName userId={user.id} nickname={user.nickname} className={`text-sm font-bold truncate ${isTop1 ? 'text-yellow-400' : 'text-gray-200'}`} />
                    <span className="text-[10px] font-orbitron font-bold bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap">Lv.{lvl.level}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[10px] text-gray-400 font-mono truncate">{lvl.icon} {lvl.name}</p>
                    <p className="text-[10px] text-cyan-500 font-orbitron font-bold whitespace-nowrap">EXP:{user.experience}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}