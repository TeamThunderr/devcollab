# Frontend Component Documentation

## Overview
The DevCollab frontend is built with React, Vite, TypeScript, TailwindCSS, and Zustand for state management.

---

## Components

### TaskCard
**Location:** `src/components/kanban/TaskCard.tsx`

**Props:**
```typescript
interface TaskCardProps {
  task: Task
  onClick?: (task: Task) => void
  draggable?: boolean
}
```

**Features:**
- Displays task title, description, priority, and status
- Shows comment count
- Displays due date if set
- Color-coded priority badges (P0: red, P1: yellow, P2: green)
- Color-coded status badges
- Clickable to open task detail modal
- Draggable support (for future drag-and-drop)

**Example:**
```jsx
<TaskCard 
  task={task} 
  onClick={(t) => setSelectedTask(t)}
  draggable={true}
/>
```

---

### KanbanColumn
**Location:** `src/components/kanban/KanbanColumn.tsx`

**Props:**
```typescript
interface KanbanColumnProps {
  title: string
  status: string
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}
```

**Features:**
- Displays column title with task count
- Renders TaskCard for each task in column
- Shows "No tasks" message when empty
- Responsive grid layout
- Min-height of 500px for visibility

**Example:**
```jsx
<KanbanColumn
  title="To Do"
  status="TODO"
  tasks={todoTasks}
  onTaskClick={(t) => setSelectedTask(t)}
/>
```

---

### SnippetCard
**Location:** `src/components/kanban/SnippetCard.tsx`

**Props:**
```typescript
interface SnippetCardProps {
  snippet: Snippet
  onCopy?: (code: string) => void
  onDelete?: (id: string) => void
  onClick?: (snippet: Snippet) => void
}
```

**Features:**
- Displays snippet title and language badge
- Shows description if available
- Displays tags with filtering capability
- Syntax-highlighted code preview
- Copy button (copies full code to clipboard)
- Delete button
- Clickable to open full snippet view

**Example:**
```jsx
<SnippetCard
  snippet={snippet}
  onCopy={(code) => navigator.clipboard.writeText(code)}
  onDelete={(id) => handleDelete(id)}
  onClick={(s) => setSelectedSnippet(s)}
/>
```

---

## Pages

### ProjectsPage (ProjectView)
**Location:** `src/pages/project/ProjectView.tsx`

**Features:**
- ✅ List all user projects in grid layout
- ✅ Show task and snippet counts per project
- ✅ Create new project with form
- ✅ Delete existing projects
- ✅ Navigation to project details

**State Management:**
- Uses `useProjectStore()` from Zustand
- Manages project list, loading state, errors

**Keyboard/Interaction:**
- Click "New Project" to toggle form
- Click project "View" to navigate
- Click "Delete" to remove project (with confirmation)

**Example Usage:**
```jsx
function App() {
  return <ProjectView />
}
```

---

### TasksPage (TasksView)
**Location:** `src/pages/project/TasksView.tsx`

**Features:**
- ✅ Kanban board with 4 columns
- ✅ Create new task with form
- ✅ Task detail modal with:
  - Status dropdown (change status)
  - Priority display
  - Due date display
  - Comment section
  - Add comment form
  - Delete task button
- ✅ Filter by priority
- ✅ Responsive layout

**State Management:**
- Uses `useTaskStore()` from Zustand
- Manages tasks, selected task, loading, errors

**Available Filters:**
- By Priority (P0, P1, P2)
- By Status (TODO, IN_PROGRESS, IN_REVIEW, DONE)

**Task Modal Features:**
```typescript
// Task detail modal shows:
- Task title and description
- Current status (editable dropdown)
- Priority level
- Due date
- Comments section with:
  - Comment input field
  - List of existing comments
  - Comment author and timestamp
- Delete button for entire task
```

**Example:**
```jsx
function ProjectTasksPage() {
  const { pid } = useParams()
  return <TasksView />
}
```

---

### SnippetsPage (SnippetsView)
**Location:** `src/pages/snippets/SnippetsView.tsx`

**Features:**
- ✅ List all project snippets in grid
- ✅ Create new snippet with form including:
  - Title input
  - Language selector (9 languages)
  - Code textarea
  - Description
  - Tags (comma-separated)
- ✅ Instant search by title and tags
- ✅ Full snippet modal with:
  - Syntax highlighted code (Shiki)
  - Code copy button
  - Delete button
  - Tag display

**State Management:**
- Uses `useSnippetStore()` from Zustand
- Manages snippets, loading, errors

**Syntax Highlighting:**
- Uses Shiki library
- Theme: GitHub Dark
- Supports: JavaScript, TypeScript, Python, SQL, Bash, HTML, CSS, JSON, XML

**Supported Languages:**
```
- javascript
- typescript
- python
- sql
- bash
- html
- css
- json
- xml
```

**Search:**
- Real-time filtering as user types
- Searches snippet titles
- Searches snippet tags
- Server-side search when form submitted

**Example:**
```jsx
function SnippetsPageView() {
  const { pid } = useParams()
  return <SnippetsView />
}
```

