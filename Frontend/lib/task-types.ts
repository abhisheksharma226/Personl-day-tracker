export type KanbanStatus = "todo" | "in_progress" | "done"

export interface Task {
  id: string
  text: string
  completed: boolean
  startTime: string
  endTime: string
  status: KanbanStatus
}

export function normalizeTaskStatus(t: { status?: string; completed?: boolean }): KanbanStatus {
  if (t.status === "todo" || t.status === "in_progress" || t.status === "done") {
    return t.status
  }
  return t.completed ? "done" : "todo"
}
