'use client'

import UserName from '@/components/UserName'
import { calculateLevel } from '@/lib/levels'

interface Props {
  leaderboard: any[]
  loading?: boolean
}

export default function Leaderboard({ leaderboard, loading = false }: Props) {
  return (
    <aside className="w-full lg:w-[268px] xl:w-[288px] shrink-0">
      <div className="rounded-xl border border-white/[0.06] bg-[#0A111F]/70 lg:sticky lg:top-24 overflow-hidden">
        <div className="flex items-baseline justify-between px-3.5 pt-3.5 pb-2.5 border-b border-white/[0.06]">
          <h2 className="text-[13px] font-semibold text-[#E8EFF7]">荣耀排行</h2>
          <span className="text-[10.5px] text-[#5C6B7F] tabular-nums">
            {loading ? '同步中' : `TOP ${leaderboard.length}`}
          </span>
        </div>

        <div className="p-1.5">
          {loading ? (
            <div className="space-y-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2.5 px-2.5 h-[46px]">
                  <div className="w-3 h-2 rounded bg-white/[0.05]" />
                  <div className="w-7 h-7 rounded-full bg-white/[0.05]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-20 rounded bg-white/[0.05]" />
                    <div className="h-2 w-12 rounded bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-[11.5px] text-[#4A5768] py-8">
              暂无排行数据
            </p>
          ) : (
            leaderboard.map((user, index) => {
              const lvl = calculateLevel(user.experience, user.id)
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 px-2.5 h-[46px] rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <span
                    className={`w-3.5 text-center text-[11px] font-mono tabular-nums shrink-0 ${
                      index < 3 ? 'text-cyan-400' : 'text-[#4A5768]'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="relative shrink-0">
                    <img
                      src={user.avatar_url || '/logo.png'}
                      alt={user.nickname}
                      className="w-7 h-7 rounded-full object-cover bg-black"
                    />
                    {user.id === 1 && (
                      <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">
                        👑
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <UserName
                      userId={user.id}
                      nickname={user.nickname}
                      className="text-[12.5px] font-medium text-[#E8EFF7] truncate block leading-tight"
                    />
                    <p className="text-[10px] text-[#5C6B7F] truncate leading-tight mt-0.5">
                      Lv.{lvl.level} · {lvl.name}
                    </p>
                  </div>

                  <span className="text-[11px] text-[#94A3B8] font-mono tabular-nums shrink-0">
                    {user.experience}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
