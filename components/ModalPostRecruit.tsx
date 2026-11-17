'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

export default function ModalPostRecruit({ isOpen, onClose, onSubmit }: Props) {
  const [playContent, setPlayContent] = useState('')
  const [onlineTime, setOnlineTime] = useState('')
  const [personality, setPersonality] = useState('')
  const [platform, setPlatform] = useState('')
  const [serverRegion, setServerRegion] = useState('')
  const [msg, setMsg] = useState('')

  if (!isOpen) return null

  function reset() {
    setPlayContent('')
    setOnlineTime('')
    setPersonality('')
    setPlatform('')
    setServerRegion('')
    setMsg('')
  }

  function handleSubmit() {
    if (
      !playContent.trim() ||
      !onlineTime.trim() ||
      !platform.trim() ||
      !serverRegion.trim()
    ) {
      return setMsg('请填写主玩内容、平台、区服和在线时间')
    }
    onSubmit({
      playContent: playContent.trim(),
      onlineTime: onlineTime.trim(),
      personality: personality.trim(),
      platform: platform.trim(),
      serverRegion: serverRegion.trim(),
    })
    reset()
  }

  const inputCls =
    'w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors'

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <h3 className="text-[15px] font-semibold text-[#E8EFF7]">发布招募</h3>
          <button
            onClick={() => { reset(); onClose() }}
            className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              主玩内容 <span className="text-red-400/70">*</span>
            </label>
            <input
              value={playContent}
              onChange={(e) => setPlayContent(e.target.value)}
              maxLength={60}
              placeholder="如：排位上分、想找固定队友"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                平台 <span className="text-red-400/70">*</span>
              </label>
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                maxLength={20}
                placeholder="Steam / PS5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                大区 / 区服 <span className="text-red-400/70">*</span>
              </label>
              <input
                value={serverRegion}
                onChange={(e) => setServerRegion(e.target.value)}
                maxLength={20}
                placeholder="亚服 / 华东"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              在线时间 <span className="text-red-400/70">*</span>
            </label>
            <input
              value={onlineTime}
              onChange={(e) => setOnlineTime(e.target.value)}
              maxLength={40}
              placeholder="如：每晚 20:00 - 23:00"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              补充要求 <span className="text-[#4A5768]">（可选）</span>
            </label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              maxLength={200}
              placeholder="段位要求、语音、脾气偏好等"
              className="w-full h-20 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
            />
          </div>

          {msg && (
            <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}
        </div>

        <div className="px-5 pb-4 pt-1 flex gap-2">
          <Button variant="ghost" full onClick={() => { reset(); onClose() }}>
            取消
          </Button>
          <Button variant="primary" full onClick={handleSubmit}>
            发布
          </Button>
        </div>
      </div>
    </div>
  )
}
