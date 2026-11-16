'use client'

import { useState } from 'react'

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

  const handleSubmit = () => {
    // 测试拦截
    if (!playContent || !onlineTime || !platform || !serverRegion) {
      return setMsg('请填写完整的主玩内容、在线时间、平台和区服')
    }
    
    // 🔥 触发提交，把数据传回给主页面
    onSubmit({ playContent, onlineTime, personality, platform, serverRegion })
    
    // 重置状态
    setPlayContent('')
    setOnlineTime('')
    setPersonality('')
    setPlatform('')
    setServerRegion('')
    setMsg('')
  }

  return (
    <div className="fixed inset-0 bg-[#050B14]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 md:p-8 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
        <h3 className="text-xl md:text-2xl font-black mb-6 text-white text-center tracking-widest font-orbitron">发布赛博通缉令</h3>
        
        <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="主玩内容 (如：排位上分)" value={playContent} onChange={(e) => setPlayContent(e.target.value)} />
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="游戏平台 (如：Steam)" value={platform} onChange={(e) => setPlatform(e.target.value)} />
          <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 text-white outline-none focus:border-cyan-500" placeholder="大区/区服 (如：亚服)" value={serverRegion} onChange={(e) => setServerRegion(e.target.value)} />
        </div>
        
        <input className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500" placeholder="在线时间 (如：每晚 8点)" value={onlineTime} onChange={(e) => setOnlineTime(e.target.value)} />
        
        <textarea className="w-full bg-[#050B14] border border-cyan-900/50 rounded-lg px-4 py-2.5 mb-4 text-white outline-none focus:border-cyan-500 h-24 resize-none" placeholder="战术要求 (选填)" value={personality} onChange={(e) => setPersonality(e.target.value)} />
        
        {msg && <p className="text-red-500 text-sm mb-4 text-center">{msg}</p>}
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold">取消</button>
          <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)]">确认发布</button>
        </div>
      </div>
    </div>
  )
}