import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, CheckSquare } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-primary rounded-xl p-3">
              <CalendarDays className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">DayCard</h1>
          <p className="text-xl text-muted-foreground text-balance">
            Your minimal daily task tracker. One card per day, all your tasks organized.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
          <div className="space-y-2">
            <CheckSquare className="h-6 w-6 mx-auto text-primary" />
            <h3 className="font-semibold">Simple & Clean</h3>
            <p className="text-sm text-muted-foreground">No clutter, just your daily tasks</p>
          </div>
          <div className="space-y-2">
            <CalendarDays className="h-6 w-6 mx-auto text-primary" />
            <h3 className="font-semibold">One Card Per Day</h3>
            <p className="text-sm text-muted-foreground">All tasks grouped by date</p>
          </div>
          <div className="space-y-2">
            <CheckSquare className="h-6 w-6 mx-auto text-primary" />
            <h3 className="font-semibold">Always Accessible</h3>
            <p className="text-sm text-muted-foreground">Access your tasks anytime</p>
          </div>
        </div>
      </div>
    </div>
  )
}
