# DevCollab — AI-Powered Real-Time Developer Collaboration Platform 🚀

**DevCollab** is a cutting-edge, real-time collaboration platform for developers. It combines the power of AI with seamless collaboration tools to help teams code better, together.

## Features

- ⚡ **Real-Time Collaboration**: Work together on code with live cursors, presence indicators, and instant updates.
- 🤖 **AI Code Assistant**: Get intelligent code suggestions, automatic reviews, explanations, and code generation powered by AI.
- 💼 **Workspace Management**: Create and manage workspaces with multiple projects, members, and settings.
- 📂 **Project Management**: Organize work into projects with tasks, timelines, and progress tracking.
- 💬 **Chat & Communication**: Integrated chat with threaded conversations for team discussions.
- 📤 **File Sharing**: Securely share code snippets and files with your team.
- 🚀 **Deploy Instantly**: One-click deployment to Vercel with full CI/CD integration.
- 💾 **Markdown Editor**: In-built Markdown editor for documentation and notes.
- 🎨 **Beautiful UI**: Modern, responsive design with dark mode support.

## Tech Stack

### Frontend

- **React 19 + TypeScript** — Modern, type-safe UI development
- **Next.js 16** — Production-ready React framework with App Router
- **Shadcn UI** — Beautiful, unstyled, customizable UI components
- **Tailwind CSS 4** — Utility-first CSS framework
- **Radix UI** — Unstyled, accessible components
- **Lucide Icons** — Feather-light icon library
- **Zustand** — Simple, fast state management
- **React Router DOM v7** — Declarative routing

### Backend

- **Node.js + TypeScript** — High-performance backend
- **Fastify** — Ultra-fast web framework
- **Socket.io** — Real-time bidirectional communication
- **BullMQ** — High-performance Redis-based job queue
- **PostgreSQL** — Robust relational database
- **Redis** — In-memory data store and cache
- **JWT** — Secure authentication
- **Bcrypt** — Password hashing

## Getting Started

### Prerequisites

- **Node.js** 18+  
- **PostgreSQL** 16+  
- **Redis** 7+  
- **Vercel Account** (for deployment)

### Installation

```bash
# Install root dependencies
npm install

# Start backend
npm run dev --workspace=apps/backend

# Start frontend
npm run dev --workspace=apps/frontend
```

## Project Structure

```
devcollab/
├── apps/
│   ├── frontend/   # React + Next.js + Tailwind UI
│   └── backend/    # Fastify + Socket.io + PostgreSQL API
├── docker/         # Docker configurations for Postgres + Redis
├── docker-compose.yml # One-command setup
├── .gitignore      # Ignored files and directories
└── README.md       # Project documentation
```

## Docker Setup

```bash
# Start services with Docker
npm run docker:up

# Stop services
npm run docker:down
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend development servers |
| `npm run docker:up` | Start Postgres + Redis with Docker |
| `npm run docker:down` | Stop Docker services |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.