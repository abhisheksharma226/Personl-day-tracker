"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import type { KanbanStatus, Task } from "@/lib/task-types"

const COLUMNS: { id: KanbanStatus; title: string; description: string }[] = [
  { id: "todo", title: "To do", description: "Not started" },
  { id: "in_progress", title: "In progress", description: "Active" },
  { id: "done", title: "Done", description: "Completed" },
]

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

interface KanbanBoardProps {
  tasks: Task[]
  dateLabel: string
  onStatusChange: (taskId: string, status: KanbanStatus) => void
  movingTaskId: string | null
}

export function KanbanBoard({ tasks, dateLabel, onStatusChange, movingTaskId }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null)

  const tasksByColumn = (status: KanbanStatus) => tasks.filter((t) => t.status === status)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/task-id", taskId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = (e: React.DragEvent, column: KanbanStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    const taskId = e.dataTransfer.getData("text/task-id")
    if (!taskId) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === column) return
    onStatusChange(taskId, column)
  }

  return (
    <section className="mb-8" aria-label="Kanban board">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Kanban Board</h3>
          <p className="text-sm text-muted-foreground">{dateLabel} — drag tasks between columns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasksByColumn(col.id)
          const isActiveDrop = dragOverColumn === col.id

          return (
            <Card
              key={col.id}
              className={`flex flex-col min-h-[220px] transition-colors ${
                isActiveDrop ? "ring-2 ring-primary/50 bg-primary/5" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                setDragOverColumn(col.id)
              }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>{col.title}</span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {columnTasks.length}
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{col.description}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 pt-0">
                {columnTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/80 rounded-lg">
                    Drop tasks here
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={`rounded-lg border border-border/80 bg-card/80 p-3 cursor-grab active:cursor-grabbing shadow-sm ${
                        movingTaskId === task.id ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-balance leading-snug">{task.text}</p>
                        {movingTaskId === task.id && <Spinner size="sm" className="shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(task.startTime)} – {formatTime(task.endTime)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
