'use client'

import { useState } from 'react'

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

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return setMsg('请填写标题和内容')
    onSubmit({ title, content })
  }

  return (
    <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A111F] border border-fuchsia-500/50 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-[0_0_30px_rgba(217,70,239,0.2)]">
        <h3 className="text-xl md:text-2xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 text-center tracking-widest font-orbitron">发布讨论帖</h3>
        <input className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 mb-4 text-white outline-none focus:border-fuchsia-500 font-bold" placeholder="帖子标题 (如：求个双排上分攻略)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full bg-[#050B14] border border-gray-700 rounded-lg px-4 py-3 mb-2 text-white outline-none focus:border-fuchsia-500 h-40 resize-none" placeholder="详细内容..." value={content} onChange={(e) => setContent(e.target.value)} />
        <p className="text-[10px] text-gray-500 mb-4">* 发布即代表您同意《网络通信管理条例》，严禁发布违法违规内容。</p>
        {msg && <p className="text-red-500 text-sm mb-4 text-center">{msg}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold">取消</button>
          <button onClick={handleSubmit} className="flex-1 bg-fuchsia-600 text-white py-3 rounded-lg font-bold hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.4)]">确认发布</button>
        </div>
      </div>
    </div>
  )
}