"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, Printer, Calendar, AlertCircle } from "lucide-react"
import { db, type Student } from "@/lib/database"
import { notifications } from "@/lib/notifications"
import { ValidationService } from "@/lib/validation"

interface StudentReport {
  student: Student
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number
  excusedDays: number
  attendanceRate: number
}

export function Reports() {
  const [students, setStudents] = useState<Student[]>([])
  const [reportData, setReportData] = useState<StudentReport[]>([])
  const [filteredReports, setFilteredReports] = useState<StudentReport[]>([])
  const [reportType, setReportType] = useState("monthly")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All Grades")
  const [streamFilter, setStreamFilter] = useState("All Streams")
  const [sectionFilter, setSectionFilter] = useState("All Sections")
  const [isLoading, setIsLoading] = useState(false)
  const [dateValidationErrors, setDateValidationErrors] = useState<string[]>([])

  useEffect(() => {
    loadStudents()
    setDefaultDates()
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      const validation = ValidationService.validateDateRange(startDate, endDate)
      setDateValidationErrors(validation.errors)

      if (validation.isValid) {
        generateReport()
      }
    }
  }, [startDate, endDate, reportType])

  useEffect(() => {
    filterReports()
  }, [reportData, gradeFilter, streamFilter, sectionFilter])

  const loadStudents = async () => {
    try {
      const data = await db.getStudents()
      setStudents(data)
    } catch (error) {
      notifications.error("Error", "Failed to load students")
    }
  }

  const setDefaultDates = () => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    setStartDate(firstDayOfMonth.toISOString().split("T")[0])
    setEndDate(today.toISOString().split("T")[0])
  }

  const generateReport = async () => {
    if (!startDate || !endDate) return

    const validation = ValidationService.validateDateRange(startDate, endDate)
    if (!validation.isValid) {
      setDateValidationErrors(validation.errors)
      return
    }

    setIsLoading(true)
    try {
      const attendance = await db.getAttendance()
      const filteredAttendance = attendance.filter((record) => record.date >= startDate && record.date <= endDate)

      const reports: StudentReport[] = students.map((student) => {
        const studentAttendance = filteredAttendance.filter((record) => record.student_id === student.id)

        const presentDays = studentAttendance.filter((record) => record.status === "present").length
        const lateDays = studentAttendance.filter((record) => record.status === "late").length
        const absentDays = studentAttendance.filter((record) => record.status === "absent").length
        const excusedDays = studentAttendance.filter((record) => record.status === "excused").length
        const totalDays = studentAttendance.length

        const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0

        return {
          student,
          totalDays,
          presentDays,
          lateDays,
          absentDays,
          excusedDays,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        }
      })

      setReportData(reports)
      setDateValidationErrors([])
    } catch (error) {
      notifications.error("Error", "Failed to generate report")
    } finally {
      setIsLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = reportData

    if (gradeFilter !== "All Grades") {
      filtered = filtered.filter((report) => report.student.grade === gradeFilter)
    }

    if (streamFilter !== "All Streams") {
      filtered = filtered.filter((report) => report.student.stream === streamFilter)
    }

    if (sectionFilter !== "All Sections") {
      filtered = filtered.filter((report) => report.student.section === sectionFilter)
    }

    setFilteredReports(filtered)
  }

  const exportToCSV = () => {
    console.log("[v0] Starting CSV export...")
    console.log("[v0] Filtered reports count:", filteredReports.length)

    if (filteredReports.length === 0) {
      notifications.warning("No Data", "No data available to export")
      return
    }

    try {
      const headers = [
        "Student Name",
        "Student ID",
        "Grade",
        "Stream",
        "Section",
        "Total Days",
        "Present",
        "Late",
        "Absent",
        "Excused",
        "Attendance Rate (%)",
      ]

      const csvData = filteredReports.map((report) => [
        `"${report.student.name}"`,
        report.student.student_id,
        `"${report.student.grade}"`,
        `"${report.student.stream || ""}"`,
        report.student.section,
        report.totalDays,
        report.presentDays,
        report.lateDays,
        report.absentDays,
        report.excusedDays,
        report.attendanceRate,
      ])

      const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

      console.log("[v0] CSV content generated, length:", csvContent.length)

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = url
      link.download = `attendance_report_${startDate}_to_${endDate}.csv`
      link.style.display = "none"

      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log("[v0] CSV download initiated successfully")
      notifications.success("Export Complete", `Report exported successfully with ${filteredReports.length} records`)
    } catch (error) {
      console.error("[v0] CSV export error:", error)
      notifications.error("Export Failed", "Failed to export report. Please try again.")
    }
  }

  const printReport = () => {
    try {
      window.print()
      notifications.info("Print", "Print dialog opened")
    } catch (error) {
      notifications.error("Print Failed", "Failed to open print dialog")
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600"
    if (rate >= 85) return "text-yellow-600"
    return "text-red-600"
  }

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 95) return "bg-green-100 text-green-800"
    if (rate >= 85) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const grades = [...new Set(students.map((s) => s.grade))].filter(Boolean)
  const streams = [...new Set(students.map((s) => s.stream).filter(Boolean))]
  const sections = [...new Set(students.map((s) => s.section))].filter(Boolean)

  const totalStats = filteredReports.reduce(
    (acc, report) => ({
      totalStudents: acc.totalStudents + 1,
      totalPresent: acc.totalPresent + report.presentDays,
      totalLate: acc.totalLate + report.lateDays,
      totalAbsent: acc.totalAbsent + report.absentDays,
      totalExcused: acc.totalExcused + report.excusedDays,
      averageAttendance: acc.averageAttendance + report.attendanceRate,
    }),
    { totalStudents: 0, totalPresent: 0, totalLate: 0, totalAbsent: 0, totalExcused: 0, averageAttendance: 0 },
  )

  if (totalStats.totalStudents > 0) {
    totalStats.averageAttendance = Math.round((totalStats.averageAttendance / totalStats.totalStudents) * 100) / 100
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Reports</h2>
        <div className="flex gap-2">
          <Button onClick={printReport} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={exportToCSV} disabled={filteredReports.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dateValidationErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {dateValidationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="weekly">Weekly Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={isLoading || dateValidationErrors.length > 0}
                className="w-full"
              >
                {isLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredReports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{totalStats.totalStudents}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Present Days</p>
                <p className="text-2xl font-bold text-green-600">{totalStats.totalPresent}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Late Days</p>
                <p className="text-2xl font-bold text-yellow-600">{totalStats.totalLate}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Absent Days</p>
                <p className="text-2xl font-bold text-red-600">{totalStats.totalAbsent}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Excused Days</p>
                <p className="text-2xl font-bold text-blue-600">{totalStats.totalExcused}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Avg Attendance</p>
                <p className={`text-2xl font-bold ${getAttendanceRateColor(totalStats.averageAttendance)}`}>
                  {totalStats.averageAttendance}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Table */}
      {filteredReports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Grade</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Stream</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Section</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Total</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Present</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Late</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Absent</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Excused</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.student.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{report.student.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{report.student.student_id}</td>
                      <td className="border border-gray-300 px-4 py-2">{report.student.grade}</td>
                      <td className="border border-gray-300 px-4 py-2">{report.student.stream || "-"}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{report.student.section}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{report.totalDays}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-green-600">
                        {report.presentDays}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-yellow-600">
                        {report.lateDays}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-red-600">{report.absentDays}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-blue-600">
                        {report.excusedDays}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceRateBadge(report.attendanceRate)}`}
                        >
                          {report.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              No data available for the selected criteria. Please adjust your filters or date range.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
