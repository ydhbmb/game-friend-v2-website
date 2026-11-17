'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState('建议')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return setMsg('请填写反馈内容')

    setLoading(true)
    setMsg('')
    setOk(false)

    const { data: { user } } = await supabase.auth.getUser()
    let userId: number | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()
      if (profile) userId = profile.id
    }

    const { error } = await supabase.from('feedbacks').insert({
      user_id: userId,
      type,
      content: content.trim(),
      contact: contact.trim(),
    })

    setLoading(false)

    if (error) {
      setMsg('提交失败：' + error.message)
      return
    }

    setOk(true)
    setMsg('已收到，感谢反馈')
    setContent('')
    setContact('')
    setTimeout(() => setIsOpen(false), 1800)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[100] h-9 px-3.5 rounded-lg bg-[#0A111F] border border-white/[0.1] text-[12px] text-[#94A3B8] hover:text-[#E8EFF7] hover:bg-[#0D1626] transition-colors"
      >
        反馈
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-[#E8EFF7]">反馈</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-3">
                <div className="flex gap-2">
                  {['建议', 'BUG', '举报'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`h-8 px-3 rounded-md text-[12px] font-medium border transition-colors ${
                        type === t
                          ? 'bg-cyan-500/12 text-cyan-300 border-cyan-500/30'
                          : 'bg-transparent text-[#5C6B7F] border-white/[0.08] hover:text-[#94A3B8] hover:border-white/[0.14]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                  placeholder="详细描述你遇到的问题或建议…"
                  className="w-full h-28 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors resize-none"
                />

                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={60}
                  placeholder="联系方式（选填）"
                  className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
                />

                {msg && (
                  <p
                    className={`text-[11.5px] rounded-lg px-3 py-2 border ${
                      ok
                        ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    {msg}
                  </p>
                )}
              </div>

              <div className="px-5 pb-4 pt-1 flex gap-2">
                <Button variant="ghost" full type="button" onClick={() => setIsOpen(false)}>
                  取消
                </Button>
                <Button variant="primary" full type="submit" loading={loading}>
                  提交
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