---

## Zustand Stores

### ProjectStore
**Location:** `src/stores/projectStore.ts`

**State:**
```typescript
interface ProjectStore {
  projects: Project[]
  loading: boolean
  error?: string
  fetchProjects: () => Promise<void>
  createProject: (title, description?) => Promise<Project>
  updateProject: (id, title, description?) => Promise<Project>
  deleteProject: (id) => Promise<void>
  getProjectById: (id) => Project | undefined
}
```

**Usage:**
```jsx
const { projects, fetchProjects, createProject } = useProjectStore()

useEffect(() => {
  fetchProjects()
}, [fetchProjects])
```

---

### TaskStore
**Location:** `src/stores/taskStore.ts`

**State:**
```typescript
interface TaskStore {
  tasks: Task[]
  loading: boolean
  error?: string
  selectedTask?: Task
  fetchTasksByProject: (projectId) => Promise<void>
  createTask: (title, description, projectId, status, priority, dueDate?) => Promise<Task>
  updateTask: (id, updates) => Promise<Task>
  deleteTask: (id) => Promise<void>
  updateTaskStatus: (id, status) => Promise<Task>
  addComment: (taskId, content) => Promise<Comment>
  getTaskComments: (taskId) => Promise<Comment[]>
  setSelectedTask: (task?) => void
  getTasksByStatus: (status) => Task[]
  getTasksByPriority: (priority) => Task[]
}
```

**Usage:**
```jsx
const { tasks, updateTaskStatus } = useTaskStore()

// Change task status
await updateTaskStatus(taskId, 'IN_PROGRESS')

// Filter by status
const todoTasks = useTaskStore(state => 
  state.getTasksByStatus('TODO')
)
```

---

### SnippetStore
**Location:** `src/stores/snippetStore.ts`

**State:**
```typescript
interface SnippetStore {
  snippets: Snippet[]
  loading: boolean
  error?: string
  fetchSnippetsByProject: (projectId) => Promise<void>
  createSnippet: (title, language, code, description, tags, projectId) => Promise<Snippet>
  updateSnippet: (id, updates) => Promise<Snippet>
  deleteSnippet: (id) => Promise<void>
  searchSnippets: (projectId, query) => Promise<void>
  filterSnippets: (predicate) => Snippet[]
}
```

**Usage:**
```jsx
const { snippets, createSnippet, searchSnippets } = useSnippetStore()

// Create snippet
await createSnippet(
  'My Hook',
  'typescript',
  'const [state, setState] = useState()',
  'Custom hook',
  ['react', 'hooks'],
  projectId
)

// Search
await searchSnippets(projectId, 'react')
```

---

## Type Definitions

**Location:** `src/types/index.ts`

```typescript
interface User {
  id: string
  email: string
  name?: string
}

interface Project {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  createdBy: User
  _count?: { tasks: number; snippets: number }
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority: 'P0' | 'P1' | 'P2'
  dueDate?: string
  projectId: string
  createdAt: string
  updatedAt: string
  createdBy: User
  comments: Comment[]
}

interface Comment {
  id: string
  content: string
  createdAt: string
  createdBy: User
}

interface Snippet {
  id: string
  title: string
  language: string
  code: string
  description?: string
  tags: string[]
  projectId: string
  createdAt: string
  updatedAt: string
  createdBy: User
}
```

---

## Styling

All components use **TailwindCSS** for styling:

### Color Scheme
- **Primary:** Blue (blue-500, blue-600)
- **Success:** Green (green-500, green-600)
- **Danger:** Red (red-500, red-600)
- **Warning:** Yellow (yellow-100, yellow-800)
- **Background:** White/Gray (gray-50, gray-100)
- **Text:** Gray (gray-900, gray-700, gray-600)

### Responsive Design
- Mobile-first approach
- Grid layouts adjust for md and lg breakpoints
- Overflow handling for Kanban board

---

## Keyboard Shortcuts
- Press Escape to close modals
- Tab through form fields

---

## Accessibility
- Semantic HTML elements
- Proper ARIA labels
- Color contrast ratios meet WCAG standards
- Form inputs have associated labels
- Focus states visible

---

## Performance Optimizations
- Zustand for efficient state management
- React functional components with hooks
- Lazy loading of modals
- Debounced search (optional, can be added)

---

## Future Enhancements

### Planned Features
1. **Drag-and-Drop**: Integrate @dnd-kit for Kanban board
2. **Task Assignments**: Assign tasks to team members
3. **Due Date Picker**: Calendar widget for due dates
4. **Bulk Actions**: Select and edit multiple tasks/snippets
5. **Undo/Redo**: History management
6. **Dark Mode**: Theme switcher
7. **Notifications**: Toast notifications for actions
8. **Rich Text Editor**: For task descriptions and comments
9. **Attachments**: Upload files to tasks
10. **Collaboration**: Real-time updates via WebSockets

---

## Testing
```bash
# Run frontend tests (when added)
npm run test

# Run type checking
npm run type-check

# Build for production
npm run build
```
