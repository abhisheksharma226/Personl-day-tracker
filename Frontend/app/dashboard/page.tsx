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
import { CalendarDays, LogOut, Plus, Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import { DayCard } from "@/components/day-card"
import { AddTaskModal } from "@/components/add-task-modal"
import { KanbanBoard } from "@/components/kanban-board"
import { API_ENDPOINTS } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner" // ✅ added spinner
import { getLocalIsoDate } from "@/lib/utils"
import type { KanbanStatus, Task } from "@/lib/task-types"
import { normalizeTaskStatus } from "@/lib/task-types"

interface User {
  id: string
  name: string
  email: string
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
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)
  const [kanbanMovingId, setKanbanMovingId] = useState<string | null>(null)
  const [isAddingTasks, setIsAddingTasks] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [viewingDate, setViewingDate] = useState<string>(() => getLocalIsoDate())
  const [showCelebration, setShowCelebration] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [celebratedDates, setCelebratedDates] = useState<Record<string, boolean>>({})
  const [eyeTargetX, setEyeTargetX] = useState(0) // -1..1
  const [eyeCurrentX, setEyeCurrentX] = useState(0) // -1..1 (smoothed)
  const [isBlinking, setIsBlinking] = useState(false)
  const [viewingProgress, setViewingProgress] = useState(0) // 0..1

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
    loadTasks(parsedUser.id, { showGlobalSpinner: true })
  }, [router])

  const loadTasks = async (userId: string, opts?: { showGlobalSpinner?: boolean }) => {
    const showGlobalSpinner = opts?.showGlobalSpinner ?? false
    if (showGlobalSpinner) setIsLoadingTasks(true)
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
        status: normalizeTaskStatus(t),
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


    if (showGlobalSpinner) setIsLoadingTasks(false)
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
    setTogglingTaskId(taskId)
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}/toggle`, { method: "PATCH" })
    await loadTasks(user!.id)
    setTogglingTaskId(null)
  }

  const handleDeleteTask = async (_: string, taskId: string) => {
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}`, { method: "DELETE" })
    await loadTasks(user!.id)
  }

  const handleKanbanStatusChange = async (taskId: string, status: KanbanStatus) => {
    if (!user) return
    setKanbanMovingId(taskId)
    await fetch(`${API_ENDPOINTS.tasks}/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await loadTasks(user.id)
    setKanbanMovingId(null)
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

  const handlePreviousDay = () => {
    const currentDate = new Date(viewingDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setViewingDate(currentDate.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const currentDate = new Date(viewingDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setViewingDate(currentDate.toISOString().split('T')[0])
  }

  const filteredCards = searchDate
    ? dayCards.filter((card) => card.date.includes(searchDate))
    : dayCards

  // Smooth pupil tracking (feels more "alive")
  useEffect(() => {
    let raf = 0
    const tick = () => {
      setEyeCurrentX((prev) => prev + (eyeTargetX - prev) * 0.18)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [eyeTargetX])

  // Natural blinking (random interval)
  useEffect(() => {
    let cancelled = false
    let timeout: number | undefined

    const schedule = () => {
      const nextInMs = 2200 + Math.random() * 2600
      timeout = window.setTimeout(() => {
        if (cancelled) return
        setIsBlinking(true)
        window.setTimeout(() => setIsBlinking(false), 120)
        schedule()
      }, nextInMs)
    }

    schedule()
    return () => {
      cancelled = true
      if (timeout) window.clearTimeout(timeout)
    }
  }, [])

  // Keep a single source of truth for the "current" progress being viewed (0..1)
  useEffect(() => {
    const viewingCard = dayCards.find((card) => card.date === viewingDate)
    const tasks = viewingCard?.tasks || []
    if (tasks.length === 0) {
      setViewingProgress(0)
      return
    }
    const completed = tasks.filter((t) => t.completed).length
    setViewingProgress(completed / tasks.length)
  }, [dayCards, viewingDate])

  // Eyes watch the progress bar (not the user): follow the bar's fill position.
  // Add tiny "saccades" so it feels alive.
  useEffect(() => {
    const base = Math.max(-1, Math.min(1, viewingProgress * 2 - 1))
    setEyeTargetX(base)

    let cancelled = false
    let timeout: number | undefined

    const scheduleSaccade = () => {
      const nextInMs = 450 + Math.random() * 850
      timeout = window.setTimeout(() => {
        if (cancelled) return
        const jitter = (Math.random() - 0.5) * 0.22
        setEyeTargetX(Math.max(-1, Math.min(1, base + jitter)))
        window.setTimeout(() => {
          if (!cancelled) setEyeTargetX(base)
        }, 120 + Math.random() * 160)
        scheduleSaccade()
      }, nextInMs)
    }

    scheduleSaccade()
    return () => {
      cancelled = true
      if (timeout) window.clearTimeout(timeout)
    }
  }, [viewingProgress])

  useEffect(() => {
    const viewingCard = dayCards.find((card) => card.date === viewingDate)
    if (!viewingCard || viewingCard.tasks.length === 0) return

    const completedTasks = viewingCard.tasks.filter((task) => task.completed).length
    const percentage = Math.round((completedTasks / viewingCard.tasks.length) * 100)

    // Trigger celebration only when progress becomes exactly 100% for this date
    if (percentage === 100 && !celebratedDates[viewingDate]) {
      setShowCelebration(true)
      setIsFadingOut(false)
      setCelebratedDates((prev) => ({ ...prev, [viewingDate]: true }))

      const fadeTimeout = setTimeout(() => {
        setIsFadingOut(true)
      }, 5600)

      const hideTimeout = setTimeout(() => {
        setShowCelebration(false)
        setIsFadingOut(false)
      }, 6300)

      return () => {
        clearTimeout(fadeTimeout)
        clearTimeout(hideTimeout)
      }
    }
  }, [dayCards, viewingDate, celebratedDates])

  if (!user) return null


  function formatDate(date: Date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";

  const month = date.toLocaleString("en-GB", { month: "long" });
  const year = date.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
}


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
          fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-40
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
            <h1 className="text-xl font-bold">Assign Board</h1>
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

        {/* Today's Overview */}
        <div className="p-6 border-t border-border flex flex-col flex-1">
          <h3 className="font-semibold mb-4 text-foreground">Day Overview</h3>
          <div className="space-y-3 flex-1">
            <div className="text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Selected Date</p>
              <p className="font-semibold text-lg mt-1">{formatDate(new Date(viewingDate))}</p>
              {viewingDate !== getLocalIsoDate() && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Past date
                </p>
              )}
            </div>
            {(() => {
              const viewingCard = dayCards.find(card => card.date === viewingDate)
              const viewingTasks = viewingCard?.tasks || []
              const completedTasks = viewingTasks.filter(task => task.completed).length
              const percentage = Math.round(viewingTasks.length > 0 ? (completedTasks / viewingTasks.length) * 100 : 0)
              return (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Tasks</p>
                      <p className="text-2xl font-bold text-primary mt-1">{viewingTasks.length}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-primary mt-1">{completedTasks}/{viewingTasks.length}</p>
                    </div>
                  </div>
                  {viewingTasks.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs text-muted-foreground">
                          Progress
                        </p>

                        {/* Realistic “watching” eyes */}
                        <div className="flex items-center gap-1.5 select-none">
                          {Array.from({ length: 2 }).map((_, eyeIdx) => (
                            <div
                              key={eyeIdx}
                              className="relative w-7 h-4.5 rounded-full border border-border shadow-sm overflow-hidden bg-white/90"
                              style={{
                                transform: `scaleY(${isBlinking ? 0.12 : 1})`,
                                transition: "transform 90ms ease-in-out",
                              }}
                            >
                              {/* subtle sclera shading */}
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,1),rgba(241,245,249,1))]" />
                              {/* iris */}
                              <div
                                className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full"
                                style={{
                                  transform: `translate(calc(-50% + ${(eyeCurrentX * 4) + (eyeIdx === 0 ? -0.6 : 0.6)}px), -50%)`,
                                  background:
                                    "radial-gradient(circle at 30% 30%, rgba(34,197,94,1), rgba(21,128,61,1) 55%, rgba(20,83,45,1) 100%)",
                                  boxShadow: "0 0 10px rgba(34,197,94,0.35)",
                                }}
                              >
                                {/* pupil */}
                                <div
                                  className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                                  style={{
                                    transform: "translate(-50%, -50%)",
                                    background: "rgba(2,6,23,0.92)",
                                  }}
                                />
                                {/* specular highlights */}
                                <div
                                  className="absolute left-[25%] top-[22%] w-1 h-1 rounded-full"
                                  style={{ background: "rgba(255,255,255,0.95)" }}
                                />
                                <div
                                  className="absolute left-[40%] top-[40%] w-[3px] h-[3px] rounded-full"
                                  style={{ background: "rgba(255,255,255,0.55)" }}
                                />
                              </div>

                              {/* subtle eyelid shadow */}
                              <div className="absolute inset-x-0 top-0 h-[40%] bg-[linear-gradient(to_bottom,rgba(15,23,42,0.16),rgba(15,23,42,0))]" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        className="bg-muted rounded-full h-2 overflow-hidden"
                      >
                        <div
                          className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${viewingTasks.length > 0 ? (completedTasks / viewingTasks.length) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {percentage}% complete
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousDay}
                className="flex-1 h-10 rounded-lg transition-all hover:bg-primary hover:text-primary-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {/* <span className="text-xs font-medium hidden sm:inline">Previous</span> */}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewingDate(getLocalIsoDate())}
                className="flex-1 h-10 rounded-lg font-medium text-xs"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextDay}
                className="flex-1 h-10 rounded-lg transition-all hover:bg-primary hover:text-primary-foreground"
              >
                {/* <span className="text-xs font-medium hidden sm:inline">Next</span> */}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
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
      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 mb-8 space-y-6">
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

          {!isLoadingTasks && (
            <KanbanBoard
              tasks={dayCards.find((c) => c.date === viewingDate)?.tasks ?? []}
              dateLabel={formatDate(new Date(viewingDate))}
              onStatusChange={handleKanbanStatusChange}
              movingTaskId={kanbanMovingId}
            />
          )}

          {/* Task Cards Grid */}
          <div className="flex-1 overflow-auto">
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
                    togglingTaskId={togglingTaskId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTasks={handleAddTasks}
        defaultDate={viewingDate}
      />

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

      {showCelebration && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-700 ${
            isFadingOut ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Close (X) button in the top-right */}
          <button
            type="button"
            onClick={() => {
              setShowCelebration(false)
              setIsFadingOut(false)
            }}
            className="absolute right-4 top-4 z-20 rounded-full bg-background/80 text-foreground shadow-md border border-border hover:bg-background px-2.5 py-1 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Rocket launch + full-screen spark blast */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="rocket-orbit">
              <div className="rocket-trail" />
              <div className="rocket-body">
                <span className="rocket-window" />
                <span className="rocket-fin rocket-fin-left" />
                <span className="rocket-fin rocket-fin-right" />
              </div>
            </div>

            {/* Birthday blaster: center burst with streaks and spark dots */}
            {Array.from({ length: 220 }).map((_, index) => {
              const angle = (index / 220) * Math.PI * 2
              const distance = 220 + (index % 11) * 24
              const dx = Math.cos(angle) * distance
              const dy = Math.sin(angle) * distance
              const color =
                index % 6 === 0
                  ? "rgba(244, 63, 94, 0.98)"
                  : index % 6 === 1
                  ? "rgba(251, 191, 36, 0.98)"
                  : index % 6 === 2
                  ? "rgba(34, 197, 94, 0.98)"
                  : index % 6 === 3
                  ? "rgba(59, 130, 246, 0.98)"
                  : index % 6 === 4
                  ? "rgba(168, 85, 247, 0.98)"
                  : "rgba(236, 72, 153, 0.98)"

              return (
                <span
                  key={index}
                  className={index % 3 === 0 ? "screen-spark-dot" : "screen-spark-streak"}
                  style={{
                    left: "50%",
                    top: "50%",
                    animationDelay: `${5 + (index % 14) * 0.018}s`,
                    ["--sx" as string]: `${dx}px`,
                    ["--sy" as string]: `${dy}px`,
                    ["--spark-color" as string]: color,
                    ["--spark-rot" as string]: `${(angle * 180) / Math.PI}deg`,
                  }}
                />
              )
            })}
          </div>

          <div className="relative z-10 text-center px-6">
            {/* Glowing happiness pulse behind the card */}
            <div className="absolute -inset-20 sm:-inset-28 mx-auto my-auto flex items-center justify-center pointer-events-none">
              <div className="celebration-pulse" />
            </div>

            {/* Floating celebration emojis */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {["🎉", "✨", "🎊", "💫"].map((emoji, index) => (
                <span
                  key={index}
                  className="absolute text-2xl sm:text-3xl animate-bounce"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${10 + index * 12}%`,
                    animationDelay: `${index * 0.25}s`,
                  }}
                >
                  {emoji}
                </span>
              ))}
            </div>

            <div className="relative rounded-3xl bg-background/95 shadow-2xl px-6 py-5 sm:px-10 sm:py-8 border border-primary/40">
              <p className="text-xs sm:text-sm uppercase tracking-[0.18em] text-primary/80 mb-2">
                You did it!
              </p>
              <p className="text-xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2 sm:mb-3">
                Congratulations! 100% Complete 🎉
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                This is a huge win. Take a moment and enjoy it.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
