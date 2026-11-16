'use client'

interface Props {
  search: string
  setSearch: (val: string) => void
  onSearch: () => void
  loading: boolean
  onCreateClick: () => void
}

export default function GameFilter({ search, setSearch, onSearch, loading, onCreateClick }: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
      <h2 className="text-2xl md:text-3xl font-black text-white tracking-wider flex items-center gap-3 font-orbitron">
        <span className="w-2 h-6 md:h-8 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,1)]"></span>
        游戏雷达接入点
      </h2>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <div className="flex-1 md:flex-none flex items-center bg-[#0A111F]/80 backdrop-blur-md border border-cyan-900/50 rounded-xl px-3 py-2 md:py-3 focus-within:border-cyan-400 transition-all">
          <span className="text-cyan-500 mr-2">🔍</span>
          <input className="bg-transparent border-none outline-none w-full md:w-56 text-xs md:text-sm text-white placeholder-gray-600" placeholder="搜索主游戏..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
        </div>
        <button onClick={onCreateClick} disabled={loading} className="bg-blue-600 text-white px-4 py-2 md:py-3 rounded-xl font-black text-xs md:text-sm hover:bg-blue-500 transition-all whitespace-nowrap">
          + 创建
        </button>
      </div>
    </div>
  )
}