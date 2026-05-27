<div align="center">

```
██████╗ ███████╗██╗   ██╗ ██████╗ ██████╗ ██╗      ██╗      █████╗ ██████╗
██╔══██╗██╔════╝██║   ██║██╔════╝██╔═══██╗██║      ██║     ██╔══██╗██╔══██╗
██║  ██║█████╗  ██║   ██║██║     ██║   ██║██║      ██║     ███████║██████╔╝
██║  ██║██╔══╝  ╚██╗ ██╔╝██║     ██║   ██║██║      ██║     ██╔══██║██╔══██╗
██████╔╝███████╗ ╚████╔╝ ╚██████╗╚██████╔╝███████╗ ███████╗██║  ██║██████╔╝
╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚═════╝ ╚══════╝ ╚══════╝╚═╝  ╚═╝╚═════╝
```

# 🏗 DevCollab

### **The all-in-one real-time collaboration platform for developer teams**

> *Jira + Notion + VS Code + Slack — in one app. Zero switching.*

<br>

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

<br>

[![View Demo](https://img.shields.io/badge/🚀_View_Live_Demo-FF6B6B?style=for-the-badge)](https://devcollab.demo.link)
[![Postman Collection](https://img.shields.io/badge/Postman_Collection-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](./DevCollab_Full.postman_collection.json)

<br>

</div>

---

## 📸 Preview

<div align="center">

<!-- Add your demo GIF here -->
![DevCollab Demo](./docs/demo.gif)

> 💡 *Real-time kanban, AI-powered planning, Monaco code editor — all in one window.*

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏛 Architecture](#-architecture)
- [📦 Module Status](#-module-status)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Environment Variables](#️-environment-variables)
- [🤖 AI Intelligence Center](#-ai-intelligence-center)
- [🛣 API Routes](#-api-routes)
- [🐳 Docker Services](#-docker-services)
- [🏆 Hackathon](#-hackathon)
- [👥 Team](#-team)

---

## ✨ Features

<div align="center">

| | Feature | Description |
|---|---|---|
| 🏢 | **Workspace & Projects** | Multi-tenant workspaces with role-based access — Owner / Admin / Member / Viewer |
| 📋 | **Kanban Board** | Real-time drag-and-drop with P0/P1/P2 priorities, assignees, due dates, labels, attachments & @mention comments |
| ⚡ | **Real-time Collaboration** | Socket.IO + Redis pub/sub — live presence indicators, online avatars, task viewers, instant sync across all users |
| 🖥 | **Monaco Code Editor** | Full VS Code engine in-browser with file tree, multi-tab, auto-save & syntax highlighting for 20+ languages |
| 🔖 | **Code Snippet Manager** | Shiki syntax highlighting, tag-based search, copy-to-clipboard, open directly in editor |
| 📝 | **Documentation Wiki** | Tiptap rich-text editor with version history, page linking, image uploads & AI summarization |
| 🤖 | **AI Intelligence Center** | 6 Gemini-powered tools that read your actual project data — plans, reviews, standups and more |
| 💬 | **Project Chat** | WhatsApp-quality messaging with @mentions, emoji reactions, reply threads, edit history & presence |
| 📡 | **Activity Feed** | Live workspace timeline — every action logged and streamed in real time |
| 🔔 | **Notifications** | Real-time push via Socket.IO — @mention alerts, assignment pings, unread count badge |
| 💳 | **Billing & Pro Tier** | Free / Pro plans with Razorpay sandbox checkout and feature-gating via `ProGate` |

</div>

---

## 🏛 Architecture

```
                              ┌─────────────────────────────────────┐
                              │            User's Browser            │
                              └──────────┬──────────────┬────────────┘
                                         │  HTTP        │  WS
                              ┌──────────▼──────────────▼────────────┐
                              │              Nginx (Port 80)          │
                              └──────────┬──────────────┬────────────┘
                                         │              │
                    ┌────────────────────▼──┐   ┌───────▼────────────────────┐
                    │   Frontend (React 18)  │   │   Backend (Fastify / Node)  │
                    │   Vite · Zustand       │   │   TypeScript · JWT Auth     │
                    │   Monaco · Tiptap      │   │   BullMQ · Socket.IO        │
                    │   Socket.IO Client     │   │   Port 3000                 │
                    └───────────────────────┘   └──┬──────┬──────┬────────────┘
                                                   │      │      │
                              ┌────────────────────▼──┐   │      │
                              │  PostgreSQL 16         │   │      │
                              │  (raw pg — no ORM)     │   │      │
                              └───────────────────────┘   │      │
                                                   ┌───────▼──┐   │
                                                   │  Redis 7  │   │
                                                   │ Socket.IO │   │
                                                   │  Adapter  │   │
                                                   │  + Cache  │   │
                                                   └───────────┘   │
                                                          ┌─────────▼──────────┐
                                                          │  External Services  │
                                                          │  ┌───────────────┐ │
                                                          │  │  Gemini API   │ │
                                                          │  │  (AI + Stream)│ │
                                                          │  └───────────────┘ │
                                                          │  ┌───────────────┐ │
                                                          │  │   Razorpay    │ │
                                                          │  │  (Payments)   │ │
                                                          │  └───────────────┘ │
                                                          │  ┌───────────────┐ │
                                                          │  │  SMTP / Email │ │
                                                          │  └───────────────┘ │
                                                          └────────────────────┘
```

> **Horizontally scalable:** The Socket.IO Redis adapter lets you run multiple backend instances behind a load balancer — all instances share real-time state via Redis pub/sub.

---

## 📦 Module Status

| # | Module | Status | Description |
|---|--------|--------|-------------|
| 1 | 🏢 Workspace & Projects | ✅ Complete | Multi-tenant, RBAC (Owner/Admin/Member/Viewer), invite links |
| 2 | 📋 Kanban Board | ✅ Complete | Drag-and-drop, priorities, assignees, due dates, comments |
| 3 | ⚡ Real-time Collaboration | ✅ Complete | Socket.IO + Redis adapter, presence, live cursors |
| 4 | 🖥 Monaco Code Editor | ✅ Complete | VS Code engine, file tree, multi-tab, 20+ languages |
| 5 | 🔖 Code Snippet Manager | ✅ Complete | Shiki highlighting, tag search, editor integration |
| 6 | 📝 Documentation Wiki | ✅ Complete | Tiptap rich text, version history, image uploads |
| 7 | 🤖 AI Intelligence Center | ✅ Complete | 6 Gemini tools — plans, reviews, standups, engineering plans |
| 8 | 💬 Project Chat | ✅ Complete | @mentions, reactions, threads, edit/delete, presence |
| 9 | 📡 Activity Feed | ✅ Complete | Live workspace timeline, all actions streamed in real time |
| 10 | 🔔 Notifications | ✅ Complete | Real-time push, @mention alerts, unread badge count |
| 11 | 💳 Billing | ✅ Complete | Free/Pro tiers, Razorpay sandbox, ProGate feature gating |

---

## 🚀 Quick Start

### 🐳 Docker (Recommended — One Command)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/devcollab.git
cd devcollab

# 2. Copy environment file
cp .env.example .env

# 3. Fill in required secrets (see Environment Variables below)
#    JWT_SECRET, JWT_REFRESH_SECRET, GEMINI_API_KEY

# 4. Launch everything
docker-compose up --build
```

| Service | URL |
|---------|-----|
| 🌐 Frontend | http://localhost |
| ⚙️ Backend API | http://localhost:3000 |
| 🏥 Health Check | http://localhost:3000/api/health |

---

### 💻 Local Development

```bash
# 1. Install all workspace dependencies
npm install

# 2. Start infrastructure services only
docker-compose up -d postgres redis

# 3. Start frontend + backend concurrently
npm run dev
```

| Service | URL |
|---------|-----|
| 🌐 Frontend (Vite HMR) | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:3000 |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GEMINI_MODEL` | ✅ | Primary Gemini model (e.g. `gemini-2.5-flash-preview-05-20`) |
| `GEMINI_FALLBACK_MODEL` | ✅ | Fallback model for quota limits |
| `AI_MOCK_MODE` | ☑️ | Set `true` in dev to skip real AI calls |
| `RAZORPAY_KEY_ID` | ☑️ | Razorpay sandbox key ID |
| `RAZORPAY_KEY_SECRET` | ☑️ | Razorpay sandbox secret |
| `SMTP_HOST` | ☑️ | Email server host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | ☑️ | Email server port (e.g. `587`) |
| `SMTP_USER` | ☑️ | SMTP username / email address |
| `SMTP_PASS` | ☑️ | SMTP app password |
| `FRONTEND_URL` | ☑️ | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `PORT` | ☑️ | Backend server port (default: `3000`) |

> ✅ = required to run · ☑️ = required for that feature

---

## 🤖 AI Intelligence Center

Powered by **Google Gemini** — six AI tools that read your *actual* project data:

<details>
<summary>📖 Expand AI Feature Details</summary>

<br>

| Tool | What it does |
|------|-------------|
| 🗓 **Wiki Plan Generator** | Reads your wiki requirements → streams a week-by-week delivery plan → **auto-creates tasks on the board in real time** |
| 🔍 **Code Reviewer** | Analyses any code snippet → returns quality score (1–10), bug list, security issues & performance notes |
| 📊 **Project Summariser** | Reads all your project tasks → produces a health report with blockers, velocity & risk signals |
| ☀️ **Standup Generator** | Reads last 24 h of activity → outputs a formatted standup report ready to paste in Slack |
| 🛠 **Engineering Plan** | Describe a feature → generates 8 actionable subtasks and **adds them to your Kanban board automatically** |
| 💡 **Snippet Explainer** | Pastes any code snippet → returns a plain-English explanation of what it does |

</details>

---

## 🛣 API Routes

<details>
<summary>📋 Full API Reference</summary>

<br>

All routes are prefixed with `/api`. JWT Bearer token required on protected routes.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login and receive JWT pair |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/me` | Get current authenticated user |
| — | — | — |
| `GET` | `/api/workspaces` | List user's workspaces |
| `POST` | `/api/workspaces` | Create a new workspace |
| `GET` | `/api/workspaces/:id` | Get workspace details |
| `PATCH` | `/api/workspaces/:id` | Update workspace |
| `DELETE` | `/api/workspaces/:id` | Delete workspace |
| `POST` | `/api/workspaces/:id/invite` | Generate invite link |
| `GET` | `/api/workspaces/:id/members` | List workspace members |
| — | — | — |
| `GET` | `/api/projects` | List projects in workspace |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id` | Get project |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |
| — | — | — |
| `GET` | `/api/tasks/project/:projectId` | List tasks (filterable by status/priority) |
| `POST` | `/api/tasks` | Create task |
| `GET` | `/api/tasks/:id` | Get task with comments |
| `PATCH` | `/api/tasks/:id` | Update task (status, priority, assignee…) |
| `DELETE` | `/api/tasks/:id` | Delete task |
| `POST` | `/api/tasks/:id/comments` | Add comment |
| `GET` | `/api/tasks/:id/comments` | Get task comments |
| — | — | — |
| `GET` | `/api/snippets/project/:projectId` | List snippets |
| `POST` | `/api/snippets` | Create snippet |
| `GET` | `/api/snippets/:id` | Get snippet |
| `PATCH` | `/api/snippets/:id` | Update snippet |
| `DELETE` | `/api/snippets/:id` | Delete snippet |
| `GET` | `/api/snippets/project/:id/search?q=` | Search by title or tags |
| — | — | — |
| `GET` | `/api/wiki/:projectId` | Get wiki pages |
| `POST` | `/api/wiki` | Create wiki page |
| `PATCH` | `/api/wiki/:id` | Update wiki page |
| `DELETE` | `/api/wiki/:id` | Delete wiki page |
| — | — | — |
| `GET` | `/api/chat/:projectId/messages` | Get chat messages |
| `POST` | `/api/chat/:projectId/messages` | Send message |
| — | — | — |
| `GET` | `/api/activity/:workspaceId` | Get workspace activity feed |
| `GET` | `/api/notifications` | Get user notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark notification as read |
| — | — | — |
| `GET` | `/api/ai/tools` | List available AI tools |
| `POST` | `/api/ai/run` | Run an AI tool (streaming SSE) |
| — | — | — |
| `GET` | `/api/billing/plans` | Get billing plans |
| `POST` | `/api/billing/checkout` | Initiate Razorpay checkout |
| `POST` | `/api/billing/verify` | Verify payment signature |
| — | — | — |
| `GET` | `/api/health` | Health check |

</details>

---

## 🐳 Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | Custom build | `80 → 5173` | React + Vite dev server |
| `backend` | Custom build | `3000` | Fastify API + Socket.IO |
| `postgres` | `postgres:16-alpine` | `5432` | Primary database |
| `redis` | `redis:7-alpine` | `6379` | Pub/sub + job queues |

```bash
# Useful Docker commands
docker-compose up --build        # Build and start all services
docker-compose up -d postgres redis  # Start only infra
docker-compose down              # Stop all services
docker-compose logs -f backend   # Stream backend logs
docker-compose ps                # Check service health
```

---

## 🏆 Hackathon

<div align="center">

```
╔══════════════════════════════════════════════════════════╗
║      DevFusion: The Developers Hackathon 2.0             ║
║      Problem Statement: #26ENDC6 — DevCollab             ║
║      Built in 10 days · 4 engineers · 0 sleep            ║
╚══════════════════════════════════════════════════════════╝
```

</div>

> **Why DevCollab?**
>
> Developer teams lose hours daily juggling Jira for tasks, Notion for docs, VS Code for code, and Slack for chat — four separate tools that don't talk to each other. DevCollab collapses all of that into a single, AI-aware, real-time platform. Every module is purpose-built for how engineering teams actually work, and the AI layer reads your *actual* project data — not generic summaries — to deliver plans and insights that are immediately useful.

### What Makes It Different

| Principle | Implementation |
|-----------|---------------|
| 🔁 **Zero app switching** | Board, editor, wiki, chat, snippets — all in one sidebar nav |
| ⚡ **Real-time by default** | Every action broadcasts via Socket.IO instantly — no polling, no refresh |
| 🧠 **AI that knows your project** | Gemini reads your real wiki pages and tasks before responding |
| 📈 **Production-grade architecture** | Redis adapter enables horizontal scaling of real-time layer |
| 🐳 **Fully Dockerized** | One `docker-compose up --build` and the entire stack is running |

---

## 👥 Team

<div align="center">

| 👤 Member | 🏗 Modules |
|-----------|-----------|
| **Member 1** | Auth system · Workspace management · Database schema & migrations |
| **Member 2** | Real-time engine (Socket.IO) · AI Intelligence Center (Gemini) · Notifications |
| **Member 3** | Kanban UI · Documentation Wiki · Code Snippet Manager |
| **Member 4** | App shell & routing · Monaco Code Editor · Billing (Razorpay) |

</div>

---

## 🗂 Project Structure

```
devcollab/
├── apps/
│   ├── frontend/              # React 18 + Vite + TypeScript
│   │   └── src/
│   │       ├── components/    # Shared UI components
│   │       ├── pages/         # Route-level pages (board, editor, wiki…)
│   │       ├── stores/        # Zustand global state
│   │       ├── hooks/         # Custom React hooks
│   │       ├── services/      # API service layer
│   │       └── lib/           # Axios instance, socket client
│   └── backend/               # Fastify + Node.js + TypeScript
│       └── src/
│           ├── modules/       # Feature modules (auth, task, wiki, ai…)
│           ├── socket/        # Socket.IO server + event handlers
│           ├── db/            # Raw pg queries & migrations
│           ├── middleware/     # Auth, error handling
│           ├── redis/         # Redis client + pub/sub helpers
│           └── utils/         # Shared utilities
├── docker-compose.yml         # Full stack orchestration
├── docker-compose.prod.yml    # Production configuration
└── .env.example               # Environment variable template
```

---

## 🛠 Tech Stack

<details>
<summary>📦 Full Dependency List</summary>

<br>

**Frontend**

| Package | Purpose |
|---------|---------|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| TypeScript | Type safety |
| TailwindCSS | Utility-first styling |
| Monaco Editor | VS Code engine in-browser |
| Tiptap | Rich text editor (Wiki) |
| Socket.IO Client | Real-time bi-directional events |
| Zustand | Lightweight global state |
| Lucide React | Icon library |
| Shiki | Syntax highlighting (snippets) |

**Backend**

| Package | Purpose |
|---------|---------|
| Fastify | High-performance HTTP server |
| Node.js | JavaScript runtime |
| TypeScript | Type safety |
| `pg` (raw) | PostgreSQL driver — no ORM |
| Redis (`ioredis`) | Pub/sub, caching, adapter |
| Socket.IO | WebSocket server |
| `@socket.io/redis-adapter` | Horizontal scaling |
| BullMQ | Background job queues |
| JWT (`@fastify/jwt`) | Authentication tokens |

**External Services**

| Service | Usage |
|---------|-------|
| Google Gemini API | AI tools (streaming SSE) |
| Razorpay | Payment processing (sandbox) |
| SMTP | Email notifications & invites |

</details>

---

<div align="center">

<br>

```
Built with ❤️ by Team Thunder
DevFusion: The Developers Hackathon 2.0 · Problem Statement #26ENDC6
```

![Made with love](https://img.shields.io/badge/Made_with-❤️-FF6B6B?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/DevFusion_2.0-Hackathon-FF9500?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Built_in_10_days-22c55e?style=for-the-badge)

</div>
