# Wingman Games / 僚机雷达 — 项目说明

> 给"未来的自己"和"任何接手的 AI 助手"看的。项目有结构性变更时请同步更新本文件。
> 最后更新：2026-11-16

---

## 一、项目是什么

面向游戏玩家的搭子匹配平台。玩家创建或进入某个游戏节点，发布"招募通缉令"（主玩内容、平台、区服、在线时间），他人可关注、点赞、评论、私聊，最终互加好友开黑。

另有社区层：讨论区、动态广场、成就与称号、信誉评价、Steam 游戏库联动、抽卡盲盒匹配。

**视觉风格**：赛博朋克。背景 `#050B14`，卡片 `#0A111F`，强调色 cyan-400 / fuchsia-500，标题字体 `font-orbitron`。整体偏"深黑底 + 霓虹发光边框"。

---

## 二、技术栈

| 层 | 使用什么 |
|---|---|
| 前端 | Next.js（App Router）+ TypeScript + Tailwind CSS |
| 数据库 / 鉴权 / 存储 | Supabase（PostgreSQL + Auth + Storage + Edge Functions） |
| 代码托管 | GitHub：`github.com/ydhbmb/game-friend-v2-website` |
| 部署 | Cloudflare Pages（纯静态导出，分支 `cf-static`） |
| 发邮件 | Resend（SMTP + REST API） |
| 本地路径 | `G:\game-friend-v2` |

### 关键配置

- Supabase 项目 ref：`umxwvcamuivdrisogkla`
- 域名：`517751.xyz`、`1288688.xyz`（DNS 均在 Cloudflare）
- Cloudflare Pages 项目名：`wingman-games`
- 环境变量（本地 `.env.local` 与 Cloudflare 后台必须一致）：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `RESEND_API_KEY`（仅服务端用，绝不可进前端）

> ⚠️ `.env.local` 曾误传公开过一次，Resend 密钥视为已泄露，现已轮换。任何时候都不要再把它提交进仓库。

---

## 三、必须知道的历史决策（不要重走）

1. **不要回到 Cloudflare Workers（OpenNext）。** 曾用它跑 Next.js 16，结果页面无限转圈，日志为 `Worker code had hung`，根因是 Next.js 在 V8 沙箱里 SSR 死锁。改用 `output: 'export'` 纯静态部署到 Pages 才彻底解决。

2. **不要用 Vercel。** 当时卡在账号登录环节，未继续验证。

3. **不要开启 `cacheComponents` / `partialPrefetching`。** 与静态导出叠加会出问题，已移除。

4. **纯静态导出 = 没有后端 API。** `app/api/*` 在 Cloudflare Pages 上不生效。需要服务端能力时一律用 Supabase Edge Function（现有例子：`get-steam-games`）。

5. **路由参数用 query string，不用动态路由段。** 例如 `/game?id=1`、`/profile?id=3`，而不是 `/game/1`。静态导出下动态段需要额外配置路径生成。

6. **权限判断看 `role` 字段，不看 ID 白名单。** 早期用 `adminIds = [1, 10000, 11111...]` 硬编码，已废弃。现在 `users_profile.role` 取值 `user` / `admin` / `super_admin`。

---

## 四、目录结构

```
game-friend-v2/
├── app/
│   ├── page.tsx              首页：游戏大厅 + 搜索 + 排行榜
│   ├── login/ register/      登录注册（邮箱 OTP + 密码）
│   ├── game/page.tsx         游戏详情：招募大厅 + 讨论区
│   ├── moments/page.tsx      动态广场
│   ├── profile/page.tsx      个人主页（含动态卡片）
│   ├── user-center/          用户中心（资料、头像、称号）
│   ├── following/            我的关注（分组、一键摇人）
│   ├── messages/             私信中心
│   ├── notifications/        通知
│   ├── gacha/                僚机盲盒（抽卡匹配）
│   └── admin/page.tsx        神权控制台（仅 admin 可见）
├── components/
│   ├── Navbar.tsx                    全局导航
│   ├── ModalPostRecruit.tsx          发布招募弹窗
│   ├── ModalPostForum.tsx            发布帖子弹窗
│   ├── ModalRecruitComments.tsx      招募评论弹窗
│   ├── ModalForumDetail.tsx          帖子详情弹窗
│   ├── FollowUserButton.tsx          关注按钮
│   └── UserName.tsx                  用户名展示
├── lib/
│   ├── supabase.ts           客户端实例（唯一出口）
│   └── levels.ts             68 级配置 + calculateLevel()
└── PROJECT.md                本文件
```

---

## 五、数据库表

### 用户与关系

