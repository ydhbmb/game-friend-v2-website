'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

interface Props {
  post: any
  comments: any[]
  loading: boolean
  onClose: () => void
  onSend: (content: string) => void
}

export default function ModalForumDetail({
  post,
  comments,
  loading,
  onClose,
  onSend,
}: Props) {
  const [newComment, setNewComment] = useState('')
  if (!post) return null

  function handleSend() {
    if (!newComment.trim()) return
    onSend(newComment.trim())
    setNewComment('')
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden flex flex-col h-[85vh] max-h-[700px]">

        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
          <h3 className="text-[15px] font-semibold text-[#E8EFF7] leading-snug pr-4">
            {post.title}
          </h3>
          <button
            onClick={onClose}
            className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors shrink-0"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex gap-2.5">
              <img
                src={post.user?.avatar_url || '/logo.png'}
                alt={post.user?.nickname}
                className="w-8 h-8 rounded-full object-cover bg-black shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#94A3B8] mb-1.5">
                  {post.user?.nickname || '未知玩家'}
                </p>
                <p className="text-[14px] text-[#E8EFF7] whitespace-pre-wrap break-words leading-relaxed">
                  {post.content}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-[11.5px] text-[#5C6B7F] mb-3">
              全部回复（{comments.length}）
            </p>

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.05] shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-16 rounded bg-white/[0.05]" />
                      <div className="h-8 w-full rounded-lg bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <EmptyState compact title="还没有回复" description="来占个沙发" />
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <img
                      src={c.user?.avatar_url || '/logo.png'}
                      alt={c.user?.nickname}
                      className="w-7 h-7 rounded-full object-cover bg-black shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#5C6B7F] mb-1 truncate">
                        {c.user?.nickname || '未知玩家'}
                      </p>
                      <div className="rounded-lg rounded-tl-sm bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-[13px] text-[#E8EFF7] whitespace-pre-wrap break-words leading-relaxed">
                        {c.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.06] flex gap-2 shrink-0">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            maxLength={500}
            placeholder="写下你的回复…"
            className="flex-1 h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
          />
          <Button variant="primary" onClick={handleSend} disabled={!newComment.trim()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
