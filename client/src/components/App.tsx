import { useEffect, useMemo, useRef, useState } from 'react'
import {
  listProjects, listTags, listTasks,
  createTask, createProject, deleteProject,
  setTaskStatus, deleteTask, getTask, setTaskTags, addSubtask, updateTask
} from '../api'
import type { Project, Tag, Task, Status } from '../types'
import { marked } from 'marked'

const statusColumns: { key: Status; title: string }[] = [
  { key: 'backlog', title: 'Backlog' },
  { key: 'in_progress', title: 'In Progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
]

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeProject, setActiveProject] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const reqId = useRef(0)

  async function refresh(projectId: string | null = activeProject) {
    const my = ++reqId.current
    setLoading(true)
    try {
      const [p, t, g] = await Promise.all([
        listProjects(),
        listTasks({ projectId: projectId || undefined }),
        listTags(),
      ])
      if (my !== reqId.current) return
      setProjects(Array.isArray(p) ? p : [])
      setTasks(Array.isArray(t) ? t : [])
      setTags(Array.isArray(g) ? g : [])
    } catch (e) {
      console.error('refresh failed:', e)
      if (my !== reqId.current) return
      setProjects(prev => prev ?? [])
      setTasks(prev => prev ?? [])
      setTags(prev => prev ?? [])
    } finally {
      if (my === reqId.current) setLoading(false)
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const p = await listProjects()
        const projectsArr = Array.isArray(p) ? p : []
        setProjects(projectsArr)

        const saved = localStorage.getItem('activeProjectId')
        const initialId = saved || (projectsArr[0]?.id ?? null)
        setActiveProject(initialId)

        if (initialId) {
          const [t, g] = await Promise.all([
            listTasks({ projectId: initialId }),
            listTags(),
          ])
          setTasks(Array.isArray(t) ? t : [])
          setTags(Array.isArray(g) ? g : [])
        } else {
          setTasks([])
          setTags([])
        }
      } catch (e) {
        console.error('bootstrap failed:', e)
        setTasks([]); setTags([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('activeProjectId', activeProject)
      refresh(activeProject)
    } else {
      localStorage.removeItem('activeProjectId')
      setTasks([])
    }
  }, [activeProject])

  async function onQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    await createTask({ title: quickTitle.trim(), projectId: activeProject })
    setQuickTitle('')
    refresh(activeProject)
  }

  async function onCreateProject() {
    const name = prompt('Name of the project')
    if (!name) return
    await createProject(name.trim(), '#4f46e5')
    await refresh(activeProject)
  }

  async function onDeleteProject(id: string) {
    const proj = projects.find(p => p.id === id)
    if (!proj) return
    if (!confirm(`Delete project "${proj.name}"? This cannot be undone.`)) return

    await deleteProject(id)

    const rest = projects.filter(p => p.id !== id)
    const nextId = rest[0]?.id ?? null
    setActiveProject(nextId)
    if (nextId) localStorage.setItem('activeProjectId', nextId)
    else localStorage.removeItem('activeProjectId')

    refresh(nextId)
  }

  const filtered = useMemo(() => {
    let arr = Array.isArray(tasks) ? tasks : []
    if (activeProject) arr = arr.filter(t => t.projectId === activeProject)
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(t => (t.title + ' ' + (t.description || '')).toLowerCase().includes(q))
    }
    return arr
  }, [tasks, query, activeProject])

  return (
    <div className="min-h-screen text-slate-200 bg-slate-950 bg-radial">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-screen p-4 border-r border-slate-800/60">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <h1 className="text-lg font-semibold">DevFlow</h1>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={onCreateProject}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-soft text-sm"
            >
              + Project
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Projects</div>
            <ul className="space-y-1">
              {projects.map(p => (
                <li key={p.id}>
                  <div
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-slate-800/50 ${activeProject === p.id ? 'bg-slate-800/60' : ''
                      }`}
                  >
                    <button
                      onClick={() => {
                        setActiveProject(p.id)
                        localStorage.setItem('activeProjectId', p.id)
                        refresh(p.id)
                      }}
                      className="flex-1 text-left min-w-0"
                      title="Open project"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                        style={{ background: p.color }}
                      />
                      <span className="truncate align-middle">{p.name}</span>
                    </button>
                    <button
                      onClick={() => onDeleteProject(p.id)}
                      className="px-2 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 shrink-0"
                      title="Delete project"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Tags</div>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded-full text-xs border border-slate-700"
                  style={{ borderColor: t.color, color: t.color }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-4">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search (⌘/Ctrl+K)"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 w-80 outline-none focus:ring-2 ring-indigo-500"
            />
            <form onSubmit={onQuickAdd} className="flex items-center gap-2">
              <input
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                placeholder="Quickly add…"
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 w-[28rem] outline-none focus:ring-2 ring-indigo-500"
              />
              <button className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">Add</button>
            </form>
            {loading && <div className="text-sm text-slate-400">Loading…</div>}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {statusColumns.map(col => (
              <Column
                key={col.key}
                title={col.title}
                status={col.key}
                tasks={filtered.filter(t => t.status === col.key)}
                onChanged={() => refresh(activeProject)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

function Column({
  title, status, tasks, onChanged,
}: { title: string, status: Status, tasks: Task[], onChanged: () => void }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-3">
      <div className="text-sm font-semibold mb-2 text-slate-300">
        {title} <span className="text-slate-500">({tasks.length})</span>
      </div>
      <div className="space-y-3">
        {tasks.map(t => <TaskCard key={t.id} task={t} onChanged={onChanged} />)}
      </div>
    </div>
  )
}

function TaskCard({ task, onChanged }: { task: Task, onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState<Task | null>(null)

  async function toggleOpen() {
    if (!open) {
      const data = await getTask(task.id)
      setFull(data)
    }
    setOpen(v => !v)
  }

  async function move(next: Status) {
    await setTaskStatus(task.id, next)
    onChanged()
  }
  async function remove() {
    if (confirm('Delete task?')) {
      await deleteTask(task.id)
      onChanged()
    }
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 hover:border-slate-700 transition overflow-hidden">
      {/* Верхняя строка: заголовок + кнопки (кнопки могут переноситься, не вылезают) */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="font-medium flex-1 min-w-0 truncate">{task.title}</div>
        <div className="flex gap-1 flex-wrap">
          {task.status !== 'backlog' && (
            <button onClick={() => move('backlog')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">↤</button>
          )}
          {task.status !== 'done' && (
            <button onClick={() => move(nextOf(task.status))} className="text-xs px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500">↦</button>
          )}
          <button onClick={toggleOpen} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">Open</button>
          <button onClick={remove} className="text-xs px-2 py-1 rounded-md bg-red-600 hover:bg-red-500">Delete</button>
        </div>
      </div>

      {task.dueDate && (
        <div className="text-xs text-slate-400 mt-1">date: {task.dueDate}</div>
      )}

      {open && full && (
        <div className="mt-3 rounded-lg border border-slate-800 p-3 bg-slate-950/60">
          <div
            className="text-sm text-slate-300 mb-2 break-words"
            dangerouslySetInnerHTML={{ __html: marked.parse(full.description || '') }}
          />
          <div className="flex flex-wrap gap-2 my-2">
            {(full.tags || []).map(t => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: t.color, color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-400 mb-2">
            Created: {full.createdAt ? new Date(full.createdAt).toLocaleString() : ''}
          </div>
          <SubtasksEditor task={full} onChanged={onChanged} />
          <EditPanel task={full} onChanged={onChanged} />
        </div>
      )}
    </div>
  )
}

function nextOf(s: Status): Status {
  if (s === 'backlog') return 'in_progress'
  if (s === 'in_progress') return 'review'
  return 'done'
}

function SubtasksEditor({ task, onChanged }: { task: Task, onChanged: () => void }) {
  const [title, setTitle] = useState('')
  return (
    <div className="mt-2">
      <div className="text-sm font-semibold mb-2">Subtasks</div>
      <ul className="space-y-1">
        {(task.subtasks || []).map(st => (
          <li key={st.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={!!st.done}
              onChange={async (e) => {
                await fetch(`http://localhost:3001/api/tasks/subtasks/${st.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ done: e.target.checked ? 1 : 0 })
                })
                onChanged()
              }}
            />
            <span className={`text-sm ${st.done ? 'line-through text-slate-500' : ''}`}>{st.title}</span>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 mt-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!title.trim()) return
          await addSubtask(task.id, title.trim())
          setTitle('')
          onChanged()
        }}
      >
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New subtask…"
          className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
        />
        <button className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sm">Add</button>
      </form>
    </div>
  )
}

function EditPanel({ task, onChanged }: { task: Task, onChanged: () => void }) {
  const [tagsInput, setTagsInput] = useState((task.tags || []).map(t => t.name).join(', '))
  const [due, setDue] = useState(task.dueDate || '')
  const [priority, setPriority] = useState(task.priority)

  async function save() {
    await setTaskTags(task.id, tagsInput.split(',').map(s => s.trim()).filter(Boolean))
    await updateTask(task.id, { dueDate: due || null, priority })
    onChanged()
  }

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm">Tags
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="comma-separated"
            className="mt-1 w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
          />
        </label>
        <label className="text-sm">Date
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="mt-1 w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
          />
        </label>
        <label className="text-sm">Priority
          <select
            value={priority}
            onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
            className="mt-1 w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
          >
            <option value={1}>High</option>
            <option value={2}>Medium</option>
            <option value={3}>Low</option>
          </select>
        </label>
      </div>
      <div className="mt-3">
        <button onClick={save} className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500">Save</button>
      </div>
    </div>
  )
}
