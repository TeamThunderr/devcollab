# DevCollab API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently using placeholder `test-user`. Integration with JWT auth is required.

---

## Projects API

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "title": "string (required)",
  "description": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "cuid",
  "title": "string",
  "description": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdById": "string",
  "createdBy": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  }
}
```

### List Projects
```http
GET /api/projects
```

**Response (200):**
```json
[
  {
    "id": "cuid",
    "title": "string",
    "description": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "createdBy": {
      "id": "string",
      "email": "string",
      "name": "string | null"
    },
    "_count": {
      "tasks": "number",
      "snippets": "number"
    }
  }
]
```

### Get Project
```http
GET /api/projects/:id
```

**Response (200):** Project object (same as Create)
**Response (404):** `{ "error": "Project not found" }`

### Update Project
```http
PATCH /api/projects/:id
Content-Type: application/json

{
  "title": "string (optional)",
  "description": "string (optional)"
}
```

**Response (200):** Updated project object

### Delete Project
```http
DELETE /api/projects/:id
```

**Response (204):** No content

---

## Tasks API

### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
  "title": "string (required)",
  "description": "string (optional)",
  "projectId": "string (required)",
  "status": "TODO | IN_PROGRESS | IN_REVIEW | DONE (default: TODO)",
  "priority": "P0 | P1 | P2 (default: P1)",
  "dueDate": "ISO8601 (optional)"
}
```

**Response (201):**
```json
{
  "id": "cuid",
  "title": "string",
  "description": "string | null",
  "status": "TODO | IN_PROGRESS | IN_REVIEW | DONE",
  "priority": "P0 | P1 | P2",
  "dueDate": "ISO8601 | null",
  "projectId": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdById": "string",
  "createdBy": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  },
  "comments": []
}
```

### List Tasks by Project
```http
GET /api/tasks/project/:projectId?status=TODO&priority=P0
```

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority

**Response (200):** Array of task objects

### Get Task
```http
GET /api/tasks/:id
```

**Response (200):** Task object with comments included
**Response (404):** `{ "error": "Task not found" }`

### Update Task
```http
PATCH /api/tasks/:id
Content-Type: application/json

{
  "title": "string (optional)",
  "description": "string (optional)",
  "status": "TODO | IN_PROGRESS | IN_REVIEW | DONE (optional)",
  "priority": "P0 | P1 | P2 (optional)",
  "dueDate": "ISO8601 (optional)"
}
```

**Response (200):** Updated task object

### Delete Task
```http
DELETE /api/tasks/:id
```

**Response (204):** No content

---

## Task Comments API

### Add Comment
```http
POST /api/tasks/:taskId/comments
Content-Type: application/json

{
  "content": "string (required, min 1 char)"
}
```

**Response (201):**
```json
{
  "id": "cuid",
  "content": "string",
  "createdAt": "ISO8601",
  "taskId": "string",
  "createdById": "string",
  "createdBy": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  }
}
```

### Get Task Comments
```http
GET /api/tasks/:taskId/comments
```

**Response (200):** Array of comment objects

---

## Snippets API

### Create Snippet
```http
POST /api/snippets
Content-Type: application/json

{
  "title": "string (required)",
  "language": "string (required, e.g. 'javascript', 'typescript', 'python')",
  "code": "string (required)",
  "description": "string (optional)",
  "tags": ["string"] (optional, default: []),
  "projectId": "string (required)"
}
```

**Response (201):**
```json
{
  "id": "cuid",
  "title": "string",
  "language": "string",
  "code": "string",
  "description": "string | null",
  "tags": ["string"],
  "projectId": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdById": "string",
  "createdBy": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  }
}
```

### List Snippets
```http
GET /api/snippets/project/:projectId
```

**Response (200):** Array of snippet objects

### Get Snippet
```http
GET /api/snippets/:id
```

**Response (200):** Snippet object
**Response (404):** `{ "error": "Snippet not found" }`

### Update Snippet
```http
PATCH /api/snippets/:id
Content-Type: application/json

{
  "title": "string (optional)",
  "language": "string (optional)",
  "code": "string (optional)",
  "description": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response (200):** Updated snippet object

### Delete Snippet
```http
DELETE /api/snippets/:id
```

**Response (204):** No content

### Search Snippets
```http
GET /api/snippets/project/:projectId/search?q=react
```

**Query Parameters:**
- `q` (required): Search query (searches title and tags)

**Response (200):** Array of matching snippet objects

---

## Data Types

### Task Status Enum
```
TODO
IN_PROGRESS
IN_REVIEW
DONE
```

### Priority Enum
```
P0  # Critical
P1  # High
P2  # Low
```

### Supported Languages
```
javascript
typescript
python
sql
bash
html
css
json
xml
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found message"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Example Workflows

### Create a Project with Tasks

1. **Create Project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title": "E-Commerce App", "description": "Build new e-commerce platform"}'
# Returns: projectId
```

2. **Create Task:**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design database schema",
    "projectId": "proj_123",
    "status": "TODO",
    "priority": "P0",
    "description": "Create database schema for products and orders"
  }'
# Returns: taskId
```

3. **Add Comment:**
```bash
curl -X POST http://localhost:3000/api/tasks/task_456/comments \
  -H "Content-Type: application/json" \
  -d '{"content": "Started database design, will have it ready by Friday"}'
```

4. **Update Task Status:**
```bash
curl -X PATCH http://localhost:3000/api/tasks/task_456 \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

### Create and Search Code Snippets

1. **Create Snippet:**
```bash
curl -X POST http://localhost:3000/api/snippets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "React useEffect Hook",
    "language": "typescript",
    "code": "useEffect(() => { /* effect code */ }, [dependencies]);",
    "projectId": "proj_123",
    "tags": ["react", "hooks", "effect"],
    "description": "Common React hook pattern"
  }'
```

2. **Search Snippets:**
```bash
curl http://localhost:3000/api/snippets/project/proj_123/search?q=react
```

---

## Rate Limiting
Not yet implemented. Recommended to add before production.

## Pagination
Not yet implemented. Recommended to add for large datasets.

## CORS
CORS is enabled for `FRONTEND_URL` environment variable.
