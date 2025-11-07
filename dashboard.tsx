"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock, AlertTriangle, TrendingUp, Calendar } from "lucide-react"
import { db, type Student } from "@/lib/database"
import { notifications } from "@/lib/notifications"
import { QuickActions } from "@/components/quick-actions"
import { useToast } from "@/hooks/use-toast"

interface DashboardStats {
  totalStudents: number
  presentToday: number
  lateToday: number
  absentToday: number
  excusedToday: number
  attendanceRate: number
}

interface RecentActivity {
  student: Student
  status: "present" | "late" | "absent" | "excused"
  time: string
  date: string
}

interface DashboardProps {
  onNavigate?: (tab: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    excusedToday: 0,
    attendanceRate: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const students = await db.getStudents()
      const today = new Date().toISOString().split("T")[0]
      const todayAttendance = await db.getAttendanceByDate(today)
      const allAttendance = await db.getAttendance()

      // Calculate today's stats
      const presentToday = todayAttendance.filter((a) => a.status === "present").length
      const lateToday = todayAttendance.filter((a) => a.status === "late").length
      const absentToday = todayAttendance.filter((a) => a.status === "absent").length
      const excusedToday = todayAttendance.filter((a) => a.status === "excused").length

      // Calculate attendance rate (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentAttendance = allAttendance.filter(
        (a) => new Date(a.date) >= thirtyDaysAgo && ["present", "late"].includes(a.status),
      )
      const totalRecentRecords = allAttendance.filter((a) => new Date(a.date) >= thirtyDaysAgo).length
      const attendanceRate = totalRecentRecords > 0 ? (recentAttendance.length / totalRecentRecords) * 100 : 0

      setStats({
        totalStudents: students.length,
        presentToday,
        lateToday,
        absentToday,
        excusedToday,
        attendanceRate: Math.round(attendanceRate),
      })

      // Get recent activity (last 10 records)
      const recentRecords = allAttendance
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      const activity: RecentActivity[] = recentRecords
        .map((record) => {
          const student = students.find((s) => s.id === record.student_id)
          if (!student) return null

          return {
            student,
            status: record.status,
            time: new Date(record.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            date: record.date,
          }
        })
        .filter(Boolean) as RecentActivity[]

      setRecentActivity(activity)
    } catch (error) {
      notifications.error("Error", "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800"
      case "late":
        return "bg-yellow-100 text-yellow-800"
      case "absent":
        return "bg-red-100 text-red-800"
      case "excused":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (date.toDateString() === today) return "Today"
    if (date.toDateString() === yesterday) return "Yesterday"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.presentToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late Today</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lateToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{stats.absentToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Excused Today</p>
                <p className="text-2xl font-bold text-blue-600">{stats.excusedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-600">{stats.attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <QuickActions onNavigate={onNavigate || (() => {})} />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent attendance activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                        {activity.student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.student.name}</p>
                      <p className="text-xs text-gray-500">
                        {activity.student.grade} {activity.student.stream} {activity.student.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{formatDate(activity.date)}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
