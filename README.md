# DevCollab
Real-time developer collaboration platform.
Jira + Notion + VS Code in one app.

## Stack
- Frontend: React 18 + Vite + TailwindCSS + Monaco + Tiptap
- Backend: Node.js + Fastify + PostgreSQL (raw pg) + Redis
- Real-time: Socket.IO + Redis adapter
- AI: Google Gemini API
- Payments: Razorpay sandbox
- Infra: Docker Compose

## Quick start (Docker — recommended)
```
cp .env.example .env
# Fill in JWT_SECRET, JWT_REFRESH_SECRET, GEMINI_API_KEY
docker-compose up --build
```
Frontend: http://localhost
Backend:  http://localhost:3000
API docs: http://localhost:3000/api/health

## Quick start (local dev)
```
npm install
docker-compose up -d postgres redis
npm run dev
```
Frontend: http://localhost:5173
Backend:  http://localhost:3000

## Module status
| Module | Status |
|--------|--------|
| Auth + Workspace | ✅ Complete |
| Real-time (Socket.IO) | ✅ Complete |
| AI Assistant (Gemini) | ✅ Complete |
| Task Management | 🔄 In progress |
| Kanban UI | 🔄 In progress |
| Monaco Editor | ✅ Complete |
| Wiki | 🔄 In progress |
| Snippets | 🔄 In progress |
| Activity Feed | 🔄 In progress |
| Payments | 🔄 In progress |

## Team
- Person 1: Auth + Workspace + DB
- Person 2: Real-time + AI (you)
- Person 3: Kanban + Wiki + Snippets
- Person 4: App Shell + Monaco Editor
