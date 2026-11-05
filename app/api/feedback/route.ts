import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { type, content, contact } = await req.json()

    const data = await resend.emails.send({
      from: 'Wingman反馈 <noreply@1288688.xyz>', // 必须是你在 Resend 验证过的域名
      to: ['ydhbmb@163.com'], // 🔥 改成你接收反馈的邮箱
      subject: `【Wingman反馈】收到一条新的${type}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f4f4f4;">
          <h2 style="color: #0ea5e9;">Wingman Games 收到新反馈</h2>
          <p><strong>反馈类型：</strong>${type}</p>
          <p><strong>联系方式：</strong>${contact || '未留'}</p>
          <p><strong>具体内容：</strong></p>
          <div style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
            ${content}
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}