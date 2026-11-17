'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

export default function ModalPostForum({ isOpen, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState('')

  if (!isOpen) return null

  function reset() {
    setTitle('')
    setContent('')
    setMsg('')
  }

  function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      return setMsg('请填写标题和内容')
    }
    onSubmit({ title: title.trim(), content: content.trim() })
    reset()
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <h3 className="text-[15px] font-semibold text-[#E8EFF7]">发布讨论帖</h3>
          <button
            onClick={() => { reset(); onClose() }}
            className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              标题 <span className="text-red-400/70">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="如：双排上分找队友，主玩辅助"
              className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              内容 <span className="text-red-400/70">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder="详细说说你的想法…"
              className="w-full h-40 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
            />
            <p className="text-[10.5px] text-[#4A5768] mt-1 tabular-nums text-right">
              {content.length} / 2000
            </p>
          </div>

          <p className="text-[10.5px] text-[#4A5768] leading-relaxed">
            发布即表示你同意遵守平台规范，严禁发布违法违规内容。
          </p>

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
