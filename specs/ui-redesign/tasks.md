# Implementation Plan

- [x] 1. 更新需求与设计边界
  - 去掉设计文档中的一次性目的声明。
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
