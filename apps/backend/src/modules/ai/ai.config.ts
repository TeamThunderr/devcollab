/**
 * apps/backend/src/modules/ai/ai.config.ts
 *
 * Mock responses for development — returned verbatim when AI_MOCK_MODE=true.
 * This prevents accidental API quota burn during local development.
 *
 * Each key matches an AI feature endpoint.
 * The real Gemini responses will mirror this structure so the frontend
 * does not need to change when mock mode is disabled.
 */

export const mockResponses = {
  codeReview: `SCORE:8

## Code Review Results

**Overall Quality: 8/10** — Good code with minor improvements needed.

### ✅ Strengths
- Clean async/await usage throughout
- Good separation of concerns
- Proper error handling in most places

### ⚠️ Issues Found

**1. Missing try/catch on line 9**
\`\`\`typescript
// Current
await Promise.all([pubClient.connect(), subClient.connect()])

// Suggested
try {
  await Promise.all([pubClient.connect(), subClient.connect()])
} catch (err) {
  console.error('Redis connection failed:', err)
  process.exit(1)
}
\`\`\`

**2. Performance — consider connection pooling**
Creating new clients on every request adds latency.
Use a singleton pattern instead.

### 🔒 Security
- No hardcoded secrets detected ✅
- Environment variables used correctly ✅

### 📋 Summary
Good foundation. Add error boundaries and you're production ready.`,

  projectSummary: `## Project Health Summary

**Overall Status: 🟡 On Track with Risks**

### Progress
- ✅ 5 tasks completed this sprint
- 🔄 3 tasks in progress  
- 👀 2 tasks in review
- 📋 4 tasks remaining

### Blockers Detected
- "Socket.IO room management" has been In Progress for 2+ days
- No assignee on 2 high priority tasks

### Team Velocity
Current pace suggests **Day 6 completion** for current sprint.
At risk: Redis adapter task if not resolved today.

### Recommendation
Unblock the Socket.IO task first — 3 other tasks depend on it.`,

  standupReport: `## Daily Standup — ${new Date().toLocaleDateString()}

**Arjun Kumar**
- ✅ Completed: Docker Compose setup, Redis connection
- 🔄 Working on: Socket.IO room management  
- 🚧 Blocked: None

**Riya Shah**  
- ✅ Completed: User login API, JWT middleware
- 🔄 Working on: Kanban drag and drop
- 🚧 Blocked: Waiting for task API endpoints

**Dev Mehta**
- ✅ Completed: JWT auth review
- 🔄 Working on: Razorpay integration
- 🚧 Blocked: None

**Sneha Nair**
- ✅ Completed: Tiptap editor setup
- 🔄 Working on: Monaco editor integration
- 🚧 Blocked: None`,

  taskBreakdown: JSON.stringify([
    {
      title: "Create database schema",
      description:
        "Define all required tables and relationships in PostgreSQL",
      priority: "p0",
    },
    {
      title: "Build REST API endpoints",
      description:
        "CRUD operations with proper validation using Zod",
      priority: "p0",
    },
    {
      title: "Add authentication middleware",
      description: "Protect routes using JWT verify middleware",
      priority: "p0",
    },
    {
      title: "Write unit tests",
      description: "Test all service functions with edge cases",
      priority: "p1",
    },
    {
      title: "Build frontend components",
      description: "React components with TypeScript interfaces",
      priority: "p1",
    },
    {
      title: "Connect frontend to API",
      description:
        "Axios calls with proper error handling and loading states",
      priority: "p1",
    },
    {
      title: "Add error handling",
      description:
        "Global error boundaries and user-friendly error messages",
      priority: "p2",
    },
    {
      title: "Write documentation",
      description:
        "API docs and component usage guide in wiki",
      priority: "p2",
    },
  ]),
} as const;

export type MockResponseKey = keyof typeof mockResponses;
