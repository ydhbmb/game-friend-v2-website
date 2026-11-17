'use client'

import Button from '@/components/ui/Button'

interface Props {
  search: string
  setSearch: (val: string) => void
  onSearch: (keyword?: string) => void
  loading: boolean
  onCreateClick: () => void
}

export default function GameFilter({
  search,
  setSearch,
  onSearch,
  loading,
  onCreateClick,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="flex items-center flex-1 min-w-0 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] focus-within:border-cyan-500/50 transition-colors px-3">
        <span className="text-[#5C6B7F] text-[11px] mr-2.5 shrink-0">搜索</span>
        <input
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[#E8EFF7] placeholder-[#4A5768]"
          placeholder="输入游戏名称…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        {search && (
          <button
            onClick={() => {
              setSearch('')
              onSearch('')
            }}
            className="text-[#4A5768] hover:text-[#94A3B8] text-[11px] px-1 shrink-0 transition-colors"
            aria-label="清除搜索"
          >
            清除
          </button>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <Button variant="secondary" onClick={() => onSearch()} disabled={loading}>
          检索
        </Button>
        <Button variant="primary" onClick={onCreateClick}>
          新建节点
        </Button>
      </div>
    </div>
  )
}
