export interface Student {
  id: string
  name: string
  student_id: string
  grade: string
  stream?: string
  section: string
  parent_email: string
  parent_phone: string
  parent_name: string
  created_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  date: string
  status: "present" | "late" | "absent" | "excused"
  note?: string
  created_at: string
}

export interface Settings {
  id: string
  sendEmailNotifications: boolean
  sendSmsNotifications: boolean
  autoSendNotifications: boolean
  smtpServer: string
  smtpPort: number
  emailUsername: string
  emailPassword: string
  schoolName?: string
  academicYear?: string
  schoolAddress?: string
  schoolPhone?: string
  schoolId?: string
  emailNotifications?: boolean
  dailyReports?: boolean
  notificationTime?: string
  attendanceThreshold?: number
  gradeSystem?: string
  allowLateMark?: boolean
}

class LocalDatabase {
  private readonly BASE_STUDENTS_KEY = "attendance_students"
  private readonly BASE_ATTENDANCE_KEY = "attendance_records"
  private readonly BASE_SETTINGS_KEY = "attendance_settings"

  private getStudentsKey(schoolId?: string): string {
    const id = schoolId || this.getCurrentSchoolId()
    return id ? `${this.BASE_STUDENTS_KEY}_${id}` : this.BASE_STUDENTS_KEY
  }

  private getAttendanceKey(schoolId?: string): string {
    const id = schoolId || this.getCurrentSchoolId()
    return id ? `${this.BASE_ATTENDANCE_KEY}_${id}` : this.BASE_ATTENDANCE_KEY
  }

  private getSettingsKey(schoolId?: string): string {
    const id = schoolId || this.getCurrentSchoolId()
    return id ? `${this.BASE_SETTINGS_KEY}_${id}` : this.BASE_SETTINGS_KEY
  }

  private getCurrentSchoolId(): string | null {
    if (!this.isClient()) return null

    try {
      const currentUser = localStorage.getItem("attendance_current_user")
      if (currentUser) {
        const user = JSON.parse(currentUser)
        return user.schoolId || null
      }
    } catch (error) {
      console.error("Error getting current school ID:", error)
    }
    return null
  }

  initializeSchoolData(schoolId: string): void {
    if (!this.isClient()) return

    console.log("[v0] Checking data for school:", schoolId)

    const existingStudents = localStorage.getItem(this.getStudentsKey(schoolId))
    const existingAttendance = localStorage.getItem(this.getAttendanceKey(schoolId))
    const existingSettings = localStorage.getItem(this.getSettingsKey(schoolId))

    // Only initialize students if they don't exist
    if (!existingStudents) {
      console.log("[v0] Initializing empty students array for school:", schoolId)
      localStorage.setItem(this.getStudentsKey(schoolId), JSON.stringify([]))
    } else {
      console.log("[v0] Students data already exists for school:", schoolId)
    }

    // Only initialize attendance if it doesn't exist
    if (!existingAttendance) {
      console.log("[v0] Initializing empty attendance array for school:", schoolId)
      localStorage.setItem(this.getAttendanceKey(schoolId), JSON.stringify([]))
    } else {
      console.log("[v0] Attendance data already exists for school:", schoolId)
    }

    // Only initialize settings if they don't exist
    if (!existingSettings) {
      console.log("[v0] Initializing default settings for school:", schoolId)
      const defaultSettings: Settings = {
        id: "1",
        sendEmailNotifications: true,
        sendSmsNotifications: true,
        autoSendNotifications: true,
        smtpServer: "smtp.gmail.com",
        smtpPort: 587,
        emailUsername: "",
        emailPassword: "",
        schoolName: "Smart Attendance Tracker",
        academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        schoolAddress: "",
        schoolPhone: "",
        schoolId: schoolId,
        emailNotifications: true,
        dailyReports: false,
        notificationTime: "16:00",
        attendanceThreshold: 75,
        gradeSystem: "standard",
        allowLateMark: true,
      }
      localStorage.setItem(this.getSettingsKey(schoolId), JSON.stringify(defaultSettings))
    } else {
      console.log("[v0] Settings already exist for school:", schoolId)
    }

    console.log("[v0] School data check completed")
  }

