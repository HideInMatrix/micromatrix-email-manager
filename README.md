# micromatrix-email-manager

Nuxt 4 邮箱账号管理后台，使用 Prisma ORM 和 SQLite 存储账号、邮件状态、规则、运行事件与 OAuth 配置。

## 功能概览

- 管理多个邮箱账号。
- 通过 Google OAuth 接入 Gmail。
- 同步 Gmail 收件箱邮件。
- 阅读邮件后可将 Gmail 邮件移入垃圾箱。
- 通过 Gmail watch + Google Cloud Pub/Sub 接收收件箱变更通知。
- 支持 Docker / 1Panel 部署。

## 本地开发

```bash
pnpm install
pnpm db:push
pnpm dev
```

默认本地数据库路径是 `.data/micromatrix-email-manager.sqlite`。本地开发时通常不需要在 `.env` 中设置 `DATABASE_URL`，让项目使用默认路径即可。

## 环境变量

`.env` 只放部署级配置。Nuxt 运行时配置请使用 `NUXT_` 前缀：

```bash
NUXT_SITE_URL=http://127.0.0.1:3000
NUXT_ADMIN_EMAIL=admin@example.com
NUXT_ADMIN_PASSWORD=replace-with-a-strong-admin-password
NUXT_TOKEN_ENCRYPTION_KEY=replace-with-at-least-32-random-characters
```

生产环境示例：

```bash
NUXT_SITE_URL=https://sms.matrixfrp.gq
NUXT_ADMIN_EMAIL=your-admin@example.com
NUXT_ADMIN_PASSWORD=replace-with-a-strong-admin-password
NUXT_TOKEN_ENCRYPTION_KEY=replace-with-at-least-32-random-characters
```

`NUXT_TOKEN_ENCRYPTION_KEY` 建议使用 32 位以上随机字符串。修改后，已保存的 OAuth Token 可能无法解密，所以生产环境上线后不要随意更换。

## Docker 与 1Panel

```bash
cp .env.example .env
docker compose up --build -d
```

`docker-compose.yml` 默认将应用映射到 `APP_PORT`，未设置时使用 `3000`。SQLite 数据库会保存在 `micromatrix-email-manager-data` volume 中，容器启动前会执行 `prisma db push`，新 volume 会自动初始化数据库表。

1Panel / Docker 部署时注意：

- `.env` 中使用 `NUXT_SITE_URL`、`NUXT_ADMIN_EMAIL`、`NUXT_ADMIN_PASSWORD`、`NUXT_TOKEN_ENCRYPTION_KEY`。
- 不要用本地的 `DATABASE_URL=file:./.data/...` 覆盖容器数据库路径。
- `docker-compose.yml` 已强制容器内数据库为 `file:/data/micromatrix-email-manager.sqlite`。
- 如确实需要覆盖容器数据库路径，请设置 `DOCKER_DATABASE_URL`，不要设置 `DATABASE_URL`。
- 使用 Nginx 反向代理时，公网访问地址必须和 `NUXT_SITE_URL` 完全一致，例如 `https://sms.matrixfrp.gq`。

使用已发布镜像：

```bash
MICROMATRIX_EMAIL_MANAGER_IMAGE=ghcr.io/OWNER/REPO:latest docker compose up -d
```

## Google Cloud、Gmail OAuth 与 Pub/Sub 配置

下面按实际配置顺序写。先创建 Google Cloud Project，再启用 API、配置 OAuth 同意屏幕并创建 Google OAuth Client，最后配置 Pub/Sub。

### 1. 创建或选择 Google Cloud Project

