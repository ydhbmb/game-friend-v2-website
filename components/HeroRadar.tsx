'use client';

/**
 * 僚机雷达 · 主视觉（方案 C：动效主视觉）
 * ------------------------------------------------------------
 * 单文件、零依赖：不需要 styled-jsx、不需要改 globals.css、不需要装包。
 * 直接把这个文件放进 components/HeroRadar.tsx 即可食用。
 *
 * 用法：
 *   import HeroRadar from '@/components/HeroRadar';
 *   <HeroRadar />
 *
 * 替换掉原来那一行 <img src="/banner.png" alt="Wingman Radar" />
 */

const ACCENT = '#22D3EE';

export default function HeroRadar() {
  return (
    <section className="hr-root" aria-labelledby="hr-title">
      <div className="hr-grid" aria-hidden="true" />
      <div className="hr-glow" aria-hidden="true" />
      <div className="hr-fade" aria-hidden="true" />

      <div className="hr-inner">
        <div className="hr-copy">
          <p className="hr-eyebrow">WINGMAN RADAR</p>

          <h1 id="hr-title" className="hr-title">
            <span className="hr-title-text">僚机雷达</span>
            {/* 扫光：复制一层文字，用背景裁切到字形，光只掠过笔画 */}
            <span className="hr-title-scan" aria-hidden="true">
              僚机雷达
            </span>
          </h1>

          <span className="hr-rule" aria-hidden="true" />

          <p className="hr-sub">精准匹配你的神级游戏搭子</p>

          <div className="hr-actions">
            <a className="hr-btn hr-btn-primary" href="/moments/">
              开始匹配
            </a>
            <a className="hr-btn hr-btn-ghost" href="/moments/">
              浏览招募
            </a>
          </div>
        </div>

        <div className="hr-radar" aria-hidden="true">
          <svg viewBox="-160 -160 320 320" className="hr-radar-svg">
            <defs>
              <radialGradient id="hrSweep" cx="0" cy="0" r="134" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={ACCENT} stopOpacity="0.3" />
                <stop offset="0.45" stopColor={ACCENT} stopOpacity="0.13" />
                <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="hrCore" cx="0" cy="0" r="70" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={ACCENT} stopOpacity="0.35" />
                <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle r="70" fill="url(#hrCore)" />

            <circle r="50" fill="none" stroke={ACCENT} strokeOpacity="0.16" strokeWidth="1" />
            <circle r="92" fill="none" stroke={ACCENT} strokeOpacity="0.12" strokeWidth="1" />
            <circle r="134" fill="none" stroke={ACCENT} strokeOpacity="0.09" strokeWidth="1" />

            <path d="M-152 0H152M0 -152V152" stroke="#fff" strokeOpacity="0.05" strokeWidth="1" />
            <path d="M-96 -96L96 96M96 -96L-96 96" stroke="#fff" strokeOpacity="0.028" strokeWidth="1" />

            <g stroke={ACCENT} strokeOpacity="0.3" strokeWidth="1">
              <path d="M0 -152V-142" />
              <path d="M76 -131.6V-122.2" />
              <path d="M131.6 -76H122.2" />
              <path d="M152 0H142" />
              <path d="M131.6 76H122.2" />
              <path d="M76 131.6V122.2" />
              <path d="M0 152V142" />
              <path d="M-76 131.6V122.2" />
              <path d="M-131.6 76H-122.2" />
              <path d="M-152 0H-142" />
              <path d="M-131.6 -76H-122.2" />
              <path d="M-76 -131.6V-122.2" />
            </g>

            <g className="hr-sweep">
              <path d="M0 0 L0 -134 A134 134 0 0 1 116 -67 Z" fill="url(#hrSweep)" />
              <path d="M0 0 L0 -134" stroke="#5FE8FA" strokeOpacity="0.55" strokeWidth="1.2" />
            </g>

            <g fill={ACCENT}>
              <circle cx="-58" cy="-40" r="3.2" />
              <circle
                cx="-58"
                cy="-40"
                r="3.2"
                fill="none"
                stroke={ACCENT}
                strokeWidth="1"
                className="hr-blip"
              />
              <circle cx="44" cy="56" r="3.2" />
              <circle
                cx="44"
                cy="56"
                r="3.2"
                fill="none"
                stroke={ACCENT}
                strokeWidth="1"
                className="hr-blip hr-blip-delay"
              />
              <circle cx="86" cy="-24" r="2.4" opacity="0.75" />
            </g>

            <circle r="3.4" fill="#EAFBFF" />
            <circle r="7" fill="none" stroke={ACCENT} strokeOpacity="0.5" strokeWidth="1" />
          </svg>
        </div>
      </div>

      <style>{`
        .hr-root {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: #04070a;
        }
        .hr-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(255, 255, 255, 0.026) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.026) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .hr-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(
            420px 420px at 73% 50%,
            rgba(34, 211, 238, 0.13),
            rgba(34, 211, 238, 0.035) 55%,
            transparent 100%
          );
        }
        .hr-fade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(4, 7, 10, 0) 55%,
            rgba(4, 7, 10, 0.85) 100%
          );
        }

        .hr-inner {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(280px, 38%, 460px);
          align-items: center;
          gap: 24px;
          padding: 56px 56px 64px;
          min-height: 380px;
        }
        .hr-copy { max-width: 560px }

        .hr-eyebrow {
          margin: 0 0 18px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.66em;
          color: #22d3ee;
          opacity: 0.92;
        }

        .hr-title {
          position: relative;
          margin: 0;
          display: inline-block;
          font-size: clamp(44px, 6.2vw, 78px);
          font-weight: 900;
          letter-spacing: -0.012em;
          line-height: 1.06;
          color: #f2f6f8;
        }
        .hr-title-text { position: relative; z-index: 1 }

        .hr-title-scan {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          white-space: nowrap;
          color: transparent;
          -webkit-text-fill-color: transparent;
          background-image: linear-gradient(
            100deg,
            rgba(184, 245, 255, 0) 40%,
            rgba(220, 250, 255, 0.95) 50%,
            rgba(184, 245, 255, 0) 60%
          );
          background-size: 260% 100%;
          background-repeat: no-repeat;
          -webkit-background-clip: text;
          background-clip: text;
          animation: hrScan 4.2s linear infinite;
        }

        .hr-rule {
          display: block;
          width: 54px;
          height: 3px;
          margin: 22px 0 0;
          background: #22d3ee;
        }

        .hr-sub {
          margin: 20px 0 0;
          font-size: 17px;
          letter-spacing: 0.09em;
          color: #a9b3ba;
        }

        .hr-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }
        .hr-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 50px;
          padding: 0 30px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease,
            border-color 0.16s ease, color 0.16s ease;
        }
        .hr-btn-primary { background: #22d3ee; color: #03151c }
        .hr-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 26px rgba(34, 211, 238, 0.26);
        }
        .hr-btn-ghost {
          border: 1px solid #2a3238;
          color: #c6d0d6;
          font-weight: 500;
          background: transparent;
        }
        .hr-btn-ghost:hover { border-color: rgba(34, 211, 238, 0.5); color: #eafbff }

        .hr-radar {
          justify-self: end;
          width: 100%;
          max-width: 420px;
          aspect-ratio: 1;
        }
        .hr-radar-svg { width: 100%; height: 100%; display: block }

        .hr-sweep {
          animation: hrSpin 3.6s linear infinite;
          transform-origin: 0 0;
        }
        .hr-blip {
          transform-box: fill-box;
          transform-origin: center;
          animation: hrBlip 2.4s ease-out infinite;
        }
        .hr-blip-delay { animation-delay: 1.1s }

        @keyframes hrSpin {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }
        @keyframes hrBlip {
          0%   { transform: scale(1);   opacity: 0.9 }
          70%  { transform: scale(5.2); opacity: 0 }
          100% { transform: scale(5.2); opacity: 0 }
        }
        @keyframes hrScan {
          0%   { background-position: 190% 0 }
          100% { background-position: -90% 0 }
        }

        @media (max-width: 900px) {
          .hr-inner {
            grid-template-columns: 1fr;
            padding: 40px 28px 48px;
            min-height: 0;
            gap: 8px;
          }
          .hr-radar {
            justify-self: center;
            max-width: 260px;
            grid-row: 1;
            opacity: 0.9;
          }
          .hr-title { font-size: clamp(38px, 10vw, 56px) }
          .hr-eyebrow { letter-spacing: 0.5em }
          .hr-actions { margin-top: 28px }
          .hr-btn { flex: 1 1 auto; padding: 0 20px }
        }

        @media (prefers-reduced-motion: reduce) {
          .hr-sweep, .hr-blip, .hr-title-scan { animation: none }
          .hr-title-scan { opacity: 0 }
          .hr-btn { transition: none }
        }
      `}</style>
    </section>
  );
}

