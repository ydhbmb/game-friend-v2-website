'use client';

/**
 * app/page.tsx —— 可直接整文件替换
 * ------------------------------------------------------------
 * 与你的原版逻辑完全一致（同一套 supabase 查询、同一个新建弹窗、
 * 同样的加载骨架 / 空状态），唯一改动：
 *
 *   原来的  <img src="/banner.png" alt="Wingman Radar" className="w-full max-w-2xl ..." />
 *   换成    <HeroRadar />
 *
 * 如果下面这 3 行 import 的路径和你项目不一致，保留你原来的那 3 行即可：
 *   import { supabase } from '@/lib/supabase';
 *   import Header from '@/components/Header';
 *   import CreateGameModal from '@/components/CreateGameModal';
 * （其余 4 个小组件我已经内联进本文件，不再需要 import）
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import CreateGameModal from '@/components/CreateGameModal';
import HeroRadar from '@/components/HeroRadar';

/* ── 类型 ───────────────────────────────────────────────── */
type Profile = {
  id: number;
  auth_id: string;
  nickname: string;
  avatar_url: string | null;
  experience: number;
};

type Game = {
  id: number;
  name: string;
  cover_url: string | null;
  parent_id: number | null;
  created_at: string;
  creator?: { nickname: string } | null;
};

type RankRow = {
  id: number;
  nickname: string;
  avatar_url: string | null;
  experience: number;
};

/* ── 等级换算（与你 lib 里的 p(experience, id) 行为一致） ── */
function levelOf(experience: number, _id?: number) {
  const lv = Math.floor(Math.sqrt(Math.max(experience, 0) / 100)) + 1;
  const names = [
    '初出茅庐',
    '略有小成',
    '登堂入室',
    '渐入佳境',
    '炉火纯青',
    '出神入化',
    '知名豆豆',
    '人气豆豆',
    '传奇豆豆',
    '荣耀豆豆',
  ];
  return { level: lv, name: names[Math.min(lv - 1, names.length - 1)] };
}

/* ── 内联小组件：SectionHeader（原 components/SectionHeader） ── */
function SectionHeader({
  children,
  count,
  action,
  className = '',
}: {
  children: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 mb-3 ${className}`}>
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#E8EFF7]">
        <span className="w-[3px] h-[14px] rounded-full bg-cyan-400/80" />
        {children}
      </h2>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-[11px] text-[#5C6B7F] tabular-nums">{count}</span>
        )}
        {action}
      </div>
    </div>
  );
}

/* ── 内联小组件：EmptyState（原 components/EmptyState） ── */
function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-white/[0.08] text-center ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <p className="text-[13px] text-[#5C6B7F]">{title}</p>
      {description && <p className="text-[11.5px] text-[#4A5768] mt-1.5">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── 内联小组件：Button（原 components/ui/Button） ── */
function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  full = false,
  type = 'button',
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  className?: string;
}) {
  const sizeCls = { sm: 'h-8 px-3 text-[12px]', md: 'h-10 px-4 text-[13px]' };
  const variantCls = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-500',
    secondary:
      'bg-white/[0.05] text-[#E8EFF7] border border-white/[0.1] hover:bg-white/[0.09]',
    ghost: 'bg-transparent text-[#94A3B8] hover:bg-white/[0.05] hover:text-[#E8EFF7]',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap',
        sizeCls[size],
        variantCls[variant],
        full ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? '处理中…' : children}
    </button>
  );
}

/* ── 内联小组件：UserLink（原 components/UserLink） ── */
function UserLink({
  userId,
  nickname,
  className = '',
  showLink = true,
}: {
  userId: number;
  nickname: string;
  className?: string;
  showLink?: boolean;
}) {
  if (!showLink) return <span className={className}>{nickname}</span>;
  return (
    <Link
      href={`/profile?id=${userId}`}
      className={`hover:text-cyan-400 hover:underline transition-all cursor-pointer ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {nickname}
    </Link>
  );
}

