## DevFlow – Digital Task Manager

 <img src="photo\Screenshot (229).png">


  <img src="photo\Screenshot (230).png">


Kanban app with Projects, Tasks, Tags, and Markdown descriptions.

Frontend: React + Vite + TypeScript + Tailwind

Backend: Node.js + Express + better-sqlite3 (SQLite)

Dev UX: Vite proxy for clean /api calls, hot reload on both sides

## Core Features

1. Projects. Create/select/delete projects (deleting a project removes its tasks); 

2. Boards & Columns. Default columns (Backlog/In Progress/Review/Done) plus custom columns per project: add, inline-rename (click title), delete (if empty), and reorder (◀/▶). Layout is persisted per project (localStorage).

3. Kanban + Drag & Drop. Move tasks across any column with dnd-kit; columns highlight on hover; quick move buttons (↤/↦) still available.

4. Tasks. Quick add (to the first column), full title expands in the opened card, status/priority/due date, delete, created timestamp.

5. Description (Markdown). Preview + edit mode with auto-resizing textarea and Save/Cancel; Markdown rendered with marked.

6. Tags. Attach tags to tasks; sidebar tag filter with toggle behavior and an “All” reset; colored tag chips on the card.

7. Search. Client-side search over task title + description.

8. Persistence & API. SQLite-backed REST API (Express). Task status is a free-form string, so custom columns are fully supported on the backend as well. Seed data included for first run.

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
3. npm run dev       

### Frontend

1. cd client
2. npm install
3. npm run dev         

## How to Use

Create a Project in the left sidebar.

Click a project to open its board (it gets highlighted and remembered).

Use Quick add to create tasks (enabled only when a project is selected).

Move tasks between columns with ↤ / ↦.

Click Open on a task to:

Edit Markdown description and Save description

Edit Tags, Due date, Priority and click Save (closes the task panel)

Use Tags in the sidebar to filter tasks; active tag is highlighted. Click All to reset.