| 表名 | 关键字段 |
|---|---|
| `users_profile` | `auth_id`、`nickname`、`avatar_url`、`experience`、`equipped_title`、`role`、`banned_until`、`gender`、`last_checkin_at`、`daily_like_count`、`last_like_at`、`daily_gacha_count`、`last_gacha_at`、`positive_reviews`、`negative_reviews`、`steam_id`、`steam_name` |
| `follows` | `follower_id` → `following_id` |
| `follow_groups` | 关注分组 |
| `blocked_users` | `blocker_id` / `blocked_id` |
| `achievements` / `user_achievements` | 成就定义 / 已解锁 |
| `teams` / `team_members` | 战队 / 成员（`role` 含 `pending`） |
| `reviews` | `reviewer_id`、`target_id`、`is_positive`，`unique(reviewer_id, target_id)` |
| `user_steam_games` | `app_id`、`game_name`、`playtime_forever` |

### 游戏与内容

| 表名 | 关键字段 |
|---|---|
| `games` | `name`、`cover_url`、`creator_id`、`parent_id`（父子模块） |
| `recruits` | `game_id`、`creator_id`、`play_content`、`online_time`、`personality`、`platform`、`server_region`、`is_closed` |
| `likes` | `unique(user_id, recruit_id)` |
| `comments` | 通缉令评论 |
| `posts` / `post_comments` | 讨论区 |
| `recruit_follows` / `game_follows` | 关注招募 / 订阅游戏 |
| `moments` | `user_id`、`content`（1\~200 字）、`created_at` |
| `moment_likes` | `unique(moment_id, user_id)` |

### 通信与系统

| 表名 | 说明 |
|---|---|
| `messages` | 私信，含 `is_read` |
| `notifications` | 通知，含 `is_read` |
| `feedbacks` | 用户反馈 |
| `admin_logs` | 管理员操作审计。`admin_id`、`action`、`target_type`、`target_id`、`detail`(jsonb) |

### Storage 桶

- `avatars`：公开读，登录可写
- `game_covers`：公开读，登录可写

### 函数与 RPC

| 名称 | 作用 |
|---|---|
| `get_common_games(user_a, user_b)` | 返回两人共同游戏 |
| `is_admin()` | 当前用户是否为 admin / super_admin |
| `is_super_admin()` | 当前用户是否为 super_admin |
| `give_like(p_recruit_id)` | 点赞：防重复 + 每日 5 次 + 双方各 +1 经验 |
| `give_review(p_target_id, p_is_positive)` | 评价：插入记录 + 对方计数 +1 |
| `admin_ban_user(p_target_id, p_days, p_reason)` | 封禁，写日志 |
| `admin_unban_user(p_target_id)` | 解封，写日志 |
| `admin_add_experience(p_target_id, p_delta, p_reason)` | 加减经验，写日志 |
| `admin_set_role(p_target_id, p_role)` | 分配角色（仅超管），写日志 |
| `admin_delete_content(p_table, p_id)` | 删除内容（表名白名单），写日志 |
| 触发器 `trg_guard_profile` | 拦截非超管的 role 变更、非管理员的 banned_until 变更、所有 auth_id 变更 |

---

## 六、已完成功能

**账号**：邮箱 OTP 注册登录、昵称唯一性校验、头像上传、封禁检测（`banned_until` 到期前强制登出）、每日签到 +5 经验。

**游戏**：大厅列表 + 搜索 + 排行榜、父子模块、封面图上传、订阅游戏频道。

**招募**：发布通缉令、点赞（走 `give_like` RPC）、首杀标记、已结案状态、评论、关注单条招募。

**社区**：讨论区发帖评论、关注用户、关注分组、一键摇人、私信（拉黑后禁发）、通知红点、**动态广场（发布/点赞/删除）**、**个人主页动态卡片**。

**成长**：68 级体系、成就徽章、称号穿戴、信誉档案（好评率 / 鸽子率，走 `give_review` RPC）。

**Steam**：绑定 SteamID、Edge Function 同步游戏库、展示最常玩、计算共同游戏。

**管理**：`/admin` 神权控制台 —— 数据总览、用户管理（改经验/封禁/解封/设角色）、游戏模块清理、悬赏清理、操作日志。

**其他**：僚机盲盒抽卡、意见反馈入口。

---

## 七、当前权限模型（重要）

这是最近一次大改，理解它有助避免"改了代码但操作没生效"。

**表级 RLS**

- `users_profile`：update 仅限本人（`auth.uid() = auth_id`）。**任何人都不能直接改别人的行。**
- `reviews`、`likes`：已关闭直接 insert 策略，只能通过 RPC 写入。
- 内容表（`recruits`、`posts`、`comments`、`moments`、`games` 等）：管理员有 `for all using (is_admin())` 的全开策略。
- `admin_logs`：只有管理员可 `select`，无 insert 策略（只能由 security definer 函数写）。

**为什么这么设计**

早期为了"点赞时给发帖人加经验"，把 `users_profile` 的 update 放开成 `using (true)`，导致任何登录用户都能改任何人的经验值——谁都能把自己刷到 68 级。现在改为：**写别人那一行必须走 `security definer` 函数**，函数内部做完整校验。

