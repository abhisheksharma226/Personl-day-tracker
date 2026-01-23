'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CalendarDays, LogOut, Plus, Search, Menu, X, Zap, Flame } from 'lucide-react'
import { DayCard } from '@/components/day-card'
import { AddTaskModal } from '@/components/add-task-modal'
import { API_ENDPOINTS } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'
import Loading from './loading'

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
  const searchParams = useSearchParams()

  const [user, setUser] = useState<User | null>(null)
  const [dayCards, setDayCards] = useState<DayCardData[]>([])
  const [searchDate, setSearchDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
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

    let streakCount = 1

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])

      const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)

      if (diff === 1) {
        streakCount++
      } else {
        break
      }
    }

    return streakCount
  }

  const [editingTask, setEditingTask] = useState<{
    taskId: string
    currentTask: Task
  } | null>(null)

  useEffect(() => {
    const currentUser = localStorage.getItem('daycard_current_user')
    if (!currentUser) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(currentUser)
    setUser(parsedUser)
    loadTasks(parsedUser.id)
  }, [router])

  const loadTasks = async (userId: string) => {
    setIsLoadingTasks(true)
    try {
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
      const totalTasks = data.length
      setPoints(totalTasks)

      const calculatedStreak = calculateStreak(cards)
      setStreak(calculatedStreak)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const handleAddTasks = async (date: string, tasks: any[]) => {
    if (!user) return
    setIsAddingTasks(true)
    try {
      await fetch(`${API_ENDPOINTS.tasks}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date,
          tasks,
        }),
      })
      await loadTasks(user.id)
    } catch (error) {
      console.error('Failed to add tasks:', error)
    } finally {
      setIsAddingTasks(false)
    }
  }

  const handleToggleTask = async (_: string, taskId: string) => {
    setIsTogglingTask(true)
    try {
      await fetch(`${API_ENDPOINTS.tasks}/${taskId}/toggle`, { method: 'PATCH' })
      await loadTasks(user!.id)
    } catch (error) {
      console.error('Failed to toggle task:', error)
    } finally {
      setIsTogglingTask(false)
    }
  }

  const handleDeleteTask = async (_: string, taskId: string) => {
    setIsDeletingTask(true)
    try {
      await fetch(`${API_ENDPOINTS.tasks}/${taskId}`, { method: 'DELETE' })
      await loadTasks(user!.id)
    } catch (error) {
      console.error('Failed to delete task:', error)
    } finally {
      setIsDeletingTask(false)
    }
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
    try {
      await fetch(`${API_ENDPOINTS.tasks}/${editingTask.taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, startTime, endTime }),
      })
      setIsEditModalOpen(false)
      setEditingTask(null)
      await loadTasks(user!.id)
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    localStorage.removeItem('daycard_current_user')
    router.push('/login')
  }

  const filteredCards = searchDate ? dayCards.filter((card) => card.date.includes(searchDate)) : dayCards

  if (!user) return null

  return (
    <div className='min-h-screen flex bg-background [&_input[type=checkbox]]:cursor-pointer overflow-hidden'>
      {/* Background gradient */}
      <div className='fixed inset-0 pointer-events-none'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl' />
        <div className='absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl' />
      </div>

      {/* Mobile Sidebar Button */}
      <Button
        variant='ghost'
        size='icon'
        className='fixed top-4 left-4 z-50 md:hidden hover:bg-primary/20 hover:text-primary'
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
      </Button>

      {isSidebarOpen && <div className='fixed inset-0 bg-black/50 z-30 md:hidden' onClick={() => setIsSidebarOpen(false)} />}

      {/* Left Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 bg-card/40 backdrop-blur-xl border-r border-border/50 flex flex-col
          transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 animate-slide-in-left
        `}
      >
        <div className='p-6 border-b border-border/30'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-gradient-to-br from-primary to-accent p-2 rounded-lg animate-pulse-glow'>
              <CalendarDays className='h-5 w-5 text-white' />
            </div>
            <div>
              <h1 className='text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'>DayCard</h1>
              <p className='text-xs text-muted-foreground'>Task Master</p>
            </div>
          </div>
          <div className='space-y-1'>
            <p className='font-semibold text-foreground'>{user.name}</p>
            <p className='text-sm text-muted-foreground truncate'>{user.email}</p>
          </div>

          <div className='mt-6 space-y-3'>
            <div className='group relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-4 border border-primary/20 hover:border-primary/40 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 animate-shimmer' />
              <div className='relative'>
                <p className='text-sm text-muted-foreground flex items-center gap-2'>
                  <Flame className='h-4 w-4 text-orange-500' /> Streak
                </p>
                <p className='text-3xl font-bold text-foreground mt-1'>{streak}</p>
                <p className='text-xs text-muted-foreground mt-1'>days active</p>
              </div>
            </div>

            <div className='group relative overflow-hidden rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 p-4 border border-accent/20 hover:border-accent/40 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-r from-accent/0 via-white/10 to-accent/0 animate-shimmer' />
              <div className='relative'>
                <p className='text-sm text-muted-foreground flex items-center gap-2'>
                  <Zap className='h-4 w-4 text-cyan-400' /> Points
                </p>
                <p className='text-3xl font-bold text-foreground mt-1'>{points}</p>
                <p className='text-xs text-muted-foreground mt-1'>total tasks</p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-1' />

        <div className='p-6 border-t border-border/30'>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className='w-full bg-gradient-to-r from-destructive/20 to-destructive/10 hover:from-destructive/30 hover:to-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/40 justify-start transition-all duration-300'
          >
            {isLoggingOut ? (
              <>
                <Spinner size='sm' className='mr-2' />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className='h-4 w-4 mr-2' />
                Logout
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className='flex-1 overflow-auto'>
        <div className='max-w-7xl mx-auto p-6 md:p-8 lg:p-12 relative z-10'>
          {/* Header */}
          <div className='mb-8 space-y-6 animate-fade-in-up'>
            {/* Mobile Header */}
            <div className='flex items-center justify-between md:hidden'>
              <div>
                <h2 className='text-2xl font-bold tracking-tight text-foreground'>Daily Tasks</h2>
                <p className='text-sm text-muted-foreground mt-1'>Stay productive every day</p>
              </div>

              <div className='flex gap-3'>
                <div className='bg-gradient-to-br from-orange-500/20 to-orange-500/5 px-3 py-2 rounded-lg border border-orange-500/20 text-center'>
                  <p className='text-xs text-muted-foreground'>🔥</p>
                  <p className='text-sm font-bold text-foreground'>{streak}</p>
                </div>

                <div className='bg-gradient-to-br from-cyan-400/20 to-cyan-400/5 px-3 py-2 rounded-lg border border-cyan-400/20 text-center'>
                  <p className='text-xs text-muted-foreground'>⚡</p>
                  <p className='text-sm font-bold text-foreground'>{points}</p>
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className='hidden md:block'>
              <h2 className='text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent'>
                Daily Tasks
              </h2>
              <p className='text-muted-foreground mt-2'>Manage your day, build your future</p>
            </div>

            {/* Controls */}
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  type='text'
                  placeholder='Search by date (YYYY-MM-DD)'
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className='pl-10 bg-card/50 border-border/50 focus:border-primary focus:ring-primary transition-all duration-300'
                />
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                disabled={isAddingTasks}
                className='bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/20'
              >
                {isAddingTasks ? (
                  <>
                    <Spinner size='sm' className='mr-2' />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className='h-4 w-4 mr-2' />
                    Add Tasks
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Task Cards Grid */}
          {isLoadingTasks ? (
            <div className='flex flex-col items-center justify-center py-24'>
              <div className='relative mb-6'>
                <div className='absolute inset-0 bg-primary/20 rounded-full blur-xl' />
                <Spinner size='lg' className='relative' />
              </div>
              <p className='text-muted-foreground text-sm'>Loading your tasks...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className='text-center py-24 animate-fade-in-up'>
              <div className='inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 border border-accent/20 mb-4'>
                <CalendarDays className='h-12 w-12 text-accent' />
              </div>
              <h3 className='text-lg font-semibold mb-2 text-foreground'>No tasks yet</h3>
              <p className='text-muted-foreground mb-6'>Start planning your day by adding your first task</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                disabled={isAddingTasks}
                className='bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white'
              >
                <Plus className='h-4 w-4 mr-2' />
                Create Your First Task
              </Button>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {filteredCards.map((card, index) => (
                <div
                  key={card.date}
                  style={{
                    animation: 'fadeInUp 0.5s ease-out forwards',
                    animationDelay: `${index * 50}ms`,
                    opacity: 0,
                  }}
                >
                  <DayCard
                    date={card.date}
                    tasks={card.tasks}
                    onToggleTask={(taskId) => handleToggleTask(card.date, taskId)}
                    onDeleteTask={(taskId) => handleDeleteTask(card.date, taskId)}
                    onEditTask={(taskId) => handleEditTask(card.date, taskId)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AddTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddTasks={handleAddTasks} />

      {editingTask && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className='sm:max-w-md animate-fade-in-scale border-border/50'>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update the task details below.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const newText = formData.get('taskText') as string
                const startTime = formData.get('startTime') as string
                const endTime = formData.get('endTime') as string
                if (newText.trim() && startTime && endTime) {
                  handleUpdateTask(newText, startTime, endTime)
                }
              }}
            >
              <div className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='taskText'>Task</Label>
                  <Input
                    id='taskText'
                    name='taskText'
                    defaultValue={editingTask.currentTask.text}
                    disabled={isSavingEdit}
                    required
                    className='bg-card/50 border-border/50 focus:border-primary focus:ring-primary'
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='startTime'>Start Time</Label>
                    <Input
                      id='startTime'
                      name='startTime'
                      type='time'
                      defaultValue={editingTask.currentTask.startTime}
                      disabled={isSavingEdit}
                      required
                      className='bg-card/50 border-border/50 focus:border-primary focus:ring-primary'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='endTime'>End Time</Label>
                    <Input
                      id='endTime'
                      name='endTime'
                      type='time'
                      defaultValue={editingTask.currentTask.endTime}
                      disabled={isSavingEdit}
                      required
                      className='bg-card/50 border-border/50 focus:border-primary focus:ring-primary'
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingTask(null)
                  }}
                  disabled={isSavingEdit}
                  className='border-border/50'
                >
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={isSavingEdit}
                  className='bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white'
                >
                  {isSavingEdit ? (
                    <>
                      <Spinner size='sm' className='mr-2' />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
