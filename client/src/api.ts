import axios from 'axios'
import type { Task, Project, Tag } from './types'

const API = axios.create({
  baseURL: 'http://localhost:3001/api'
})

export const listProjects = async () => (await API.get<Project[]>('/projects')).data
export const createProject = async (name: string, color: string) => (await API.post('/projects', { name, color })).data
export const listTags = async () => (await API.get<Tag[]>('/tags')).data
export const createTag = async (name: string, color: string) => (await API.post('/tags', { name, color })).data

export interface TaskFilters {
  q?: string
  status?: string
  projectId?: string
  tag?: string
  due?: 'today'
}
export const listTasks = async (filters: TaskFilters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k,v]) => v && params.append(k, String(v)))
  return (await API.get<Task[]>('/tasks?'+params.toString())).data
}
export const getTask = async (id: string) => (await API.get<Task>('/tasks/'+id)).data
export const createTask = async (payload: Partial<Task> & { title: string }) => (await API.post('/tasks', payload)).data
export const updateTask = async (id: string, payload: Partial<Task>) => (await API.put('/tasks/'+id, payload)).data
export const deleteTask = async (id: string) => (await API.delete('/tasks/'+id)).data
export const setTaskStatus = async (id: string, status: string) => (await API.patch('/tasks/'+id+'/status', { status })).data
export const setTaskTags = async (id: string, tags: string[]) => (await API.post('/tasks/'+id+'/tags', { tags })).data
export const addSubtask = async (id: string, title: string) => (await API.post('/tasks/'+id+'/subtasks', { title })).data