打开 [创建 Google Cloud Project](https://console.cloud.google.com/projectcreate)。

操作说明：

1. 输入项目名称，例如 `micromatrix-email-manager`。
2. 选择组织或保持默认。
3. 点击 `Create`。
4. 创建完成后，记下 `Project ID`，后面会用到。

如果你已经有项目，也可以打开 [Google Cloud 项目列表](https://console.cloud.google.com/cloud-resource-manager)，确认当前选中的项目是否正确。

后续控制台页面顶部都有项目选择器，进入每个链接后都要确认选中的是同一个 `Project ID`。

### 2. 启用 Gmail API 和 Pub/Sub API

打开 [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)，确认项目正确后点击 `Enable`。

打开 [Cloud Pub/Sub API](https://console.cloud.google.com/apis/library/pubsub.googleapis.com)，确认项目正确后点击 `Enable`。

这两个 API 要在同一个 Google Cloud Project 下启用：

- Gmail API 用于 OAuth 授权、同步邮件、移入垃圾箱、启动 Gmail watch。
- Pub/Sub API 用于接收 Gmail watch 推送事件。

### 3. 配置 OAuth 同意屏幕

打开 [Google Auth Platform / Branding](https://console.cloud.google.com/auth/branding)。

如果页面提示还没有配置 Google Auth Platform，点击 `Get Started`，然后按顺序填写：

1. `App name`：例如 `micromatrix-email-manager`。
2. `User support email`：选择你的邮箱。
3. `Audience`：个人测试可以选 `External`；Google Workspace 内部使用可以选 `Internal`。
4. `Contact Information`：填写接收通知的邮箱。
5. 同意 Google API Services User Data Policy，然后创建。

如果选择了 `External` 且应用还处于测试状态，打开 [Audience](https://console.cloud.google.com/auth/audience)，在 `Test users` 中添加要登录的 Gmail 邮箱，否则登录时可能提示应用未验证或用户无权限。

打开 [Data Access / Scopes](https://console.cloud.google.com/auth/scopes)，确认需要的权限：

```text
openid
email
profile
https://www.googleapis.com/auth/gmail.modify
```

`gmail.modify` 是本项目当前需要的 Gmail 权限。它可以读取邮件、修改邮件状态、移入垃圾箱，但不允许绕过垃圾箱进行立即永久删除。

### 4. 创建 Google OAuth Client

打开 [Google Auth Platform / Clients](https://console.cloud.google.com/auth/clients)，或直接打开 [创建 OAuth Client](https://console.cloud.google.com/auth/clients/create)。

操作说明：

1. 点击 `Create Client`。
2. `Application type` 选择 `Web application`。
3. `Name` 填 `micromatrix-email-manager` 或你喜欢的名称。
4. 在 `Authorized redirect URIs` 中添加本项目的 Gmail OAuth 回调地址。

生产环境：

```text
https://sms.matrixfrp.gq/api/mail/oauth/gmail/callback
```

本地开发：

```text
http://127.0.0.1:3000/api/mail/oauth/gmail/callback
```

如果你的 `NUXT_SITE_URL` 不是上面的地址，就按下面规则生成：

```text
{NUXT_SITE_URL}/api/mail/oauth/gmail/callback
```

注意事项：

- 协议必须一致：`https` 不能写成 `http`。
- 域名必须一致：`sms.matrixfrp.gq` 不能写成其他域名或 IP。
- 路径必须一致：`/api/mail/oauth/gmail/callback` 不能少。
- 不要在末尾多加 `/`。

创建完成后，复制 `Client ID` 和 `Client Secret`。登录本项目后台，进入 `/dashboard/config`，在 Gmail 配置中填入：

- `Client ID`
- `Client Secret`

### 5. 创建 Pub/Sub Topic

打开 [Pub/Sub 创建 Topic](https://console.cloud.google.com/cloudpubsub/topic/create)。

操作说明：

1. 确认顶部项目是刚才的 `Project ID`。
2. `Topic ID` 填一个简短名称，例如 `gmail-inbox-events`。
3. 是否创建默认 subscription 可以不勾选；本项目需要自己创建 Push subscription。
4. 点击 `Create topic`。

创建完成后，Topic 完整名称格式如下：

```text
projects/<PROJECT_ID>/topics/<TOPIC_ID>
```

示例：

```text
projects/my-mail-project/topics/gmail-inbox-events
```

登录本项目后台，进入 `/dashboard/config`，在 Gmail 配置中将这个完整名称填入 `Pub/Sub Topic`。

### 6. 给 Gmail 推送服务账号授权

Gmail API 要向你的 Topic 发布消息，需要给 Google 的 Gmail push 服务账号授权。

打开 [Pub/Sub Topics 列表](https://console.cloud.google.com/cloudpubsub/topic/list)，点击刚创建的 Topic，进入详情页后找到 `Permissions` 或 `权限`。

添加权限：

```text
Principal: serviceAccount:gmail-api-push@system.gserviceaccount.com
Role: Pub/Sub Publisher
Role ID: roles/pubsub.publisher
```

保存后，Gmail 才能把 watch 通知发布到该 Topic。

如果保存时报组织策略或 domain restricted sharing 相关错误，需要在 Google Cloud 组织策略里允许这个 Google 管理的服务账号，或者换一个不受该组织策略限制的项目。

### 7. 创建 Pub/Sub Push Subscription

打开 [Pub/Sub Subscriptions](https://console.cloud.google.com/cloudpubsub/subscription/list)，或直接打开 [创建 Push Subscription](https://console.cloud.google.com/cloudpubsub/subscription/create)。

配置说明：

1. `Subscription ID`：例如 `gmail-inbox-events-push`。
2. `Topic`：选择刚才创建的 Topic。
3. `Delivery type`：选择 `Push`。
4. `Endpoint URL`：填写本项目的 Pub/Sub webhook 地址。

生产环境：

```text
https://sms.matrixfrp.gq/api/mail/webhook/gmail
```

本地开发不能直接接收 Google Pub/Sub push，除非你使用公网 HTTPS 隧道。生产环境必须是公网可访问的 HTTPS 地址，并且证书有效。

本项目的 webhook 会接收 Pub/Sub JSON，解析其中 Gmail 推送的 `emailAddress` 和 `historyId`，然后触发对应账号同步。

### 8. 在本项目后台连接 Gmail

部署并配置 `.env` 后，访问：

```text
https://sms.matrixfrp.gq/login
```

操作顺序：

1. 使用 `NUXT_ADMIN_EMAIL` 和 `NUXT_ADMIN_PASSWORD` 登录。
2. 进入 `/dashboard/config`。
3. 在 Gmail 配置中填入 `Client ID`、`Client Secret`、`Pub/Sub Topic`。
4. 保存配置。
5. 点击连接 Gmail，完成 Google OAuth 授权。
6. 进入账号页，对 Gmail 账号点击 watch / 监听。
7. 发送一封测试邮件到该 Gmail 账号，确认事件页出现 webhook / sync 记录。

## Gmail 权限说明

当前代码请求的 Gmail OAuth scope 是：

```text
openid
email
profile
https://www.googleapis.com/auth/gmail.modify
```

`gmail.modify` 用于：

- 读取邮件列表和邮件详情。
- 获取邮件标签状态，例如 `UNREAD`、`INBOX`。
- 启动 Gmail watch。
- 将邮件移入垃圾箱。

Pub/Sub Topic 不需要额外添加 OAuth scope。它属于 Google Cloud 资源权限，关键是给 `gmail-api-push@system.gserviceaccount.com` 授予 Topic 的 `Pub/Sub Publisher` 角色。

## 反向代理注意事项

如果使用 1Panel + Nginx 反向代理：

- `NUXT_SITE_URL` 必须写公网 HTTPS 地址，例如 `https://sms.matrixfrp.gq`。
- Google OAuth Client 的 Authorized redirect URI 必须和 `{NUXT_SITE_URL}/api/mail/oauth/gmail/callback` 完全一致。
- Pub/Sub Push Endpoint 必须能从公网访问：`{NUXT_SITE_URL}/api/mail/webhook/gmail`。
- Nginx 不要拦截 `POST /api/mail/webhook/gmail`。
- 如果 OAuth 仍然提示 `redirect_uri_mismatch`，优先检查 Google Cloud Client 里登记的回调地址和后台配置页展示的 Gmail Redirect URI 是否逐字符一致。

## GitHub Actions 发布说明

推送 Git tag 后，工作流会构建并推送 Docker 镜像，默认包含两个 tag：

- `ghcr.io/OWNER/REPO:<tag>`
- `ghcr.io/OWNER/REPO:latest`

工作流会把两个 tag 一起传给同一个 `docker/build-push-action` 步骤，所以 Nuxt 前端每次发布只会构建一次。

## 官方参考

- [Google Cloud 创建 Project](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects)
- [Google Workspace 配置 OAuth 同意屏幕](https://developers.google.com/workspace/guides/configure-oauth-consent)
- [Google Workspace 创建 OAuth Client](https://developers.google.com/workspace/guides/create-credentials)
- [Gmail API OAuth scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail API Push Notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Pub/Sub 创建 Topic](https://docs.cloud.google.com/pubsub/docs/create-topic)
- [Pub/Sub 创建 Push Subscription](https://docs.cloud.google.com/pubsub/docs/create-push-subscription)
- [Pub/Sub IAM 权限](https://docs.cloud.google.com/pubsub/docs/access-control)
