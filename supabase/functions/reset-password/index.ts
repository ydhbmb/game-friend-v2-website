import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { account, superPassword, newPassword } = await req.json()

    if (!account || !superPassword || !newPassword) {
      return json({ error: '请填写账号、超级密码和新密码' }, 400)
    }
    if (String(newPassword).length < 6) {
      return json({ error: '新密码至少 6 位' }, 400)
    }
    if (String(newPassword) === String(superPassword)) {
      return json({ error: '新密码不能与超级密码相同' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. 定位账号
    const key = String(account).trim()
    let query = admin.from('users_profile').select('id, auth_id, nickname, username, email')

    if (key.includes('@')) {
      query = query.eq('email', key)
    } else if (/^\d+$/.test(key)) {
      query = query.eq('id', Number(key))
    } else {
      query = query.eq('username', key)
    }

    const { data: profile, error: profileErr } = await query.maybeSingle()

    if (profileErr) {
      return json({ error: '查询失败：' + profileErr.message }, 500)
    }
    if (!profile) {
      return json({ error: '账号不存在' }, 404)
    }

    // 2. 取超级密码
    const { data: secret, error: secretErr } = await admin
      .from('user_secrets')
      .select('super_password')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (secretErr) {
      return json({ error: '校验失败：' + secretErr.message }, 500)
    }
    if (!secret) {
      return json({ error: '该账号未设置超级密码，请改用邮箱验证找回' }, 400)
    }

    // 3. 校验
    if (secret.super_password !== String(superPassword)) {
      return json({ error: '超级密码不正确' }, 401)
    }

    // 4. 改密
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      profile.auth_id,
      { password: String(newPassword) }
    )

    if (updateErr) {
      return json({ error: '修改失败：' + updateErr.message }, 500)
    }

    return json({ success: true, nickname: profile.nickname })
  } catch (err) {
    return json({ error: '请求异常：' + String(err) }, 500)
  }
})
