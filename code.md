# DevCollab Development Documentation

This document serves as a comprehensive record of the architectural features, modules, and integrations developed for the **DevCollab** platform, specifically focusing on the **Monaco Code Editor** and the **Documentation Wiki** modules.

---

## 1. Monaco Code Editor Module

The code editor module was built to provide a lightweight, single-user, IDE-like experience directly in the browser, powered by the core VS Code engine.

### Core Features & UI
- **VS Code Engine Integration**: Utilized `@monaco-editor/react` to embed the full Monaco editor, providing native syntax highlighting, autocomplete, and code folding for multiple languages including JavaScript, Python, Java, C++, and Go.
- **Theme Management**: Integrated a Dark / Light theme toggle that dynamically switches the Monaco editor instance between `vs-dark` and `light` themes to match the user's preference.
- **Multi-File Tabs**: Engineered a tabbed interface allowing users to open multiple files simultaneously. State is managed via Zustand (`editorStore`), keeping track of the `activeFileId` and the array of `openFiles`.
- **Single-User Architecture**: Intentionally omitted real-time co-editing (e.g., Yjs/WebRTC) to ensure a streamlined, conflict-free, single-user development environment per file.

### File System & Auto-Save
- **Project-Based File Tree**: Created a hierarchical file explorer sidebar. Users can seamlessly create new files, create folders, rename existing items, and delete files directly from the UI.
- **Debounced Auto-Save**: Implemented a background auto-save mechanism. As the user types in the Monaco editor, changes are debounced (typically 1-2 seconds) and automatically synced to the PostgreSQL database via the Fastify backend, preventing data loss without overwhelming the network.

### Task Integration
- **Task Linking**: Added a dropdown utility directly in the editor header. This allows users to link the currently open file to a specific Agile Task/Ticket from the project's task board, bridging the gap between project management and code execution.

### IDE Upgrades & Execution
- **VS Code-Style Layout**: Overhauled the editor UI into a fully-fledged VS Code clone, including a left Activity Bar, collapsible primary Sidebar (Explorer, Search, Source Control), and a collapsible Bottom Panel (Terminal).
- **Top Menu Bar**: Introduced a functional native-feeling top menu bar with File, Edit, View, Run, and Terminal dropdowns. 
- **Local File & Folder Import**: Implemented direct upload from the local file system. Users can select "Open File..." or "Open Folder..." from the File menu to recursively read local directories and auto-create them inside the cloud project.
- **Live Code Execution**: Added a dedicated "Run Code" play button. When clicked, the backend spins up child processes using language-specific compilers (Python, Node, GCC, JDK) directly inside the Docker container and streams `stdout` and `stderr` natively into the frontend Terminal panel.
- **VS Code Extension Waitlist Modal**: Added an "Install DevCollab for VS Code" button in the Top Menu Bar. Clicking it opens a modal that interfaces directly with a new PostgreSQL `waitlist` table to securely enroll the user and instantly display their exact real-time queue position.
- **Layout & Viewport Optimization**: Resolved a layout overflow bug by ensuring the EditorView uses `h-full` rather than `h-screen`, guaranteeing the IDE scales perfectly within the dashboard context without generating unwanted vertical scrollbars.

---

## 2. Documentation Wiki Module

The Wiki module was designed to replicate a Notion-style, block-based rich text editing experience for project documentation, API specs, and team notes.

### Rich Text Editor (Tiptap Integration)
- **Core Engine**: Replaced basic textareas with `Tiptap`, a headless wrapper around ProseMirror, providing a highly customizable and robust rich-text foundation.
- **Markdown Support (`tiptap-markdown`)**: Implemented seamless markdown parsing. Typing markdown symbols (like `# ` for headings or ` ``` ` for code blocks) automatically translates the block into the correct visual formatting.
- **Slash Commands (`@tiptap/suggestion` + `tippy.js`)**: Engineered a custom floating menu. Typing `/` anywhere in the editor triggers a keyboard-navigable popup to quickly insert Headings, Lists (Bullets, Numbers, Checklists), Tables, Quotes, and Code Blocks.
- **Advanced Code Blocks (`lowlight`)**: Code blocks feature accurate, multi-language syntax highlighting using `lowlight`, styled with custom dark-mode CSS overrides.
- **Dynamic Tables (`@tiptap/extension-table`)**: Users can insert tables that come with contextual toolbar buttons. When the cursor is inside a table, tools dynamically appear allowing the user to add/remove columns and rows.
- **Task & File Linking**: Integrated dropdowns in the sticky header, leveraging `useTaskStore` and `useEditorStore` to allow users to contextually link a wiki page directly to an agile task or a specific project file.

### Image Uploads & Backend Support
- **FormData Parsing**: The frontend uses `FormData` to handle image selections from the custom toolbar and POSTs them to the backend.
- **Database Image Storage**: The `POST /api/wiki/upload-image` endpoint extracts the image buffer and stores it directly into a PostgreSQL `uploaded_images` table, replacing local file system storage for better scalability.
- **Dynamic Image Serving**: Created a `GET /api/wiki/images/:id` endpoint that retrieves the image buffer and content type from the database, setting public `Cache-Control` headers for fast, direct rendering in the Tiptap editor.

### State Management & Version History
- **Historical Snapshots**: Users can explicitly click "Save Snapshot" to create immutable versions of the wiki page in the database.
- **Version Restore Fix**: Solved a complex React-Tiptap lifecycle bug regarding version restoration. Introduced an `editorVersion` integer state inside the `useWikiStore` (Zustand). The backend increments this integer during a `restoreVersion` action. The `WikiEditor` listens to `editorVersion` as a `useEffect` dependency, perfectly synchronizing restored snapshots into the editor without disrupting the user while they type during standard auto-saves.

### UI / UX Polish
- **Sticky Toolbar**: The formatting toolbar was rebuilt to be `sticky top-0` with a `z-10` index, ensuring tools are always accessible even when scrolling through massive documents.
- **Organic History Button**: The "History" toggle button was integrated organically into the editor's sticky header next to the "Save Snapshot" button, fixing previous z-index occlusion bugs.
- **Centered Typography**: Content is centralized into a `max-w-4xl` column with `prose-invert` tailwind typography for an optimized, distraction-free reading experience.

### File Import
- **Local Markdown Import**: Added a dedicated "Import Local File" action inside the Wiki sidebar. Users can select `.md` or `.txt` files from their operating system, and the content is instantly parsed and converted into a fully formatted Wiki page within the database.
