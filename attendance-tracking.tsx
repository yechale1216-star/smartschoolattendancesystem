"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Save, Calendar, Mail, MessageSquare, Settings, UserX, Phone, Copy, Check } from "lucide-react"
import { db, type Student } from "@/lib/database"
import { notifications, combinedNotificationService, emailService } from "@/lib/notifications"
import { EmailSetupGuide } from "@/components/email-setup-guide"
import { useSchoolSettings } from "@/hooks/use-school-settings"

interface AttendanceState {
  [studentId: string]: {
    status: "present" | "late" | "absent" | "excused" | null
    note: string
  }
}

export function AttendanceTracking() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All Grades")
  const [streamFilter, setStreamFilter] = useState("All Streams")
  const [sectionFilter, setSectionFilter] = useState("All Sections")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [showEmailSetup, setShowEmailSetup] = useState(false)
  const [showAbsentStudents, setShowAbsentStudents] = useState(false)
  const [absentSearchTerm, setAbsentSearchTerm] = useState("")
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const { settings } = useSchoolSettings()

  useEffect(() => {
    loadStudents()
    emailService.setSetupRequiredCallback(() => {
      setShowEmailSetup(true)
    })
  }, [])

  useEffect(() => {
    loadAttendanceForDate()
  }, [selectedDate, students])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, gradeFilter, streamFilter, sectionFilter])

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const data = await db.getStudents()
      setStudents(data)
    } catch (error) {
      notifications.error("Error", "Failed to load students")
    } finally {
      setIsLoading(false)
    }
  }

  const loadAttendanceForDate = async () => {
    if (students.length === 0) return

    try {
      const attendanceRecords = await db.getAttendanceByDate(selectedDate)
      const newAttendanceState: AttendanceState = {}

      students.forEach((student) => {
        newAttendanceState[student.id] = {
          status: null,
          note: "",
        }
      })

      attendanceRecords.forEach((record) => {
        if (newAttendanceState[record.student_id]) {
          newAttendanceState[record.student_id] = {
            status: record.status,
            note: record.note || "",
          }
        }
      })

      setAttendanceState(newAttendanceState)
    } catch (error) {
      notifications.error("Error", "Failed to load attendance records")
    }
  }

  const filterStudents = () => {
    let filtered = students

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.stream?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.section.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (gradeFilter !== "All Grades") {
      filtered = filtered.filter((student) => student.grade === gradeFilter)
    }

    if (streamFilter !== "All Streams") {
      filtered = filtered.filter((student) => student.stream === streamFilter)
    }

    if (sectionFilter !== "All Sections") {
      filtered = filtered.filter((student) => student.section === sectionFilter)
    }

    setFilteredStudents(filtered)
  }

  const updateAttendance = (studentId: string, status: "present" | "late" | "absent" | "excused", note = "") => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note,
      },
    }))
  }

  const updateNote = (studentId: string, note: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }))
  }

  const markAllAsPresent = () => {
    const newAttendanceState: AttendanceState = {}
    filteredStudents.forEach((student) => {
      newAttendanceState[student.id] = {
        status: "present",
        note: "",
      }
    })
    setAttendanceState((prev) => ({
      ...prev,
      ...newAttendanceState,
    }))
    notifications.success("Success", `Marked ${filteredStudents.length} students as present`)
  }

  const saveAttendance = async () => {
    setIsSaving(true)
    try {
      const attendanceRecords = Object.entries(attendanceState)
        .filter(([_, data]) => data.status !== null)
        .map(([studentId, data]) => ({
          student_id: studentId,
          date: selectedDate,
          status: data.status!,
          note: data.note,
        }))

      if (attendanceRecords.length === 0) {
        notifications.warning("No Data", "Please mark attendance for at least one student")
        return
      }

      await db.markAttendance(attendanceRecords)
      notifications.success("Success", `Attendance saved for ${attendanceRecords.length} students`)

      setTimeout(() => {}, 2000)
    } catch (error) {
      notifications.error("Error", "Failed to save attendance")
    } finally {
      setIsSaving(false)
    }
  }

  const sendNotifications = async () => {
    setIsSendingNotifications(true)
    try {
      const notificationsToSend = Object.entries(attendanceState)
        .filter(([_, data]) => data.status && ["absent", "late", "excused"].includes(data.status))
        .map(([studentId, data]) => {
          const student = students.find((s) => s.id === studentId)
          return student
            ? {
                student,
                status: data.status as "absent" | "late" | "excused",
                note: data.note,
              }
            : null
        })
        .filter(Boolean) as Array<{
        student: Student
        status: "absent" | "late" | "excused"
        note: string
      }>

      if (notificationsToSend.length === 0) {
        notifications.info("No Notifications", "No absent, late, or excused students to notify")
        return
      }

      const result = await combinedNotificationService.sendBulkNotifications(notificationsToSend, {
        email: true,
        sms: true,
      })

      const totalSuccess = result.email.success + result.sms.success
      const totalFailed = result.email.failed + result.sms.failed

      if (result.email.failed > 0 && result.sms.success > 0) {
        notifications.success(
          "SMS Sent Successfully",
          `${result.sms.success} SMS notifications sent successfully. Email setup required for email notifications.`,
          4000,
        )
      } else if (totalFailed > 0) {
        const successMessage = `Successfully sent ${totalSuccess} notifications (${result.email.success} emails, ${result.sms.success} SMS). ${totalFailed} failed to send.`
        notifications.success("Notifications Sent", successMessage)
      } else {
        const successMessage = `Successfully sent ${totalSuccess} notifications (${result.email.success} emails, ${result.sms.success} SMS)`
        notifications.success("Notifications Sent", successMessage)
      }

      setTimeout(() => {}, 3000)
    } catch (error) {
      notifications.error("Error", "Failed to send notifications")
    } finally {
      setIsSendingNotifications(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200"
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "absent":
        return "bg-red-100 text-red-800 border-red-200"
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getAttendanceStats = () => {
    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unmarked: 0,
    }

    Object.values(attendanceState).forEach((data) => {
      if (data.status) {
        stats[data.status]++
      } else {
        stats.unmarked++
      }
    })

    return stats
  }

  const getAbsentStudents = () => {
    return filteredStudents.filter((student) => {
      const attendance = attendanceState[student.id]
      return attendance?.status === "absent"
    })
  }

  const getFilteredAbsentStudents = () => {
    const absentStudents = getAbsentStudents()

    if (!absentSearchTerm) {
      return absentStudents
    }

    return absentStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        student.grade.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        student.stream?.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
        student.section.toLowerCase().includes(absentSearchTerm.toLowerCase()),
    )
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPhone(text)
      notifications.success("Copied!", `${label} copied to clipboard`)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch (error) {
      notifications.error("Error", "Failed to copy to clipboard")
    }
  }

  const initiateCall = (parentPhone: string, schoolPhone?: string) => {
    try {
      window.open(`tel:${parentPhone}`, "_blank")
    } catch (error) {
      const message = schoolPhone
        ? `Please call ${parentPhone} from your school phone: ${schoolPhone}`
        : `Please call ${parentPhone}`
      notifications.info("Call Instructions", message, 5000)
    }
  }

  const clearAbsentStudents = () => {
    const newAttendanceState: AttendanceState = { ...attendanceState }
    let clearedCount = 0

    Object.keys(newAttendanceState).forEach((studentId) => {
      if (newAttendanceState[studentId]?.status === "absent") {
        newAttendanceState[studentId] = {
          status: null,
          note: "",
        }
        clearedCount++
      }
    })

    setAttendanceState(newAttendanceState)
    notifications.success("Cleared", `Cleared ${clearedCount} absent student${clearedCount !== 1 ? "s" : ""}`)
  }

  const stats = getAttendanceStats()
  const grades = [...new Set(students.map((s) => s.grade))].filter(Boolean)
  const streams = [...new Set(students.map((s) => s.stream).filter(Boolean))]
  const sections = [...new Set(students.map((s) => s.section))].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Attendance Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="attendance-date">Select Date</Label>
              <Input
                id="attendance-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Present:</span>
                <Badge className="bg-green-100 text-green-800">{stats.present}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Late:</span>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.late}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Absent:</span>
                <Badge className="bg-red-100 text-red-800">{stats.absent}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Excused:</span>
                <Badge className="bg-blue-100 text-blue-800">{stats.excused}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search students by name, ID, grade, stream, or section"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Grades">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={streamFilter} onValueChange={setStreamFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Streams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Streams">All Streams</SelectItem>
                  {streams.map((stream) => (
                    <SelectItem key={stream} value={stream}>
                      {stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Sections">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900 flex items-center justify-between">
            Attendance Actions
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailSetup(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Settings className="w-4 h-4 mr-1" />
              Email Setup
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <Button
              onClick={markAllAsPresent}
              variant="secondary"
              className="transition-all duration-200 hover:scale-105 bg-gray-100 hover:bg-gray-200"
            >
              Mark All as Present
            </Button>
            <Button
              onClick={saveAttendance}
              disabled={isSaving}
              className="transition-all duration-200 hover:scale-105 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Attendance"}
            </Button>
            <Button
              onClick={sendNotifications}
              disabled={isSendingNotifications}
              variant="outline"
              className="transition-all duration-200 hover:scale-105 border-green-200 hover:border-green-300 hover:bg-green-50 bg-transparent"
            >
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <MessageSquare className="w-3 h-3" />
              </div>
              <span className="ml-2">
                {isSendingNotifications ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                    Sending...
                  </span>
                ) : (
                  "Send Notifications"
                )}
              </span>
            </Button>
            <Button
              onClick={() => setShowAbsentStudents(true)}
              variant="outline"
              className="transition-all duration-200 hover:scale-105 border-red-200 hover:border-red-300 hover:bg-red-50 bg-transparent"
            >
              <UserX className="w-4 h-4 mr-2" />
              View Absent Students ({getAbsentStudents().length})
            </Button>
            <Button
              onClick={clearAbsentStudents}
              variant="outline"
              disabled={getAbsentStudents().length === 0}
              className="transition-all duration-200 hover:scale-105 border-orange-200 hover:border-orange-300 hover:bg-orange-50 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserX className="w-4 h-4 mr-2" />
              Clear Absent Students
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const attendance = attendanceState[student.id] || { status: null, note: "" }
            return (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">
                        {student.student_id} • {student.grade} {student.stream} {student.section}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {(["present", "late", "absent", "excused"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={attendance.status === status ? "default" : "outline"}
                        size="sm"
                        className={`capitalize ${
                          attendance.status === status ? getStatusColor(status) : ""
                        } hover:scale-105 transition-transform`}
                        onClick={() => updateAttendance(student.id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>

                  {attendance.status && ["absent", "late", "excused"].includes(attendance.status) && (
                    <div className="space-y-2">
                      <Label htmlFor={`note-${student.id}`} className="text-xs">
                        Note (optional)
                      </Label>
                      <Textarea
                        id={`note-${student.id}`}
                        placeholder="Add a note..."
                        value={attendance.note}
                        onChange={(e) => updateNote(student.id, e.target.value)}
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  )}

                  {attendance.status && (
                    <div className="mt-3 pt-3 border-t">
                      <Badge className={getStatusColor(attendance.status)}>Status: {attendance.status}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="text-sm text-gray-600">
        Showing {filteredStudents.length} of {students.length} students
      </div>

      <Dialog open={showEmailSetup} onOpenChange={setShowEmailSetup}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Configuration Setup</DialogTitle>
          </DialogHeader>
          <EmailSetupGuide onClose={() => setShowEmailSetup(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showAbsentStudents} onOpenChange={setShowAbsentStudents}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              Absent Students - {selectedDate}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search absent students by name, ID, grade, stream, or section"
                value={absentSearchTerm}
                onChange={(e) => setAbsentSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {settings?.schoolPhone && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">School Phone Number:</span>
                    <span className="text-base font-mono text-blue-700">{settings.schoolPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(settings.schoolPhone!, "School phone")}
                      className="h-8 text-xs"
                    >
                      {copiedPhone === settings.schoolPhone ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Badge variant="outline" className="text-xs bg-white border-blue-300">
                      Call families from this number
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Use your school phone to call parents. Click "Call" buttons below to dial parent numbers.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-gray-600">
                Showing {getFilteredAbsentStudents().length} of {getAbsentStudents().length} absent students
              </p>
              {getAbsentStudents().length === 0 && (
                <Badge className="bg-green-100 text-green-800">No absent students today!</Badge>
              )}
            </div>

            {getAbsentStudents().length === 0 ? (
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No absent students for this date</p>
                <p className="text-sm text-gray-500 mt-1">All students are marked as present, late, or excused</p>
              </div>
            ) : getFilteredAbsentStudents().length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No students found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                {getFilteredAbsentStudents().map((student) => {
                  const attendance = attendanceState[student.id]
                  return (
                    <Card key={student.id} className="border-red-200 bg-red-50/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center text-white font-medium">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{student.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5">ID: {student.student_id}</div>
                            <div className="text-xs text-gray-600">
                              {student.grade} {student.stream} {student.section}
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="text-xs">
                                <span className="font-medium text-gray-700">Parent:</span>
                                <span className="text-gray-600 ml-1">{student.parent_name}</span>
                              </div>
                              <div className="text-xs">
                                <span className="font-medium text-gray-700">Email:</span>
                                <span className="text-gray-600 ml-1 break-all">{student.parent_email}</span>
                              </div>
                              <div className="bg-white border border-gray-200 rounded-lg p-2 mt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-700">Parent Phone:</span>
                                  <span className="text-sm font-mono font-semibold text-gray-900">
                                    {student.parent_phone}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => initiateCall(student.parent_phone, settings?.schoolPhone)}
                                    className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call Family
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(student.parent_phone, "Parent phone")}
                                    className="h-8 px-3"
                                  >
                                    {copiedPhone === student.parent_phone ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                {settings?.schoolPhone && (
                                  <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>Call from: {settings.schoolPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {attendance?.note && (
                              <div className="mt-2 pt-2 border-t border-red-200">
                                <p className="text-xs text-gray-700">
                                  <span className="font-medium">Note:</span> {attendance.note}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {getAbsentStudents().length > 0 && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAbsentStudents(false)
                    setAbsentSearchTerm("")
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    setShowAbsentStudents(false)
                    await sendNotifications()
                  }}
                  disabled={isSendingNotifications}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Notifications to Absent Students
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
