'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState('建议')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return setMsg('请填写反馈内容')
    setLoading(true); setMsg('')

    try {
      // 1. 将反馈内容存入数据库
      const { data: { user } } = await supabase.auth.getUser()
      let userId = null
      if (user) {
        const { data: profile } = await supabase.from('users_profile').select('id').eq('auth_id', user.id).single()
        if (profile) userId = profile.id
      }

      await supabase.from('feedbacks').insert({
        user_id: userId, 
        type, 
        content, 
        contact
      })

      // 2. 调用后端 API 发送邮件
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, contact })
      })

      if (res.ok) {
        setMsg('提交成功！感谢你的反馈！')
        setContent(''); setContact('')
        setTimeout(() => setIsOpen(false), 2000)
      } else {
        setMsg('已存入数据库，但邮件发送失败。')
      }
    } catch (err) {
      setMsg('网络异常，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[100] bg-[#0A111F] border border-cyan-500/50 text-cyan-400 p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-110 transition-all font-bold text-sm flex items-center gap-2"
      >
        💡 建议/报Bug
      </button>

      {/* 弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0A111F] border border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.2)]">
            <h3 className="text-xl font-black text-white mb-4 font-orbitron">系统反馈</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {['建议', 'BUG', '举报'].map(t => (
                  <button 
                    type="button" 
                    key={t} 
                    onClick={() => setType(t)} 
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition ${type === t ? 'bg-cyan-600 text-white border-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400 h-32 resize-none" 
                placeholder="请详细描述你遇到的问题或建议..." 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
              />

              <input 
                className="w-full bg-[#050B14] border border-cyan-900/50 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-400" 
                placeholder="你的联系方式 (选填，方便我们联系你)" 
                value={contact} 
                onChange={(e) => setContact(e.target.value)} 
              />

              {msg && <p className={`text-sm text-center font-bold ${msg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-700 transition"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-500 disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition"
                >
                  {loading ? '发送中...' : '提交反馈'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}