**操作对照表**

| 想做什么 | 正确做法 |
|---|---|
| 改自己资料 / 头像 / 称号 / 签到 | 直接 `.update()`，RLS 允许 |
| 给通缉令点赞 | `rpc('give_like', { p_recruit_id })` |
| 评价他人 | `rpc('give_review', { p_target_id, p_is_positive })` |
| 封禁 / 解封 / 改经验 / 设角色 / 删内容 | 走对应 `admin_*` RPC |
| 初始化第一个超管 | Supabase SQL Editor 里 `update ... set role='super_admin' where id=1` |

---

## 八、已知问题与技术债

按优先级，建议逐条消化。

1. **`notifications` 的读权限仍全开。** 策略是 `select using (true)`，前端靠 `user_id` 过滤。任何人在控制台就能拉到全站通知。应改成 `using (auth.uid() = (select auth_id from users_profile where id = user_id))`。改之前要先看 `app/notifications/page.tsx` 怎么查的。

2. **反馈邮件在静态版失效。** `app/api/feedback/route.ts` 在 Cloudflare Pages 上不存在。需改为 Supabase Edge Function。

3. **`users_profile` 的 update 策略会拦住管理员改他人数据。** 这不是 bug，是设计。但如果以后要做"批量操作"或"站内直接改他人资料"，必须走 RPC，不能直接操作表。

4. **首页数据请求缺少超时控制。** 极端网络下可能白屏，可加兜底。

5. **密码强度仅校验长度 ≥ 6。**

6. **`team_members` 查询已改用 `.limit(1)`。** 原来 `.single()` 在零行或多行时都会返回 error，导致"明明加入了战队却显示独狼"。

7. **`memories` 之类的大表没有分页。** 管理员列表、用户列表目前一次拉全量，用户多了会慢。

---

## 九、开发流程

**本地开发**

```cmd
cd /d G:\game-friend-v2
npm run dev
```

访问 `http://localhost:3000`。

> 注意：改动普通文件会自动热更新。但**在 `app` 下新建文件夹后**，必须 `Ctrl+C` 停掉重跑，否则新路由 404。这是 Next.js 的已知行为，不是代码错了。

**提交与部署**

```cmd
npm run build
```

必须看到构建成功。**本地构建报错就绝不能 commit 和 push。** 然后用 GitHub Desktop 提交到 `cf-static` 分支，Cloudflare Pages 自动重新部署。

**功能验收 checklist**

- [ ] 本地 `npm run build` 通过
- [ ] 数据库缺的列/表已补（`add column if not exists`）
- [ ] 新表 RLS 已建，范围尽量收窄
- [ ] 涉及"改别人数据"的操作必须走 RPC，不能直接 `.update()`
- [ ] 该功能在纯静态导出下不需要后端 API
- [ ] 手机上走过一遍

---

## 十、分支策略（待收敛）

现状：`cf-static`（Cloudflare Pages，纯静态，主力）与 `main`（另一服务，全栈版）并存。

**问题**：两分支路由写法不同（`/game?id=1` vs `/game/1`），`main` 独有 `/api` 目录，每次同步会产生大量冲突。目前 `main` 实际已停更。

**建议方向**：统一为 query string 路由 + 反馈功能改 Edge Function + 删掉 `app/api`，之后只留一个分支。或者干脆只保留 Cloudflare，把另一个域名也指到同一个 Pages 项目上。

**不要在功能开发中途做这次迁移**，等一段功能告一段落再动。

---

## 十一、给接手的 AI 助手

1. **先读本文档，再看具体文件。** 不要要求用户上传全部代码——项目迭代过上千轮，历史版本很多，读全量只会拿到过时信息。

2. **给代码时优先给完整文件。** 用户是非程序员，片段粘贴容易错位，历史上多次因此产生 bug。例外是公共组件（`Navbar.tsx` 这类）里带用户自有逻辑时，才改为精准定位替换。

3. **改动前确认三件事**：数据库有无对应字段、RLS 放没放开、这个功能在纯静态导出下能否运行。

4. **涉及"改别人数据"时，默认走 RPC。** 直接 `.update()` 别人那一行会被 RLS 静默拦掉，不报错但数据库没变——这是最容易浪费时间的陷阱。

5. **不要引入新依赖，除非必要。** 静态导出对包体积敏感。

6. **回答用中文，避免术语堆砌。** 每一步都要说清"在哪里改、改成什么、改完怎么验证"。

---

## 十二、待办

- [ ] 动态广场加"只看关注的人"时间线
- [ ] 收窄 `notifications` 读权限
- [ ] 反馈功能改为 Edge Function 发信
- [ ] 管理员加"查看某用户全部动态和帖子"
- [ ] 批量处理举报功能
- [ ] 收敛 `main` / `cf-static` 双分支
- [ ] 移动端整体走查
