export type ID = string;

export type Status = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Project {
  id: ID;
  name: string;
  color: string;
  created_at?: string;
}

export interface Tag {
  id: ID;
  name: string;
  color: string;
}

export interface Subtask {
  id: ID;
  title: string;
  done: 0 | 1;
}

export interface CustomFieldVal {
  id: ID;
  key: string;
  type: 'text' | 'number' | 'date' | 'url';
  value: string;
}

export interface Comment {
  id: ID;
  body: string;
  created_at?: string;
}

export interface Task {
  id: ID;
  projectId: ID | null;
  title: string;
  description: string;
  status: Status;
  priority: 1 | 2 | 3;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tags?: Tag[];
  subtasks?: Subtask[];
  comments?: Comment[];
  customFields?: CustomFieldVal[];
}
