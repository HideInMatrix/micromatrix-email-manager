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

- [x] 8. 统一输入框、密码可见性和删除确认弹框
  - 新增可复用的 daisyUI input field 组件，替换页面中的文本、邮箱、搜索和密钥输入框。
  - 新增密码/密钥输入组件，在登录密码、注册确认密码和 Client Secret 上提供眼睛按钮。
  - 已创建 OAuth 配置中的 Client Secret 支持管理员通过眼睛按钮按需查看或隐藏。
  - 新增 daisyUI modal 确认组件，替换邮件删除、批量删除、邮箱账号删除、规则删除和 Token 撤销确认。
  - 运行项目构建并检查没有原生 `window.confirm` 残留。
  - Build result: `rtk pnpm run build` passed.
  - Search result: no `window.confirm` or bare text/email/search/password inputs remain outside the reusable input components and checkbox/drawer controls.
  - _Requirement: R6, R7_

- [x] 9. 拆分自动化规则用途并支持接口提取
  - 将规则 UI 拆成“页面过滤”和“接口提取”两个 daisyUI tab。
  - 页面过滤规则继续用于同步后的本地标记、归档和本地标签。
  - 接口提取规则支持按来源字段执行正则并返回指定字段名和捕获分组内容。
  - 对外邮件接口支持 `ruleId` 和 `extract=true` 返回 `extractions`。
  - Build result: `rtk pnpm run build` passed.
  - _Requirement: R5, R7, R8_

- [x] 10. 增加邮件工作台分页和邮箱筛选
  - 邮件列表接口在传入 `page` / `pageSize` 时返回分页元数据，并保留原有 `limit` / `offset` 数组响应兼容性。
  - 首页每页加载 25 封邮件，使用 daisyUI `join` 按钮展示数字页码、上一页和下一页。
  - 增加“全部邮箱/指定邮箱”筛选，选项来源于当前用户可访问的邮箱账号接口。
  - 搜索、未读、规则或邮箱筛选变化时自动回到第一页，并避免快速请求覆盖最新结果。
  - Build result: `rtk pnpm run build` passed.
  - _Requirement: R6, R7, R9_
