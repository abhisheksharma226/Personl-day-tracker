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
import { CalendarDays, LogOut, Plus, Search, Menu, X } from "lucide-react"
import { DayCard } from "@/components/day-card"
import { AddTaskModal } from "@/components/add-task-modal"
import { API_ENDPOINTS } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner" // ✅ added spinner

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true) // ✅ loading tasks
  const [isSavingEdit, setIsSavingEdit] = useState(false) // ✅ saving edit
  const [isTogglingTask, setIsTogglingTask] = useState(false)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [isAddingTasks, setIsAddingTasks] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)

const calculateStreak = (cards: DayCardData[]) => {
  if (cards.length === 0) return 0

  const dates = cards
    .map(c => c.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  let streak = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])

    const diff =
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)

    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}



  const [editingTask, setEditingTask] = useState<{
    taskId: string
    currentTask: Task
  } | null>(null)

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

  const loadTasks = async (userId: string) => {
    setIsLoadingTasks(true)
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

      // 🔥 sort tasks by startTime (earliest first)
        Object.keys(grouped).forEach((date) => {
          grouped[date].sort((a, b) => {
            return a.startTime.localeCompare(b.startTime)
          })
        })

    })

    const cards: DayCardData[] = Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((date) => ({
        date,
        tasks: grouped[date],
      }))

    setDayCards(cards)
      // 🔥 POINTS = total tasks count
    const totalTasks = data.length
    setPoints(totalTasks)

    // 🔥 STREAK calculation
    const calculatedStreak = calculateStreak(cards)
    setStreak(calculatedStreak)


    setIsLoadingTasks(false)
  }

  const handleAddTasks = async (date: string, tasks: any[]) => {
    if (!user) return
    setIsAddingTasks(true)
    await fetch(`${API_ENDPOINTS.tasks}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        date,
        tasks,
      }),
    })
    await loadTasks(user.id)
    setIsAddingTasks(false)
    
  }

  const handleToggleTask = async (_: string, taskId: string) => {
    setIsTogglingTask(true)
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}/toggle`, { method: "PATCH" })
    await loadTasks(user!.id)
    setIsTogglingTask(false)
  }

  const handleDeleteTask = async (_: string, taskId: string) => {
    setIsDeletingTask(true)
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}`, { method: "DELETE" })
    await loadTasks(user!.id)
    setIsDeletingTask(false)
  }

  const handleEditTask = (cardDate: string, taskId: string) => {
    const card = dayCards.find((c) => c.date === cardDate)
    if (!card) return
    const task = card.tasks.find((t) => t.id === taskId)
    if (!task) return
    setEditingTask({ taskId, currentTask: task })
    setIsEditModalOpen(true)
  }

  const handleUpdateTask = async (text: string, startTime: string, endTime: string) => {
    if (!editingTask) return
    setIsSavingEdit(true)
    await fetch(`${API_ENDPOINTS.tasks}/${editingTask.taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, startTime, endTime }),
    })
    setIsEditModalOpen(false)
    setEditingTask(null)
    await loadTasks(user!.id)
    setIsSavingEdit(false)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    localStorage.removeItem("daycard_current_user")
    router.push("/login")
  }

  const filteredCards = searchDate
    ? dayCards.filter((card) => card.date.includes(searchDate))
    : dayCards

  if (!user) return null

  return (
    <div className="min-h-screen flex bg-muted/20 [&_input[type=checkbox]]:cursor-pointer">
      {/* Mobile Sidebar Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 bg-card border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
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

          <div className="mt-6 space-y-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">🔥 Streak</p>
              <p className="text-2xl font-bold">{streak} days</p>
            </div>

            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">⭐ Points</p>
              <p className="text-2xl font-bold">{points}</p>
            </div>
          </div>

        </div>

        <div className="flex-1" />

        <div className="p-6 border-t border-border">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
          {/* Header */}
          <div className="mb-8 space-y-6">
            {/* 🔥 Mobile Header with Streak & Points */}
<div className="flex items-center justify-between md:hidden">
  <h2 className="text-2xl font-bold tracking-tight">Daily Tasks</h2>

  <div className="flex gap-3">
    <div className="bg-muted px-3 py-1 rounded-lg text-center">
      <p className="text-xs text-muted-foreground">🔥</p>
      <p className="text-sm font-bold">{streak}</p>
    </div>

    <div className="bg-muted px-3 py-1 rounded-lg text-center">
      <p className="text-xs text-muted-foreground">⭐</p>
      <p className="text-sm font-bold">{points}</p>
    </div>
  </div>
</div>

            {/* <h2 className="text-3xl font-bold tracking-tight">Daily Tasks</h2> */}

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
              <Button onClick={() => setIsModalOpen(true)} disabled={isAddingTasks}>
                {isAddingTasks ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Today's Tasks
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Task Cards Grid */}
          {isLoadingTasks ? (
            <div className="text-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your daily tasks</p>
              <Button onClick={() => setIsModalOpen(true)} disabled={isAddingTasks}>
                {isAddingTasks ? <Spinner size="sm" className="mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
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

      <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddTasks={handleAddTasks} />

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
                  <Input id="taskText" name="taskText" defaultValue={editingTask.currentTask.text} disabled={isSavingEdit} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      defaultValue={editingTask.currentTask.startTime}
                      disabled={isSavingEdit}
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
                      disabled={isSavingEdit}
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
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
