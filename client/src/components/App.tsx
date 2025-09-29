import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import {
  listProjects, listTags, listTasks,
  createTask, createProject, deleteProject,
  setTaskStatus, deleteTask, getTask, setTaskTags, addSubtask, updateTask
} from '../api'
import type { Project, Tag, Task, Status } from '../types'
import { marked } from 'marked'

import { DndContext, useDroppable, useDraggable, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'





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

  const [activeTagId, setActiveTagId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )


  const canCreate = !!activeProject;

  const reqId = useRef(0)

  async function refresh(
    projectId: string | null = activeProject,
    tagId: string | null = activeTagId
  ) {
    const my = ++reqId.current
    setLoading(true)
    try {
      const [p, t, g] = await Promise.all([
        listProjects(),
        listTasks({
          projectId: projectId || undefined,
          tagId: tagId || undefined,
        }),
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
            listTasks({ projectId: initialId, tagId: activeTagId || undefined }),
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    // id целевой колонки = ключ статуса
    const toStatus = over.id as Status

    // id таски = id draggable
    const taskId = String(active.id)

    // исходный статус, который мы записали в data draggable
    const fromStatus = active.data?.current?.fromStatus as Status | undefined

    if (!toStatus || !taskId) return
    if (fromStatus && fromStatus === toStatus) return

    try {
      await setTaskStatus(taskId, toStatus)
    } finally {
      // обновим с учётом текущего проекта/тега
      refresh(activeProject, activeTagId)
    }
  }



  useEffect(() => {
    if (activeProject) {
      localStorage.setItem('activeProjectId', activeProject)
      refresh(activeProject, activeTagId)
    } else {
      localStorage.removeItem('activeProjectId')
      setTasks([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, activeTagId])


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

    refresh(nextId, activeTagId)

  }

  const filtered = useMemo(() => {
    let arr = Array.isArray(tasks) ? tasks : []
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(t => (t.title + ' ' + (t.description || '')).toLowerCase().includes(q))
    }
    return arr
  }, [tasks, query])


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
                        refresh(p.id, activeTagId)
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
              {/* Кнопка "All" для сброса фильтра */}
              <button
                onClick={() => { setActiveTagId(null); refresh(activeProject, null) }}
                className={`px-2 py-0.5 rounded-full text-xs border ${activeTagId === null
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800/50'
                  }`}
              >
                All
              </button>

              {tags.map(t => {
                const active = activeTagId === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      const next = active ? null : t.id
                      setActiveTagId(next)
                      refresh(activeProject, next)
                    }}
                    className={`px-2 py-0.5 rounded-full text-xs border transition ${active ? '' : 'hover:bg-slate-800/50'
                      }`}
                    style={
                      active
                        ? { background: t.color, borderColor: t.color, color: '#0a0a0a', fontWeight: 600 }
                        : { borderColor: t.color, color: t.color }
                    }
                    title={`Filter by ${t.name}`}
                  >
                    {t.name}
                  </button>
                )
              })}
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
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!canCreate || !quickTitle.trim()) return
                await createTask({ title: quickTitle.trim(), projectId: activeProject! })
                setQuickTitle('')
                refresh(activeProject, activeTagId) // если refresh принимает tagId
              }}
              className="flex items-center gap-2"
            >

              <input
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                placeholder={canCreate ? "Quickly add…" : "Select a project to add tasks"}
                title={canCreate ? "" : "Select a project first"}
                disabled={!canCreate}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 w-[28rem] outline-none focus:ring-2 ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                disabled={!canCreate}
                title={canCreate ? "" : "Select a project first"}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>

            {loading && <div className="text-sm text-slate-400">Loading…</div>}
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-4 gap-4">
              {statusColumns.map(col => (
                <Column
                  key={col.key}
                  title={col.title}
                  status={col.key}
                  tasks={filtered.filter(t => t.status === col.key)}
                  onChanged={() => refresh(activeProject, activeTagId)}
                />
              ))}
            </div>
          </DndContext>
        </main>
      </div>
    </div>
  )
}

