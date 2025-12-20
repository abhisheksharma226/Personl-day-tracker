"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CalendarDays, LogOut, Plus, Search } from "lucide-react"
import { DayCard } from "@/components/day-card"
import { AddTaskModal } from "@/components/add-task-modal"
import { API_ENDPOINTS } from "@/lib/api"  // ✅ Updated import

interface User {
  id: string
  name: string
  email: string
}

interface Task {
  id: string
  text: string
  completed: boolean
  startTime: string
  endTime: string
}

interface DayCardData {
  date: string
  tasks: Task[]
}

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [dayCards, setDayCards] = useState<DayCardData[]>([])
  const [searchDate, setSearchDate] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [editingTask, setEditingTask] = useState<{
    taskId: string
    currentTask: Task
  } | null>(null)

  // 🔐 Auth + load tasks
  useEffect(() => {
    const currentUser = localStorage.getItem("daycard_current_user")
    if (!currentUser) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(currentUser)
    setUser(parsedUser)
    loadTasks(parsedUser.id)
  }, [router])

  // 📦 Load tasks from backend
  const loadTasks = async (userId: string) => {
    const res = await fetch(`${API_ENDPOINTS.tasks}/${userId}`)
    const data = await res.json()

    const grouped: Record<string, Task[]> = {}

    data.forEach((t: any) => {
      if (!grouped[t.date]) grouped[t.date] = []
      grouped[t.date].push({
        id: t._id,
        text: t.text,
        completed: t.completed,
        startTime: t.startTime,
        endTime: t.endTime,
      })
    })

    const cards: DayCardData[] = Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({
        date,
        tasks: grouped[date],
      }))

    setDayCards(cards)
  }

  // ➕ Add tasks
  const handleAddTasks = async (date: string, tasks: any[]) => {
    if (!user) return

    await fetch(`${API_ENDPOINTS.tasks}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        date,
        tasks,
      }),
    })

    loadTasks(user.id)
  }

  // ✅ Toggle task
  const handleToggleTask = async (_: string, taskId: string) => {
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}/toggle`, {
      method: "PATCH",
    })
    loadTasks(user!.id)
  }

  // ❌ Delete task
  const handleDeleteTask = async (_: string, taskId: string) => {
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}`, {
      method: "DELETE",
    })
    loadTasks(user!.id)
  }

  // ✏️ OPEN Edit modal
  const handleEditTask = (cardDate: string, taskId: string) => {
    const card = dayCards.find((c) => c.date === cardDate)
    if (!card) return

    const task = card.tasks.find((t) => t.id === taskId)
    if (!task) return

    setEditingTask({ taskId, currentTask: task })
    setIsEditModalOpen(true)
  }

  // ✏️ Update task (backend)
  const handleUpdateTask = async (
    text: string,
    startTime: string,
    endTime: string
  ) => {
    if (!editingTask) return

    await fetch(`${API_ENDPOINTS.tasks}/${editingTask.taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, startTime, endTime }),
    })

    setIsEditModalOpen(false)
    setEditingTask(null)
    loadTasks(user!.id)
  }

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("daycard_current_user")
    router.push("/login")
  }

  const filteredCards = searchDate
    ? dayCards.filter((card) => card.date.includes(searchDate))
    : dayCards

  if (!user) return null

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Left Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-primary rounded-lg p-2">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">DayCard</h1>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="p-6 border-t border-border">
          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
          {/* Header */}
          <div className="mb-8 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Daily Tasks</h2>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by date (YYYY-MM-DD)"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Today's Tasks
              </Button>
            </div>
          </div>

          {/* Task Cards Grid */}
          {filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your daily tasks</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Tasks
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCards.map((card) => (
                <DayCard
                  key={card.date}
                  date={card.date}
                  tasks={card.tasks}
                  onToggleTask={(taskId) => handleToggleTask(card.date, taskId)}
                  onDeleteTask={(taskId) => handleDeleteTask(card.date, taskId)}
                  onEditTask={(taskId) => handleEditTask(card.date, taskId)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Task Modal */}
      <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddTasks={handleAddTasks} />

      {/* Edit Task Modal */}
      {editingTask && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update the task details below.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const newText = formData.get("taskText") as string
                const startTime = formData.get("startTime") as string
                const endTime = formData.get("endTime") as string
                if (newText.trim() && startTime && endTime) {
                  handleUpdateTask(newText, startTime, endTime)
                }
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="taskText">Task</Label>
                  <Input id="taskText" name="taskText" defaultValue={editingTask.currentTask.text} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      defaultValue={editingTask.currentTask.startTime}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      defaultValue={editingTask.currentTask.endTime}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingTask(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
