'use client';

/**
 * app/not-found.tsx —— 自定义 404，可直接整文件新增
 * ------------------------------------------------------------
 * 放到 app/not-found.tsx 即可。Next.js App Router 会自动用它接管
 * 所有未匹配路由（包括 notFound() 调用），替换掉现在那个
 * 英文默认页 "404 This page could not be found"。
 *
 * 风格与站点一致：深色底 #050B14、细白描边、顶部导航、返回首页按钮。
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050B14] text-[#E8EFF7] relative overflow-hidden">
      {/* 背景：网格 + 青色渐晕，和首页同一套语言 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(600px 400px at 50% 42%, rgba(34,211,238,0.10), rgba(34,211,238,0.02) 55%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 顶部导航：最少必要项，保证迷路时能走 */}
        <header className="w-full border-b border-white/[0.06]">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/radar-mark.svg"
                alt="僚机雷达"
                className="w-6 h-6"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-[14px] font-semibold text-[#E8EFF7] group-hover:text-cyan-400 transition-colors">
                僚机雷达
              </span>
            </Link>

            <nav className="flex items-center gap-1 text-[13px]">
              <Link
                href="/moments/"
                className="px-3 h-8 inline-flex items-center rounded-md text-[#94A3B8] hover:text-[#E8EFF7] hover:bg-white/[0.05] transition-colors"
              >
                广场
              </Link>
              <Link
                href="/teams/"
                className="px-3 h-8 inline-flex items-center rounded-md text-[#94A3B8] hover:text-[#E8EFF7] hover:bg-white/[0.05] transition-colors"
              >
                战队
              </Link>
            </nav>
          </div>
        </header>

        {/* 主体 */}
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-[520px]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0A111F]/70 backdrop-blur-sm px-7 py-10 md:px-10 md:py-12 text-center">
              <p
                className="text-[76px] md:text-[92px] leading-none font-black tracking-tight text-transparent bg-clip-text select-none"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, rgba(34,211,238,0.9), rgba(34,211,238,0.15))',
                }}
              >
                404
              </p>

              <h1 className="mt-5 text-[19px] md:text-[21px] font-semibold text-[#E8EFF7]">
                这个节点还没被点亮
              </h1>

              <p className="mt-2.5 text-[13px] leading-relaxed text-[#8A97A8]">
                页面可能已被移动、改名，或者链接打错了。
                <br className="hidden sm:block" />
                回到大厅看看，还有别的搭子在等你。
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-cyan-600 text-white text-[13px] font-semibold hover:bg-cyan-500 transition-colors"
                >
                  返回首页
                </Link>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[#E8EFF7] text-[13px] font-medium hover:bg-white/[0.09] transition-colors"
                >
                  回到上一页
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <p className="text-[11.5px] text-[#5C6B7F]">或者去这些地方</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12.5px]">
                  <Link
                    href="/moments/"
                    className="text-[#94A3B8] hover:text-cyan-400 transition-colors"
                  >
                    广场动态
                  </Link>
                  <span className="text-white/10">·</span>
                  <Link
                    href="/teams/"
                    className="text-[#94A3B8] hover:text-cyan-400 transition-colors"
                  >
                    我的战队
                  </Link>
                  <span className="text-white/10">·</span>
                  <Link
                    href="/notifications/"
                    className="text-[#94A3B8] hover:text-cyan-400 transition-colors"
                  >
                    通知
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-[#3F4A58]">
              如果是从站内链接点进来的，说明那个链接该修了 — 可以反馈给我们。
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