  async getStudents(): Promise<Student[]> {
    if (!this.isClient()) return []

    try {
      const data = localStorage.getItem(this.getStudentsKey())
      const students = data ? JSON.parse(data) : []
      return students.sort((a: Student, b: Student) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error("Error loading students:", error)
      return []
    }
  }

  async addStudent(student: Omit<Student, "id" | "created_at">): Promise<Student> {
    const students = await this.getStudents()
    const newStudent: Student = {
      ...student,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    }

    students.push(newStudent)
    students.sort((a, b) => a.name.localeCompare(b.name))
    if (this.isClient()) {
      localStorage.setItem(this.getStudentsKey(), JSON.stringify(students))
    }
    return newStudent
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student | null> {
    const students = await this.getStudents()
    const index = students.findIndex((s) => s.id === id)

    if (index === -1) return null

    students[index] = { ...students[index], ...updates }
    students.sort((a, b) => a.name.localeCompare(b.name))
    if (this.isClient()) {
      localStorage.setItem(this.getStudentsKey(), JSON.stringify(students))
    }
    return students[index]
  }

  async deleteStudent(id: string): Promise<boolean> {
    const students = await this.getStudents()
    const filteredStudents = students.filter((s) => s.id !== id)

    if (filteredStudents.length === students.length) return false

    if (this.isClient()) {
      localStorage.setItem(this.getStudentsKey(), JSON.stringify(filteredStudents))

      const attendance = await this.getAttendance()
      const filteredAttendance = attendance.filter((a) => a.student_id !== id)
      localStorage.setItem(this.getAttendanceKey(), JSON.stringify(filteredAttendance))
    }

    return true
  }

  async getAttendance(): Promise<AttendanceRecord[]> {
    if (!this.isClient()) return []

    try {
      const data = localStorage.getItem(this.getAttendanceKey())
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error loading attendance:", error)
      return []
    }
  }

  async markAttendance(records: Omit<AttendanceRecord, "id" | "created_at">[]): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendance()

    const filteredAttendance = attendance.filter((a) => a.date !== records[0]?.date)

    const newRecords: AttendanceRecord[] = records.map((record) => ({
      ...record,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    }))

    const updatedAttendance = [...filteredAttendance, ...newRecords]
    if (this.isClient()) {
      localStorage.setItem(this.getAttendanceKey(), JSON.stringify(updatedAttendance))
    }

    return newRecords
  }

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendance()
    return attendance.filter((a) => a.date === date)
  }

  async getAttendanceByStudent(studentId: string): Promise<AttendanceRecord[]> {
    const attendance = await this.getAttendance()
    return attendance.filter((a) => a.student_id === studentId)
  }

  async saveAttendance(record: Omit<AttendanceRecord, "id" | "created_at">): Promise<AttendanceRecord> {
    const attendance = await this.getAttendance()
    const newRecord: AttendanceRecord = {
      ...record,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    }

    attendance.push(newRecord)
    if (this.isClient()) {
      localStorage.setItem(this.getAttendanceKey(), JSON.stringify(attendance))
    }
    return newRecord
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendance()
  }

  async getSettings(): Promise<Settings> {
    if (!this.isClient()) {
      return this.getDefaultSettings()
    }

    try {
      const data = localStorage.getItem(this.getSettingsKey())
      return data ? JSON.parse(data) : this.getDefaultSettings()
    } catch (error) {
      console.error("Error loading settings:", error)
      return this.getDefaultSettings()
    }
  }

  private getDefaultSettings(): Settings {
    const schoolId = this.getCurrentSchoolId()
    return {
      id: "1",
      sendEmailNotifications: true,
      sendSmsNotifications: true,
      autoSendNotifications: true,
      smtpServer: "smtp.gmail.com",
      smtpPort: 587,
      emailUsername: "",
      emailPassword: "",
      schoolName: "Smart Attendance Tracker",
      academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      schoolAddress: "",
      schoolPhone: "",
      schoolId: schoolId || undefined,
      emailNotifications: true,
      dailyReports: false,
      notificationTime: "16:00",
      attendanceThreshold: 75,
      gradeSystem: "standard",
      allowLateMark: true,
    }
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    try {
      if (this.isClient()) {
        localStorage.setItem(this.getSettingsKey(), JSON.stringify(settings))
      }
      return settings
    } catch (error) {
      console.error("Error saving settings to localStorage:", error)
      throw error
    }
  }

  async resetSettings(): Promise<Settings> {
    const defaultSettings = this.getDefaultSettings()

    if (this.isClient()) {
      localStorage.setItem(this.getSettingsKey(), JSON.stringify(defaultSettings))
    }
    return defaultSettings
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined"
  }

  async clearAllData(): Promise<void> {
    if (this.isClient()) {
      localStorage.removeItem(this.getStudentsKey())
      localStorage.removeItem(this.getAttendanceKey())
      localStorage.removeItem(this.getSettingsKey())
    }
  }

  async initializeSampleData(): Promise<void> {}

  async clearSampleStudents(): Promise<void> {
    if (!this.isClient()) return

    const students = await this.getStudents()
    const sampleStudentIds = ["S001", "S002", "S003"]

    const filteredStudents = students.filter((student) => !sampleStudentIds.includes(student.student_id))

    localStorage.setItem(this.getStudentsKey(), JSON.stringify(filteredStudents))

    const attendance = await this.getAttendance()
    const sampleStudents = students.filter((s) => sampleStudentIds.includes(s.student_id))
    const sampleStudentDbIds = sampleStudents.map((s) => s.id)

    const filteredAttendance = attendance.filter((record) => !sampleStudentDbIds.includes(record.student_id))

    localStorage.setItem(this.getAttendanceKey(), JSON.stringify(filteredAttendance))
  }
}

export const db = new LocalDatabase()
