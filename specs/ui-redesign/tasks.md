# Implementation Plan

- [x] 1. 更新需求与设计边界
  - 去掉设计文档中的一次性目的声明。
  - 明确 `design.md` 只作为 UI 设计稿提示词，不承载业务逻辑、权限模型或接口语义。
  - 明确 `/` 是前台邮件工作台，`/dashboard/*` 是后台管理页。
  - 使用 Nuxt layout 区分前台、后台和登录页面外壳。
  - 后台左侧菜单只展示后台管理路由，不展示首页/邮件工作台。
  - 保留未登录访问后台时跳转 `/login` 的验收标准。
  - _Requirement: R1, R2_

- [x] 2. 增加规则邮箱类型字段
  - 在共享类型和 Prisma `AutomationRule` 中增加 `provider`。
  - 让旧规则默认归属 Gmail，避免现有数据无法读取。
  - 更新规则创建、更新、读取和匹配逻辑。
  - _Requirement: R5_

- [x] 3. 重构 OAuth 配置页面
  - 将配置页改成“选择邮箱类型 -> 填写字段 -> 保存”的创建流程。
  - 保存后的 Gmail / Outlook 配置用 daisyUI 卡片展示。
  - 移除配置页中的“连接 Gmail / 连接 Outlook”入口。
  - _Requirement: R3, R6_

- [x] 4. 重构邮箱账号页面
  - 在账号页增加 Gmail / Outlook 连接入口。
  - 根据 provider 是否配置完成和是否支持 OAuth 决定按钮启用状态。
  - 保留账号同步、watch、删除和选中逻辑。
  - _Requirement: R4, R6_

- [x] 5. 重构本地邮件规则 UI
  - 在规则创建表单中增加邮箱类型选择。
  - 规则列表展示 provider 徽标，并按 provider 分组。
  - 继续使用 daisyUI `fieldset`、`select`、`toggle`、`badge`、`join`。
  - _Requirement: R5, R6_

- [x] 6. 验证
  - 运行项目构建。
  - 本地 smoke-test `/`、`/login` 和后台未登录跳转。
  - 记录无法自动验证的部分。
  - Build result: `rtk pnpm run build` passed.
  - Database result: `rtk pnpm run db:push` synced `AutomationRule.provider`.
  - Runtime result: preview on `http://127.0.0.1:4199` returned 200 for `/`, `/login`, `/api/status`, `/api/rules`; protected dashboard routes returned 302 to `/login?redirect=...`.
  - _Requirement: R7_

- [ ] 7. 修正 API Token 身份模型
  - 在 Token 页面和文案中明确 Token 归属是用户账号，不是 Gmail / Outlook 邮箱账号。
  - 普通用户创建 Token 时固定绑定当前登录用户账号，不展示邮箱账号选择。
  - 管理员代用户创建 Token 时选择目标用户账号，不选择邮箱账号。
  - 对外接口用 Bearer Token 解析用户身份，再按 `accountId`、`recipientEmail` 或 `to` 指定目标邮箱账号或收件邮箱过滤。
  - 后端校验请求指定的邮箱账号必须属于该 Token 用户可访问范围，无权限时拒绝请求。
  - _Requirement: R8_
