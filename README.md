## DevFlow – Digital Task Manager

 <img src="photo\Screenshot (228).png">

Kanban app with Projects, Tasks, Tags, and Markdown descriptions.

Frontend: React + Vite + TypeScript + Tailwind

Backend: Node.js + Express + better-sqlite3 (SQLite)

Dev UX: Vite proxy for clean /api calls, hot reload on both sides

## Core Features
- **Projects:** create/select/delete (deletes all project tasks), color badges, active project is remembered.
- **Kanban:** Backlog → In Progress → Review → Done; quick move (↤/↦).
- **Tasks:** quick add, title/status/priority/due date, Markdown description, open/close details.
- **Tags:** sidebar tag filter (toggle + “All”).
- **Search:** client-side (title + description).

## How to Use
1. Create a **project** in the sidebar and open it.
2. Add tasks via **Quick add** (only when a project is selected).
3. Move tasks between columns with ↤/↦.
4. Open a task to edit **Description (Markdown)** or **Tags/Due/Priority**; click **Save**.
5. Filter by tags in the sidebar; click **All** to reset.

## Tech Stack

Client: React, TypeScript, Vite, TailwindCSS

Server: Node.js, Express, better-sqlite3

DB: SQLite (file on disk)

Utils: nanoid (IDs), marked (Markdown)

## Getting Started 
### Backend
1. cd server
2. npm install
3. npm run dev         # starts http://localhost:3001

### Frontend

1. cd client
2. npm install
3. npm run dev         # opens http://localhost:5173

## How to Use

Create a Project in the left sidebar.

Click a project to open its board (it gets highlighted and remembered).

Use Quick add to create tasks (enabled only when a project is selected).

Move tasks between columns with ↤ / ↦.

Click Open on a task to:

Edit Markdown description and Save description

Edit Tags, Due date, Priority and click Save (closes the task panel)

Use Tags in the sidebar to filter tasks; active tag is highlighted. Click All to reset.
