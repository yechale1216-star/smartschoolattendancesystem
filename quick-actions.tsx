"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { authService } from "@/lib/auth"
import { db } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"

interface QuickActionsProps {
  onNavigate: (tab: string) => void
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const isAdmin = authService.isAdmin()
  const user = authService.getCurrentUser()

  const handleQuickAttendance = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const students = await db.getStudents()
      const existingAttendance = await db.getAttendanceByDate(today)

      if (existingAttendance.length > 0) {
        toast({
          title: "Attendance Already Taken",
          description: `Attendance for ${today} has already been recorded.`,
          variant: "default",
        })
        onNavigate("attendance")
      } else {
        toast({
          title: "Quick Action",
          description: "Navigating to attendance tracking...",
          variant: "default",
        })
        onNavigate("attendance")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check attendance status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7) // Last 7 days

      toast({
        title: "Generating Report",
        description: "Creating weekly attendance report...",
        variant: "default",
      })

      setTimeout(() => {
        onNavigate("reports")
        toast({
          title: "Report Ready",
          description: "Weekly attendance report is ready to view.",
          variant: "default",
        })
      }, 1000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const teacherActions = [
    {
      title: "Take Attendance",
      description: "Quickly navigate to attendance tracking",
      action: handleQuickAttendance,
      icon: "✅",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    },
    {
      title: "Weekly Report",
      description: "Generate last 7 days attendance report",
      action: handleGenerateReport,
      icon: "📊",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    },
  ]

  const adminActions = [...teacherActions]

  const actions = isAdmin ? adminActions : teacherActions

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks for {isAdmin ? "administrators" : "teachers"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Card key={index} className={`cursor-pointer transition-all ${action.color}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{action.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                </div>
                <Button
                  onClick={action.action}
                  disabled={isLoading}
                  size="sm"
                  className="w-full mt-2 bg-transparent"
                  variant="outline"
                >
                  {isLoading ? "Processing..." : "Execute"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Logged in as:</span>
            <Badge variant="outline">
              {user?.role === "admin" ? "👑" : "👨‍🏫"} {user?.username} ({user?.role})
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
