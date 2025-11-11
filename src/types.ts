export interface Task {
  id: string;
  name: string;
  assignee: string;
  followUpDate: string;
  isComplete: boolean;
  comments: string;
}

export interface Process {
  id: string;
  name: string;
  tasks: Task[];
  currentTaskIndex: number;
  status: 'Abierto' | 'Cerrado';
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}