/* ── 荣耀排行侧栏 ───────────────────────────────────────── */
function Leaderboard({
  leaderboard,
  loading = false,
}: {
  leaderboard: RankRow[];
  loading?: boolean;
}) {
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
            <p className="text-center text-[11.5px] text-[#4A5768] py-8">暂无排行数据</p>
          ) : (
            leaderboard.map((item, index) => {
              const lv = levelOf(item.experience, item.id);
              return (
                <div
                  key={item.id}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.avatar_url || '/logo.png'}
                      alt={item.nickname}
                      className="w-7 h-7 rounded-full object-cover bg-black"
                    />
                    {item.id === 1 && (
                      <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none">
                        👑
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <UserLink
                      userId={item.id}
                      nickname={item.nickname}
                      className="text-[12.5px] font-medium text-[#E8EFF7] truncate block leading-tight"
                    />
                    <p className="text-[10px] text-[#5C6B7F] truncate leading-tight mt-0.5">
                      Lv.{lv.level} · {lv.name}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] font-mono tabular-nums shrink-0">
                    {item.experience}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── 搜索 + 新建节点 工具条 ─────────────────────────────── */
function HallToolbar({
  search,
  setSearch,
  onSearch,
  loading,
  onCreateClick,
}: {
  search: string;
  setSearch: (v: string) => void;
  onSearch: () => void;
  loading: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="flex items-center flex-1 min-w-0 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] focus-within:border-cyan-500/50 transition-colors px-3">
        <span className="text-[#5C6B7F] text-[11px] mr-2.5 shrink-0">搜索</span>
        <input
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[#E8EFF7] placeholder-[#4A5768]"
          placeholder="输入游戏名称…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              onSearch();
            }}
            className="text-[#4A5768] hover:text-[#94A3B8] text-[11px] px-1 shrink-0 transition-colors"
            aria-label="清除搜索"
          >
            清除
          </button>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="secondary" onClick={onSearch} disabled={loading}>
          检索
        </Button>
        <Button variant="primary" onClick={onCreateClick}>
          新建节点
        </Button>
      </div>
    </div>
  );
}

/* ══════════════ 页面 ─═════════════ */
export default function HomePage() {
  const [user, setUser] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankRow[]>([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [rankLoading, setRankLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  async function fetchGames(keyword: string = '') {
    setGamesLoading(true);
    let query = supabase
      .from('games')
      .select('*, creator:users_profile(nickname)')
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (keyword) query = query.ilike('name', `%${keyword}%`);

    const { data } = await query;
    if (data) setGames(data as Game[]);
    setAppliedSearch(keyword);
    setGamesLoading(false);
  }

  useEffect(() => {
    (async () => {
      // 当前登录用户
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();
        if (profile) setUser(profile as Profile);
      }

      await fetchGames();

      // 荣耀排行 TOP 10
      const { data: ranks } = await supabase
        .from('users_profile')
        .select('id, nickname, avatar_url, experience')
        .order('experience', { ascending: false })
        .limit(10);
      if (ranks) setLeaderboard(ranks as RankRow[]);
      setRankLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] relative overflow-hidden">
      {/* 背景图 + 渐变遮罩 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050B14]/70 via-[#050B14]/92 to-[#050B14]" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 md:pt-8 pb-16">
          {/* ══ 主视觉：原来是 <img src="/banner.png" />，现在换成动效雷达 ══ */}
          <div className="w-full mb-7 md:mb-9">
            <HeroRadar />
          </div>

          <div className="flex flex-col lg:flex-row gap-5 lg:gap-7">
            <Leaderboard leaderboard={leaderboard} loading={rankLoading} />

            <div className="w-full lg:flex-1 min-w-0">
              <SectionHeader
                count={gamesLoading ? '同步中' : `${games.length} 个节点`}
              >
                游戏大厅
              </SectionHeader>

              <HallToolbar
                search={search}
                setSearch={setSearch}
                onSearch={() => fetchGames(search)}
                loading={gamesLoading}
                onCreateClick={() => setCreateOpen(true)}
              />

              {gamesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]"
                    >
                      <div className="aspect-video bg-white/[0.03]" />
                      <div className="p-3.5 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-white/[0.05]" />
                        <div className="h-2.5 w-1/3 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : games.length === 0 ? (
                <EmptyState
                  title={
                    appliedSearch
                      ? `没有找到「${appliedSearch}」相关的游戏`
                      : '还没有游戏节点'
                  }
                  description={
                    appliedSearch
                      ? '换个关键词试试，或者直接创建一个新节点'
                      : '创建第一个节点，开始召集搭子'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {games.map((game) => (
                    <Link
                      key={game.id}
                      href={`/game?id=${game.id}`}
                      className="group rounded-xl overflow-hidden border border-white/[0.06] bg-[#0A111F]/60 hover:border-white/[0.14] hover:bg-[#0D1626] transition-colors"
                    >
                      <div className="aspect-video w-full bg-black/50 relative overflow-hidden">
                        {game.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={game.cover_url}
                            alt={game.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/15">
                            暂无封面
                          </div>
                        )}
                      </div>
                      <div className="p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[14px] font-semibold text-[#E8EFF7] truncate">
                            {game.name}
                          </h3>
                          <span className="text-[#5C6B7F] group-hover:text-cyan-400 transition-colors text-[11px] shrink-0">
                            →
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C6B7F] mt-1 truncate">
                          {game.creator?.nickname
                            ? `创建者 ${game.creator.nickname}`
                            : '未知创建者'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <CreateGameModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => fetchGames(appliedSearch)}
          currentUserId={user?.id}
        />
      </div>
    </div>
  );
}
