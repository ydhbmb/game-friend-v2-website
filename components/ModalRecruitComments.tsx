'use client'

import { useState } from 'react'

interface Props {
  recruit: any
  comments: any[]
  loading: boolean
  onClose: () => void
  onSend: (content: string) => void
}

export default function ModalRecruitComments({ recruit, comments, loading, onClose, onSend }: Props) {
  const [newComment, setNewComment] = useState('')
  if (!recruit) return null

  const handleSend = () => {
    if (!newComment.trim()) return
    onSend(newComment)
    setNewComment('')
  }

  return (
    <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl w-full max-w-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col h-[80vh] max-h-[600px] overflow-hidden">
        <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center bg-[#0A111F]">
          <h3 className="font-bold text-cyan-400 tracking-wider font-orbitron">招募留言</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#050B14]/50">
          {loading ? <p className="text-center text-cyan-500 text-sm mt-4 animate-pulse">解析数据中...</p> : comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user?.avatar_url || '/logo.png'} className="w-8 h-8 rounded border border-gray-600 object-cover bg-black mt-1" />
                <div>
                  <p className="text-xs text-cyan-500 mb-1">{c.user?.nickname}</p>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl rounded-tl-sm px-4 py-2 text-sm text-gray-200 shadow-sm">{c.content}</div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="p-4 border-t border-cyan-500/30 bg-[#0A111F] flex gap-2">
          <input className="flex-1 bg-[#050B14] border border-gray-700 rounded-lg px-4 py-2 outline-none text-sm text-white focus:border-cyan-500" placeholder="输入通讯内容..." value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} className="bg-cyan-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]">发送</button>
        </div>
      </div>
    </div>
  )
}