/**
 * 导航栏 / 页脚用的小图标（可选）。
 * <RadarMark size={32} />
 */
export function RadarMark({ size = 32 }: { size?: number }) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="僚机雷达"
        style={{ display: 'block', flex: 'none' }}
      >
        <defs>
          <radialGradient id="rmGlow" cx="32" cy="32" r="26" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={ACCENT} stopOpacity="0.22" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rmSweep" cx="32" cy="32" r="26" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={ACCENT} stopOpacity="0.55" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="26" fill="url(#rmGlow)" />
        <circle
          cx="32"
          cy="32"
          r="10"
          fill="none"
          stroke={ACCENT}
          strokeOpacity="0.45"
          strokeWidth="1.4"
        />
        <circle
          cx="32"
          cy="32"
          r="18"
          fill="none"
          stroke={ACCENT}
          strokeOpacity="0.26"
          strokeWidth="1.2"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={ACCENT}
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
        <g className="rm-sweep">
          <path d="M32 32 L32 6 A26 26 0 0 1 54.5 19 Z" fill="url(#rmSweep)" />
        </g>
        <circle cx="32" cy="32" r="3.2" fill="#EAFBFF" />
        <circle cx="22" cy="24" r="2.1" fill={ACCENT} />
        <circle cx="40" cy="41" r="1.7" fill={ACCENT} opacity="0.8" />
        <style>{`
          .rm-sweep {
            animation: rmSpin 3.6s linear infinite;
            transform-origin: 32px 32px;
          }
          @keyframes rmSpin {
            from { transform: rotate(0deg) }
            to { transform: rotate(360deg) }
          }
          @media (prefers-reduced-motion: reduce) {
            .rm-sweep { animation: none }
          }
        `}</style>
      </svg>
    </>
  );
}
