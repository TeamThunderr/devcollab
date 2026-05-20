# DevCollab Module 2 & 5 - Quick Start Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Environment Setup

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/devcollab"
JWT_SECRET="your-jwt-secret-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
```

### Frontend (.env.local)
```env
VITE_API_URL="http://localhost:3000"
```

## Installation & Running

### 1. Backend Setup
```bash
cd apps/backend

# Install dependencies
npm install

# Set up the database schema
npm run db:push

# (Optional) Run migrations
npm run db:migrate

# Start the development server
npm run dev
```

Backend will be available at `http://localhost:3000`

### 2. Frontend Setup
```bash
cd apps/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Database Schema

The Prisma schema automatically creates these tables:
- `users` - User accounts
- `projects` - Projects
- `tasks` - Tasks with status and priority
- `comments` - Task comments
- `snippets` - Code snippets

## API Endpoints Overview

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/project/:projectId` - List tasks
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/comments` - Add comment
- `GET /api/tasks/:id/comments` - Get comments

### Snippets
- `POST /api/snippets` - Create snippet
- `GET /api/snippets/project/:projectId` - List snippets
- `GET /api/snippets/project/:projectId/search?q=query` - Search snippets
- `GET /api/snippets/:id` - Get snippet
- `PATCH /api/snippets/:id` - Update snippet
- `DELETE /api/snippets/:id` - Delete snippet

## File Structure

### Backend
```
apps/backend/
├── src/
│   ├── modules/
│   │   ├── project/
│   │   │   ├── project.schema.ts      # Zod schemas
│   │   │   ├── project.service.ts     # Business logic
│   │   │   ├── project.controller.ts  # Handlers
│   │   │   └── project.routes.ts      # Routes
│   │   ├── task/
│   │   │   ├── task.schema.ts
│   │   │   ├── task.service.ts
│   │   │   ├── task.controller.ts
│   │   │   └── task.routes.ts
│   │   └── snippet/
│   │       ├── snippet.schema.ts
│   │       ├── snippet.service.ts
│   │       ├── snippet.controller.ts
│   │       └── snippet.routes.ts
│   ├── db/
│   │   ├── client.ts              # PostgreSQL connection
│   │   └── prisma.ts              # Prisma client
│   └── index.ts                   # Server entry point
├── prisma/
│   └── schema.prisma              # Database schema
└── package.json
```

### Frontend
```
apps/frontend/
├── src/
│   ├── components/
│   │   └── kanban/
│   │       ├── TaskCard.tsx
│   │       ├── KanbanColumn.tsx
│   │       └── SnippetCard.tsx
│   ├── pages/
│   │   ├── project/
│   │   │   ├── ProjectView.tsx     # Projects list page
│   │   │   └── TasksView.tsx       # Kanban board page
│   │   └── snippets/
│   │       └── SnippetsView.tsx    # Snippets page
│   ├── stores/
│   │   ├── projectStore.ts         # Project state management
│   │   ├── taskStore.ts            # Task state management
│   │   └── snippetStore.ts         # Snippet state management
│   ├── types/
│   │   └── index.ts                # Type definitions
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

## Testing the Implementation

### 1. Create a Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Project", "description": "Test project"}'
```

### 2. Create a Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build login",
    "projectId": "YOUR_PROJECT_ID",
    "status": "TODO",
    "priority": "P1",
    "description": "Implement user login"
  }'
```

### 3. Add a Comment
```bash
curl -X POST http://localhost:3000/api/tasks/YOUR_TASK_ID/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Started working on this"}'
```

### 4. Create a Snippet
```bash
curl -X POST http://localhost:3000/api/snippets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React Hook",
    "language": "typescript",
    "code": "const [state, setState] = useState(0);",
    "projectId": "YOUR_PROJECT_ID",
    "tags": ["react", "hooks"]
  }'
```

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Run `npm run db:push` to sync schema

### Frontend Can't Connect to Backend
- Ensure backend is running on port 3000
- Check VITE_API_URL environment variable
- Check CORS settings in backend

### Prisma Type Errors
- Run `npx prisma generate` to regenerate Prisma client
- Clear node_modules and reinstall if needed

## Performance Notes

- Task list filtering is done on the frontend (client-side)
- Snippet search is done on the backend (server-side)
- All list endpoints return data in descending creation order
- Comments are included with task fetch for convenience

## Security Notes

- Currently using `test-user` as placeholder (integrate with auth)
- All endpoints should verify user ownership
- Add rate limiting before production
- Enable HTTPS in production
