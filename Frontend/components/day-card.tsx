"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2, Pencil, Clock } from "lucide-react"

interface Task {
  id: string
  text: string
  completed: boolean
  startTime: string
  endTime: string
}

interface DayCardProps {
  date: string
  tasks: Task[]
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
}

export function DayCard({ date, tasks, onToggleTask, onDeleteTask, onEditTask }: DayCardProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const completedCount = tasks.filter((task) => task.completed).length

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="text-balance">{formattedDate}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount}/{tasks.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="space-y-2 p-3 rounded-lg border border-border/50 bg-card/50 group">
            <div className="flex items-start gap-3">
              <Checkbox
                id={task.id}
                checked={task.completed}
                onCheckedChange={() => onToggleTask(task.id)}
                className="mt-1"
              />
              <label
                htmlFor={task.id}
                className={`flex-1 text-sm cursor-pointer ${task.completed ? "line-through text-muted-foreground" : ""}`}
              >
                {task.text}
              </label>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditTask(task.id)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteTask(task.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-8 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatTime(task.startTime)} - {formatTime(task.endTime)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
