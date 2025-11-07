"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit, Plus, Search, Upload, Download, AlertCircle } from "lucide-react"
import { db, type Student } from "@/lib/database"
import { notifications } from "@/lib/notifications"
import { ValidationService } from "@/lib/validation"

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All Grades")
  const [streamFilter, setStreamFilter] = useState("All Streams")
  const [sectionFilter, setSectionFilter] = useState("All Sections")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    student_id: "",
    grade: "",
    stream: "",
    section: "",
    parent_email: "",
    parent_phone: "",
    parent_name: "",
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    loadStudents()
  }, [])

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

  const resetForm = () => {
    setFormData({
      name: "",
      student_id: "",
      grade: "",
      stream: "",
      section: "",
      parent_email: "",
      parent_phone: "",
      parent_name: "",
    })
    setEditingStudent(null)
    setValidationErrors([])
  }

  const validateForm = () => {
    const existingStudentIds = students.map((s) => s.student_id)
    const currentStudentId = editingStudent?.student_id

    const nameValidation = ValidationService.validateName(formData.name)
    const studentIdValidation = ValidationService.validateStudentId(
      formData.student_id,
      existingStudentIds,
      currentStudentId,
    )
    const gradeValidation = ValidationService.validateRequired(formData.grade, "Grade")
    const sectionValidation = ValidationService.validateRequired(formData.section, "Section")
    const parentEmailValidation = ValidationService.validateEmail(formData.parent_email)
    const parentPhoneValidation = ValidationService.validatePhone(formData.parent_phone)
    const parentNameValidation = ValidationService.validateName(formData.parent_name)

    const combinedResult = ValidationService.combineValidationResults(
      nameValidation,
      studentIdValidation,
      gradeValidation,
      sectionValidation,
      parentEmailValidation,
      parentPhoneValidation,
      parentNameValidation,
    )

    setValidationErrors(combinedResult.errors)
    return combinedResult.isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      if (editingStudent) {
        await db.updateStudent(editingStudent.id, formData)
        notifications.success("Success", "Student updated successfully")
      } else {
        await db.addStudent(formData)
        notifications.success("Success", "Student added successfully")
      }

      await loadStudents()
      setIsAddModalOpen(false)
      resetForm()
    } catch (error) {
      notifications.error("Error", "Failed to save student")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name,
      student_id: student.student_id,
      grade: student.grade,
      stream: student.stream || "",
      section: student.section,
      parent_email: student.parent_email,
      parent_phone: student.parent_phone,
      parent_name: student.parent_name,
    })
    setValidationErrors([])
    setIsAddModalOpen(true)
  }

  const handleDelete = async (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      try {
        await db.deleteStudent(student.id)
        notifications.success("Success", "Student deleted successfully")
        await loadStudents()
      } catch (error) {
        notifications.error("Error", "Failed to delete student")
      }
    }
  }

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileValidation = ValidationService.validateCSVFile(file)
    if (!fileValidation.isValid) {
      notifications.error("Invalid File", fileValidation.errors.join(", "))
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split("\n").filter((line) => line.trim())

        if (lines.length < 2) {
          notifications.error("CSV Error", "CSV file must contain at least a header row and one data row")
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

        const requiredHeaders = [
          "name",
          "student_id",
          "grade",
          "section",
          "parent_email",
          "parent_phone",
          "parent_name",
        ]
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

        if (missingHeaders.length > 0) {
          notifications.error("CSV Error", `Missing required columns: ${missingHeaders.join(", ")}`)
          return
        }

        const studentsToImport = []
        const importErrors = []
        const existingStudentIds = students.map((s) => s.student_id)

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim())
          if (values.length < headers.length) continue

          const student: any = {}
          headers.forEach((header, index) => {
            student[header] = values[index] || ""
          })

          // Validate each student
          const nameValidation = ValidationService.validateName(student.name)
          const studentIdValidation = ValidationService.validateStudentId(student.student_id, existingStudentIds)
          const emailValidation = ValidationService.validateEmail(student.parent_email)
          const phoneValidation = ValidationService.validatePhone(student.parent_phone)
          const parentNameValidation = ValidationService.validateName(student.parent_name)

          const validationResult = ValidationService.combineValidationResults(
            nameValidation,
            studentIdValidation,
            emailValidation,
            phoneValidation,
            parentNameValidation,
          )

          if (validationResult.isValid && student.name && student.student_id && student.grade) {
            studentsToImport.push(student)
            existingStudentIds.push(student.student_id) // Prevent duplicates within the same import
          } else {
            importErrors.push(`Row ${i + 1}: ${validationResult.errors.join(", ")}`)
          }
        }

        if (importErrors.length > 0) {
          notifications.warning("Import Warnings", `${importErrors.length} rows had errors and were skipped`)
          console.warn("Import errors:", importErrors)
        }

        if (studentsToImport.length === 0) {
          notifications.error("Import Failed", "No valid students found to import")
          return
        }

        for (const student of studentsToImport) {
          await db.addStudent(student)
        }

        notifications.success("Success", `Imported ${studentsToImport.length} students successfully`)
        await loadStudents()
      } catch (error) {
        notifications.error("Error", "Failed to import CSV file")
      }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ""
  }

  const downloadCSVTemplate = () => {
    console.log("[v0] Starting CSV template download...")

    try {
      const headers = [
        "name",
        "student_id",
        "grade",
        "stream",
        "section",
        "parent_email",
        "parent_phone",
        "parent_name",
      ]
      const example = ["John Doe", "S001", "Grade 10", "Natural", "A", "parent@email.com", "+1234567890", "Jane Doe"]

      let csvContent = headers.join(",") + "\n"
      csvContent += example.join(",") + "\n"

      console.log("[v0] CSV template content generated")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = url
      link.download = "student_import_template.csv"
      link.style.display = "none"

      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log("[v0] CSV template download initiated successfully")
      notifications.success("Template Downloaded", "CSV template downloaded successfully")
    } catch (error) {
      console.error("[v0] CSV template download error:", error)
      notifications.error("Download Failed", "Failed to download template. Please try again.")
    }
  }

  const grades = [...new Set(students.map((s) => s.grade))].filter(Boolean)
  const streams = [...new Set(students.map((s) => s.stream).filter(Boolean))]
  const sections = [...new Set(students.map((s) => s.section))].filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
            </DialogHeader>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student ID *</Label>
                  <Input
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, student_id: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, grade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 1">Grade 1</SelectItem>
                      <SelectItem value="Grade 2">Grade 2</SelectItem>
                      <SelectItem value="Grade 3">Grade 3</SelectItem>
                      <SelectItem value="Grade 4">Grade 4</SelectItem>
                      <SelectItem value="Grade 5">Grade 5</SelectItem>
                      <SelectItem value="Grade 6">Grade 6</SelectItem>
                      <SelectItem value="Grade 7">Grade 7</SelectItem>
                      <SelectItem value="Grade 8">Grade 8</SelectItem>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stream">Stream</Label>
                  <Select
                    value={formData.stream}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, stream: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Natural">Natural</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Select
                    value={formData.section}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, section: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parent_email">Parent Email *</Label>
                  <Input
                    id="parent_email"
                    type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parent_email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_phone">Parent Phone *</Label>
                  <Input
                    id="parent_phone"
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parent_phone: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent Name *</Label>
                <Input
                  id="parent_name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, parent_name: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Saving..." : editingStudent ? "Update Student" : "Add Student"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop CSV file</p>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should have columns: name, student_id, grade, stream, section, parent_email, parent_phone,
                    parent_name
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB</p>
                </div>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
              </Label>
            </div>
            <Button variant="outline" onClick={downloadCSVTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
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

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stream
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">{student.grade}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.stream || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">{student.section}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{student.parent_name}</div>
                          <div className="text-gray-500">{student.parent_email}</div>
                          <div className="text-gray-500">{student.parent_phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(student)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(student)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-600">
        Showing {filteredStudents.length} of {students.length} students
      </div>
    </div>
  )
}
