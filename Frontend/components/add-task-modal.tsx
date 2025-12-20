"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onAddTasks: (date: string, tasks: Array<{ text: string; startTime: string; endTime: string }>) => void
}

interface TaskInput {
  text: string
  startTime: string
  endTime: string
}

export function AddTaskModal({ isOpen, onClose, onAddTasks }: AddTaskModalProps) {
  const today = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(today)
  const [tasks, setTasks] = useState<TaskInput[]>([{ text: "", startTime: "09:00", endTime: "10:00" }])
  const [isSaving, setIsSaving] = useState(false)

  const handleAddTaskInput = () => {
    setTasks([...tasks, { text: "", startTime: "09:00", endTime: "10:00" }])
  }

  const handleRemoveTaskInput = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const handleTaskChange = (index: number, field: keyof TaskInput, value: string) => {
    const newTasks = [...tasks]
    newTasks[index][field] = value
    setTasks(newTasks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validTasks = tasks.filter((task) => task.text.trim() !== "")

    if (validTasks.length === 0) {
      return
    }

    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    onAddTasks(date, validTasks)

    setDate(today)
    setTasks([{ text: "", startTime: "09:00", endTime: "10:00" }])
    setIsSaving(false)
    onClose()
  }

  const handleClose = () => {
    setDate(today)
    setTasks([{ text: "", startTime: "09:00", endTime: "10:00" }])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Daily Tasks</DialogTitle>
          <DialogDescription>
            Add tasks for a specific date with time ranges. If the date already has tasks, new ones will be added to
            that card.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSaving}
                required
              />
            </div>

            <div className="space-y-4">
              <Label>Tasks</Label>
              {tasks.map((task, index) => (
                <div key={index} className="space-y-3 p-4 border border-border rounded-lg">
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Task ${index + 1}`}
                      value={task.text}
                      onChange={(e) => handleTaskChange(index, "text", e.target.value)}
                      className="flex-1"
                      disabled={isSaving}
                    />
                    {tasks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTaskInput(index)}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`start-${index}`} className="text-xs">
                        Start Time
                      </Label>
                      <Input
                        id={`start-${index}`}
                        type="time"
                        value={task.startTime}
                        onChange={(e) => handleTaskChange(index, "startTime", e.target.value)}
                        disabled={isSaving}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`end-${index}`} className="text-xs">
                        End Time
                      </Label>
                      <Input
                        id={`end-${index}`}
                        type="time"
                        value={task.endTime}
                        onChange={(e) => handleTaskChange(index, "endTime", e.target.value)}
                        disabled={isSaving}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTaskInput}
                className="w-full bg-transparent"
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Task
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save Tasks"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
