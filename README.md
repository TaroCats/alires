# AliRes

[![Release](https://github.com/TaroCats/alires/actions/workflows/release.yml/badge.svg)](https://github.com/TaroCats/alires/actions/workflows/release.yml)
[![GitHub tag](https://img.shields.io/github/v/tag/TaroCats/alires?sort=semver)](https://github.com/TaroCats/alires/tags)
[![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2Ftarocats%2Falires-blue)](https://github.com/TaroCats/alires/pkgs/container/alires)

AliRes 是一个面向阿里云实例巡检与通知场景的轻量运维控制台，提供前端管理后台和 FastAPI 后端服务，支持账号管理、实例策略、自动巡检、日报发送以及 Telegram 通知。

## 功能概览

- 阿里云账号管理：维护国内站/国际站账号、账单节点与 AccessKey 信息。
- 实例策略管理：配置实例 ID、区域、流量阈值、账单阈值、自动拉起与释放后重建策略。
- 巡检与恢复：支持自动调度巡检，也支持手动触发巡检和恢复动作。
- Telegram 通知：可配置机器人与多个通知目标，分别订阅告警、恢复和日报消息。
- 调度任务：支持直接修改巡检周期和日报发送时间，保存后立即热更新调度器。
- 仪表盘与日志：查看实例状态汇总、最近账单、任务执行结果和巡检日志。

## 技术栈

- 前端：React 18、TypeScript、Vite、Tailwind CSS、Zustand
- 后端：FastAPI、SQLAlchemy、APScheduler
- 数据库：SQLite（默认）
- 容器化：Docker 多阶段构建
- 发版：GitHub Actions + GHCR

## 项目结构

```text
.
├── api/                  # FastAPI 后端与业务逻辑
├── src/                  # React 前端
├── public/               # 前端静态资源
├── data/                 # SQLite 数据目录
├── Dockerfile            # 生产镜像构建
└── .github/workflows/    # CI / Release 工作流
```

## 本地开发

### 1. 安装依赖

```bash
npm ci
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动后端

```bash
source .venv/bin/activate
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 启动前端

```bash
npm run dev
```

默认情况下：

- 前端开发地址：`http://127.0.0.1:5173`
- 后端接口地址：`http://127.0.0.1:8000`
- 默认管理员账号：`admin`
- 默认管理员密码：`admin123`

前端开发服务器已通过 Vite 代理将 `/api` 请求转发到本地 `8000` 端口。

## 常用命令

```bash
# 前端开发
npm run dev

# 前端构建
npm run build

# 类型检查
npm run check

# ESLint
npm run lint

# 启动后端
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## 环境变量

后端支持以下环境变量：

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///data/app.db` | 数据库连接串 |
| `ADMIN_USERNAME` | `admin` | 初始化管理员用户名 |
| `ADMIN_PASSWORD` | `admin123` | 初始化管理员密码 |
| `TOKEN_SECRET` | `alires-secret` | 登录 Token 签名密钥 |
| `LEGACY_CONFIG_FILE` | `/opt/scripts/config.json` | 兼容旧配置文件导入 |
| `MOCK_ALIYUN` | `0` | 是否启用阿里云模拟模式 |
| `CORS_ORIGIN` | `http://localhost:5173` | 开发环境跨域来源 |

说明：

- 首次启动会自动初始化管理员账号和默认调度任务。
- 如果 `LEGACY_CONFIG_FILE` 存在，系统会自动导入旧版账号、实例和 Telegram 配置。
- 生产环境建议显式设置 `ADMIN_PASSWORD` 与 `TOKEN_SECRET`。

## Docker 部署

项目已经支持单镜像部署：

- 构建阶段使用 Node.js 打包前端。
- 运行阶段使用 Python 启动 FastAPI。
- 容器内由 FastAPI 统一提供 API 与前端静态资源。
- SQLite 默认写入 `/app/data/app.db`，建议挂载数据卷持久化。

### 本地构建镜像

```bash
docker build -t alires:local .
```

### 运行容器

```bash
docker run -d \
  --name alires \
  -p 8000:8000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=change-me \
  -e TOKEN_SECRET=change-this-secret \
  -v "$(pwd)/data:/app/data" \
  alires:local
```

启动后可直接访问：

- 管理后台：`http://127.0.0.1:8000`
- 健康检查：`http://127.0.0.1:8000/api/health`

## Docker Compose 部署

仓库已提供 [docker-compose.yml](file:///Users/taro/GitHub/alires/docker-compose.yml) 和 [`.env.example`](file:///Users/taro/GitHub/alires/.env.example)，可直接从 GHCR 拉取镜像部署。

### 1. 初始化环境变量

```bash
cp .env.example .env
```

建议至少修改以下值：

- `ADMIN_PASSWORD`
- `TOKEN_SECRET`
- `ALIRES_IMAGE`，例如固定为 `ghcr.io/tarocats/alires:v1.0.0`

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 查看日志

```bash
docker compose logs -f
```

### 4. 升级版本

```bash
docker compose pull
docker compose up -d
```

Compose 默认行为：

- 端口映射：`${ALIRES_PORT}:8000`
- 数据目录：`./data -> /app/data`
- 默认镜像：`ghcr.io/tarocats/alires:latest`
- 已内置 `/api/health` 健康检查

## GHCR 拉取示例

如果需要手动拉取镜像，可使用：

```bash
docker pull ghcr.io/tarocats/alires:latest
```

指定版本拉取：

```bash
docker pull ghcr.io/tarocats/alires:v1.0.0
```

## 反向代理示例

### Nginx

仓库提供了 [alires.conf.example](file:///Users/taro/GitHub/alires/deploy/nginx/alires.conf.example)，可直接作为站点配置模板。

核心转发逻辑如下：

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Traefik

如果服务器已经有 Traefik，可叠加使用 [docker-compose.traefik.yml](file:///Users/taro/GitHub/alires/deploy/docker-compose.traefik.yml)：

```bash
TRAEFIK_HOST=alires.example.com \
docker compose -f docker-compose.yml -f deploy/docker-compose.traefik.yml up -d
```

前提条件：

- 已存在名为 `traefik` 的外部 Docker Network
- Traefik 已配置 `websecure` 入口点
- `.env` 或命令行中传入 `TRAEFIK_HOST`

### systemd 示例

仓库还提供了以下 `systemd` 示例文件：

- [traefik.service.example](file:///Users/taro/GitHub/alires/deploy/systemd/traefik.service.example)：适合用 `docker compose` 托管独立 Traefik 目录
- [nginx.service.override.example](file:///Users/taro/GitHub/alires/deploy/systemd/nginx.service.override.example)：适合给系统安装版 Nginx 增加重启策略和网络依赖

常见安装方式：

```bash
sudo cp deploy/systemd/traefik.service.example /etc/systemd/system/traefik.service
sudo systemctl daemon-reload
sudo systemctl enable --now traefik
```

## GitHub Actions 发版

仓库已配置 `.github/workflows/release.yml`，用于发布容器镜像和 GitHub Release。

### 触发方式

- 推送语义化标签：`v1.0.0`
- 手动触发：GitHub Actions `workflow_dispatch`

### 流程说明

1. 执行前端构建与后端编译校验。
2. 使用矩阵分别构建并推送以下 Linux Docker 镜像：
   - `linux/amd64` -> `x86`
   - `linux/arm64` -> `arm64`
3. 合并上述镜像为多架构 Manifest，并发布统一标签。
4. 在 `macos-latest` Runner 上执行构建校验，并生成一个 macOS 部署包作为 Release 附件。
5. 在 tag 发布场景下自动创建 GitHub Release。

### 镜像标签规则

以 `v1.0.0` 为例，工作流会推送：

- `ghcr.io/<owner>/<repo>:v1.0.0-x86`
- `ghcr.io/<owner>/<repo>:v1.0.0-arm64`
- `ghcr.io/<owner>/<repo>:v1.0.0`（多架构聚合标签）
- `ghcr.io/<owner>/<repo>:latest`（仅 tag 发版时更新）

### 使用前准备

- 仓库需启用 GitHub Packages 权限。
- 使用内置 `GITHUB_TOKEN` 即可向 GHCR 推送同仓库镜像。
- 仓库根目录已提供 [`.github/release.yml`](file:///Users/taro/GitHub/alires/.github/release.yml)，用于配置 GitHub 自动生成 Release Notes / changelog。
- 建议通过 tag 发版，例如：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 自动部署

仓库已新增 [deploy.yml](file:///Users/taro/GitHub/alires/.github/workflows/deploy.yml)，用于通过 SSH 在远端服务器执行部署。

### 触发方式

- 推送 tag：自动部署该 tag
- 手动触发：可指定 `ref`

### 工作流行为

1. 通过 SSH 登录服务器。
2. 进入 `DEPLOY_PATH` 指定的项目目录。
3. 拉取最新 tag / 分支并切换到目标版本。
4. 执行 `docker compose pull`。
5. 执行 `docker compose up -d --remove-orphans`。
6. 当配置多个目标时，GitHub Actions 会按矩阵逐台执行部署。

### 必需 Secrets

- `SSH_PRIVATE_KEY`：部署私钥

### 必需 Variables / Inputs

- `DEPLOY_TARGETS`：仓库 Variable，内容为 JSON 数组；也可在手动触发时通过 `targets_json` 直接传入
- `SSH_PRIVATE_KEY`：仓库 Secret，部署私钥

`DEPLOY_TARGETS` 示例：

```json
[
  {
    "name": "prod-hk",
    "host": "203.0.113.10",
    "user": "deploy",
    "port": 22,
    "path": "/opt/alires",
    "compose_args": "-f docker-compose.yml"
  },
  {
    "name": "prod-sg",
    "host": "203.0.113.20",
    "user": "deploy",
    "port": 22,
    "path": "/opt/alires",
    "compose_args": "-f docker-compose.yml -f deploy/docker-compose.traefik.yml"
  }
]
```

### 服务器前置要求

- 服务器已安装 Git 与 Docker / Docker Compose
- 服务器上已 clone 当前仓库到 `DEPLOY_PATH`
- `DEPLOY_PATH` 内已准备好生产用 `.env`
- 如果使用 Traefik，触发工作流时可传入：

```text
-f docker-compose.yml -f deploy/docker-compose.traefik.yml
```

### 服务器初始化脚本

仓库提供了 [bootstrap-server.sh](file:///Users/taro/GitHub/alires/deploy/scripts/bootstrap-server.sh)，可在全新 Ubuntu / Debian 服务器上快速完成：

- 安装 Docker Engine 与 Docker Compose Plugin
- 创建部署目录
- clone 仓库并切换到目标分支或 tag
- 自动复制 `.env.example` 为 `.env`

使用示例：

```bash
chmod +x deploy/scripts/bootstrap-server.sh
./deploy/scripts/bootstrap-server.sh git@github.com:TaroCats/alires.git /opt/alires main
```

## 关于 macOS 支持

Docker 多平台镜像本质上面向 Linux 容器平台，因此不能直接生成原生 `macOS` 容器镜像。

当前发版策略采用以下方式覆盖需求：

- `arm64 / x86`：通过 Docker Buildx 矩阵发布 Linux 多架构镜像。
- `macOS`：通过 GitHub Actions 的 `macos-latest` Runner 执行构建校验，并输出 macOS 部署包附件。

如果后续需要真正的原生 macOS 应用分发，可以再补充 `py2app`、`briefcase` 或桌面壳方案。
