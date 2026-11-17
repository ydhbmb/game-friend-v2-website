'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserId?: number
  defaultParentId?: number
  lockParent?: boolean
}

export default function ModalCreateGame({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  defaultParentId,
  lockParent = false,
}: Props) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [parents, setParents] = useState<any[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setParentId(defaultParentId ? String(defaultParentId) : '')
    supabase
      .from('games')
      .select('id, name')
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setParents(data)
      })
  }, [isOpen, defaultParentId])

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      setMsg('封面不能超过 500KB')
      e.target.value = ''
      return
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setMsg('')
  }

  function reset() {
    setName('')
    setParentId('')
    setCoverFile(null)
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverPreview('')
    setMsg('')
  }

  function close() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!currentUserId) {
      setMsg('请先登录')
      return
    }
    const trimmed = name.trim()
    if (!trimmed) {
      setMsg('请填写游戏名称')
      return
    }
    if (trimmed.length > 30) {
      setMsg('名称最多 30 个字')
      return
    }

    setSubmitting(true)
    setMsg('')

    let coverUrl: string | null = null

    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const fileName = `cover-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('game_covers')
        .upload(fileName, coverFile)

      if (upErr) {
        setSubmitting(false)
        setMsg('封面上传失败：' + upErr.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from('game_covers')
        .getPublicUrl(fileName)
      coverUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('games').insert({
      name: trimmed,
      cover_url: coverUrl,
      creator_id: currentUserId,
      parent_id: parentId ? parseInt(parentId) : null,
    })

    setSubmitting(false)

    if (error) {
      setMsg('创建失败：' + error.message)
      return
    }

    close()
    onSuccess()
  }

  if (!isOpen) return null

  const isSubModule = !!parentId

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#0A111F] border border-white/[0.08] overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <h3 className="text-[15px] font-semibold text-[#E8EFF7]">
            {isSubModule ? '创建子模块' : '创建游戏节点'}
          </h3>
          <button
            onClick={close}
            className="text-[#4A5768] hover:text-[#94A3B8] text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              游戏名称 <span className="text-red-400/70">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              maxLength={30}
              placeholder="如：英雄联盟"
              className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] placeholder-[#4A5768] outline-none focus:border-cyan-500/50 transition-colors"
            />
            <p className="text-[10.5px] text-[#4A5768] mt-1 text-right tabular-nums">
              {name.length} / 30
            </p>
          </div>

          {!lockParent && (
            <div>
              <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
                所属系列 <span className="text-[#4A5768]">（可选）</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 text-[13px] text-[#E8EFF7] outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">不选，作为独立游戏节点</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] text-[#4A5768] mt-1.5 leading-relaxed">
                {isSubModule
                  ? '作为子模块创建后，它不会出现在首页大厅，只能从父游戏的页面进入。'
                  : '独立节点会显示在首页大厅，玩家可以直接进入。'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-[#5C6B7F] mb-1.5">
              封面图 <span className="text-[#4A5768]">（可选，小于 500KB）</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-[54px] rounded-lg bg-white/[0.03] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-[#4A5768]">无封面</span>
                )}
              </div>
              <label className="h-8 px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[12px] text-[#94A3B8] hover:bg-white/[0.09] transition-colors cursor-pointer inline-flex items-center">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCover}
                />
              </label>
              {coverPreview && (
                <button
                  onClick={() => {
                    setCoverFile(null)
                    if (coverPreview) URL.revokeObjectURL(coverPreview)
                    setCoverPreview('')
                  }}
                  className="text-[11px] text-[#4A5768] hover:text-red-400 transition-colors"
                >
                  移除
                </button>
              )}
            </div>
          </div>

          {msg && (
            <p className="text-[11.5px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}
        </div>

        <div className="px-5 pb-4 pt-1 flex gap-2">
          <Button variant="ghost" full onClick={close} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" full onClick={handleSubmit} loading={submitting}>
            创建
          </Button>
        </div>
      </div>
    </div>
  )
}