function Column({
  title, status, tasks, onChanged,
}: { title: string, status: Status, tasks: Task[], onChanged: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl bg-slate-900/60 border p-3 ${isOver ? 'border-indigo-500' : 'border-slate-800'
        }`}
    >
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

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,                               // уникальный id карточки
    data: { taskId: task.id, fromStatus: task.status }, // передаём текущий статус
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
    cursor: 'grab',
  }


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
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl bg-slate-900 border border-slate-800 p-3 hover:border-slate-700 transition overflow-hidden"
    >      {/* Верхняя строка: заголовок + кнопки (кнопки могут переноситься, не вылезают) */}
      <div className="min-w-0">
        <div className="font-medium flex items-center gap-2">
          <span
            {...listeners}
            {...attributes}
            className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-800 text-slate-300 cursor-grab select-none"
            title="Drag"
          >
            ⋮⋮
          </span>

          <span
            className={open ? 'whitespace-normal break-words' : 'truncate'}
            style={open ? { wordBreak: 'break-word' } : undefined}
            title={task.title} // подсказка при свернутом состоянии
          >
            {task.title}
          </span>
        </div>


        <div className="mt-2 flex gap-1 flex-wrap">
          {task.status !== 'backlog' && (
            <button onClick={() => move('backlog')} className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700">↤</button>
          )}
          {task.status !== 'done' && (
            <button onClick={() => move(nextOf(task.status))} className="text-xs px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500">↦</button>
          )}
          <button
            onClick={toggleOpen}
            aria-expanded={open}
            title={open ? 'Close details' : 'Open details'}
            className={`text-xs px-2 py-1 rounded-md hover:bg-slate-700 ${open ? 'bg-slate-700' : 'bg-slate-800'
              }`}
          >
            {open ? 'Close' : 'Open'}
          </button>
          <button onClick={remove} className="text-xs px-2 py-1 rounded-md bg-red-600 hover:bg-red-500">Delete</button>
        </div>
      </div>


      {task.dueDate && (
        <div className="text-xs text-slate-400 mt-1">date: {task.dueDate}</div>
      )}

      {open && full && (
        <div className="mt-3 rounded-lg border border-slate-800 p-3 bg-slate-950/60">

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
          <DescriptionEditor task={full} onChanged={onChanged} />
          <EditPanel
            task={full}
            onChanged={() => { onChanged(); setOpen(false); }}  // после сохранения закрываем карточку
          />

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

function DescriptionEditor({ task, onChanged }: { task: Task, onChanged: () => void }) {
  const [desc, setDesc] = useState(task.description || '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const taRef = useRef<HTMLTextAreaElement | null>(null)

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = '0px'
    el.style.overflow = 'hidden'
    const next = Math.min(el.scrollHeight, 400)
    el.style.height = next + 'px'
  }

  // при переключении в режим редактирования подобрать высоту
  useLayoutEffect(() => {
    if (editing && taRef.current) autoGrow(taRef.current)
  }, [editing])

  // при наборе текста тоже
  useLayoutEffect(() => {
    if (editing && taRef.current) autoGrow(taRef.current)
  }, [desc])

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await updateTask(task.id, { description: desc })
      setEditing(false)     // закрываем поле после сохранения
      onChanged()           // перезагружаем данные с сервера
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDesc(task.description || '') // откат к исходному
    setEditing(false)
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Description</div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
          >
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        // Просмотр (Markdown)
        <div className="text-sm text-slate-300 whitespace-pre-wrap break-words">
          {desc
            ? <div dangerouslySetInnerHTML={{ __html: marked.parse(desc) }} />
            : <span className="italic text-slate-500">No description</span>}
        </div>
      ) : (
        <>
          <textarea
            ref={taRef}
            rows={1}
            value={desc}
            onChange={(e) => { setDesc(e.target.value); autoGrow(e.currentTarget) }}
            onInput={(e) => autoGrow(e.currentTarget)}
            placeholder="Description"
            className="w-full px-3 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none
                       resize-none overflow-hidden leading-5"
            style={{ height: '0px' }}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </>
      )}
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
      <div className="space-y-3">
        {/* Tags */}
        <label className="block text-sm">
          <div className="mb-1">
            <div className="font-medium">Tags</div>
            <div className="text-xs text-slate-400">Separeted by commas</div>
          </div>
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="bug, backend, urgent"
            className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
          />
        </label>

        {/* Date */}
        <label className="block text-sm">
          <div className="mb-1">
            <div className="font-medium">Date</div>
            <div className="text-xs text-slate-400">mm/dd/yyyy</div>
          </div>
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
          />
        </label>

        {/* Priority */}
        <label className="block text-sm">
          <div className="mb-1 font-medium">Priority</div>
          <select
            value={priority}
            onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)}
            className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-800 outline-none"
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
