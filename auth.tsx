export interface User {
  id: string
  username: string
  email: string
  role: "admin" | "teacher"
  name: string
  schoolId: string
  schoolName: string
  created_at: string
}

export interface LoginCredentials {
  username: string
  password: string
  role: "admin" | "teacher"
}

export interface SignupCredentials {
  username: string
  email: string
  password: string
  confirmPassword: string
  role: "admin" | "teacher"
  name: string
  schoolId: string
  schoolName: string
}

interface PasswordResetToken {
  token: string
  email: string
  expires: string
  used: boolean
}

class AuthService {
  private readonly USERS_KEY = "attendance_users"
  private readonly CURRENT_USER_KEY = "attendance_current_user"
  private readonly RESET_TOKENS_KEY = "attendance_reset_tokens"
  private initialized = false

  constructor() {
    // this.initializeDefaultUsers()
  }

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined"
  }

  private ensureInitialized() {
    if (!this.initialized && this.isClient()) {
      this.initializeDefaultUsers()
      this.initialized = true
    }
  }

  private initializeDefaultUsers() {
    if (!this.isClient()) return

    const users = this.getUsers()
    if (users.length === 0) {
      const defaultUsers = [
        {
          id: "1",
          username: "admin",
          email: "admin@addisshiwot.edu.et",
          password: "admin123", // In production, this would be hashed
          role: "admin" as const,
          name: "Administrator",
          schoolId: "default-school",
          schoolName: "Smart Attendance Tracker",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          username: "teacher",
          email: "teacher@addisshiwot.edu.et",
          password: "teacher123", // In production, this would be hashed
          role: "teacher" as const,
          name: "Teacher User",
          schoolId: "default-school",
          schoolName: "Smart Attendance Tracker",
          created_at: new Date().toISOString(),
        },
      ]

      localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers))
    }
  }

  private getUsers() {
    if (!this.isClient()) return []

    try {
      const data = localStorage.getItem(this.USERS_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error loading users:", error)
      return []
    }
  }

  private getResetTokens(): PasswordResetToken[] {
    if (!this.isClient()) return []

    try {
      const data = localStorage.getItem(this.RESET_TOKENS_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("Error loading reset tokens:", error)
      return []
    }
  }

  private saveResetTokens(tokens: PasswordResetToken[]) {
    if (!this.isClient()) return

    try {
      localStorage.setItem(this.RESET_TOKENS_KEY, JSON.stringify(tokens))
    } catch (error) {
      console.error("Error saving reset tokens:", error)
    }
  }

  private generateResetToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; success: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const users = this.getUsers()
      const user = users.find(
        (u: any) =>
          (u.username === credentials.username || u.email === credentials.username) &&
          u.password === credentials.password &&
          u.role === credentials.role,
      )

      if (!user) {
        return {
          user: null as any,
          success: false,
          error: "Invalid credentials or role mismatch",
        }
      }

      const { password, ...userWithoutPassword } = user
      const authenticatedUser = userWithoutPassword as User

      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(authenticatedUser))

        const { db } = await import("./database")
        const students = await db.getStudents()
        if (students.length === 0) {
          const hasSettings = localStorage.getItem(`attendance_settings_${authenticatedUser.schoolId}`)
          if (!hasSettings) {
            console.log("[v0] Initializing data for school:", authenticatedUser.schoolId)
            db.initializeSchoolData(authenticatedUser.schoolId)
          }
        }
      }

      return {
        user: authenticatedUser,
        success: true,
      }
    } catch (error) {
      console.error("Login error:", error)
      return {
        user: null as any,
        success: false,
        error: "Login failed. Please try again.",
      }
    }
  }

  async logout(): Promise<void> {
    if (this.isClient()) {
      localStorage.removeItem(this.CURRENT_USER_KEY)
    }
  }

  getCurrentUser(): User | null {
    if (!this.isClient()) return null

    try {
      const data = localStorage.getItem(this.CURRENT_USER_KEY)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error("Error getting current user:", error)
      return null
    }
  }

  isAuthenticated(): boolean {
    this.ensureInitialized()
    return this.getCurrentUser() !== null
  }

  hasRole(role: "admin" | "teacher"): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  isAdmin(): boolean {
    return this.hasRole("admin")
  }

  isTeacher(): boolean {
    return this.hasRole("teacher")
  }

  async signup(credentials: SignupCredentials): Promise<{ user: User; success: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (credentials.password !== credentials.confirmPassword) {
        return {
          user: null as any,
          success: false,
          error: "Passwords do not match",
        }
      }

      if (credentials.password.length < 6) {
        return {
          user: null as any,
          success: false,
          error: "Password must be at least 6 characters long",
        }
      }

      if (credentials.role === "teacher") {
        if (!credentials.schoolId || credentials.schoolId.trim().length < 3) {
          return {
            user: null as any,
            success: false,
            error: "School ID must be at least 3 characters long",
          }
        }

        // Find the school by schoolId to get the school name
        const users = this.getUsers()
        const schoolAdmin = users.find((u: any) => u.schoolId === credentials.schoolId && u.role === "admin")

        if (!schoolAdmin) {
          return {
            user: null as any,
            success: false,
            error: "Invalid School ID. Please check with your school administrator.",
          }
        }

        // Set the school name from the admin's school
        credentials.schoolName = schoolAdmin.schoolName
      }

      if (credentials.role === "admin") {
        // Generate a temporary unique schoolId if not provided
        if (!credentials.schoolId) {
          credentials.schoolId = `temp-${Date.now()}`
        }
        if (!credentials.schoolName) {
          credentials.schoolName = "Setup Required"
        }
      }

      const reservedUsernames = ["admin", "teacher", "administrator", "root", "system"]
      if (reservedUsernames.includes(credentials.username.toLowerCase())) {
        return {
          user: null as any,
          success: false,
          error: `Username '${credentials.username}' is reserved. Please choose a different username like '${credentials.username}1' or '${credentials.name.toLowerCase().replace(/\s+/g, "")}'`,
        }
      }

      const users = this.getUsers()

      const existingUserByUsername = users.find(
        (u: any) => u.username.toLowerCase() === credentials.username.toLowerCase(),
      )
      const existingUserByEmail = users.find((u: any) => u.email.toLowerCase() === credentials.email.toLowerCase())

      if (existingUserByUsername) {
        return {
          user: null as any,
          success: false,
          error: `Username '${credentials.username}' is already taken. Try '${credentials.username}1' or '${credentials.name.toLowerCase().replace(/\s+/g, "")}'`,
        }
      }

      if (existingUserByEmail) {
        return {
          user: null as any,
          success: false,
          error: `An account with email '${credentials.email}' already exists. Please use a different email or try logging in.`,
        }
      }

      const newUser = {
        id: Date.now().toString(),
        username: credentials.username,
        email: credentials.email,
        password: credentials.password, // In production, this would be hashed
        role: credentials.role,
        name: credentials.name,
        schoolId: credentials.schoolId,
        schoolName: credentials.schoolName,
        created_at: new Date().toISOString(),
      }

      const updatedUsers = [...users, newUser]
      if (this.isClient()) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(updatedUsers))
      }

      const { password, ...userWithoutPassword } = newUser
      const authenticatedUser = userWithoutPassword as User

      if (this.isClient()) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(authenticatedUser))

        const { db } = await import("./database")
        db.initializeSchoolData(authenticatedUser.schoolId)
      }

      return {
        user: authenticatedUser,
        success: true,
      }
    } catch (error) {
      console.error("Signup error:", error)
      return {
        user: null as any,
        success: false,
        error: "Signup failed. Please try again.",
      }
    }
  }

  async updateSchoolInfo(schoolName: string, schoolId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        return { success: false, error: "No user logged in" }
      }

      if (currentUser.role !== "admin") {
        return { success: false, error: "Only admins can set up school information" }
      }

      if (!schoolName || schoolName.trim().length < 3) {
        return { success: false, error: "School name must be at least 3 characters long" }
      }

      if (!schoolId || schoolId.trim().length < 3) {
        return { success: false, error: "School ID must be at least 3 characters long" }
      }

      const users = this.getUsers()

      // Check if another admin already exists with this schoolId
      const existingAdmin = users.find(
        (u: any) => u.schoolId === schoolId && u.role === "admin" && u.id !== currentUser.id,
      )

      if (existingAdmin) {
        return {
          success: false,
          error: `Admin already exists for School ID '${schoolId}'. Each school can only have one admin.`,
        }
      }

      // Update the current user's school information
      const userIndex = users.findIndex((u: any) => u.id === currentUser.id)
      if (userIndex === -1) {
        return { success: false, error: "User not found" }
      }

      users[userIndex].schoolName = schoolName
      users[userIndex].schoolId = schoolId

      if (this.isClient()) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users))

        // Update current user in storage
        const updatedUser = { ...currentUser, schoolName, schoolId }
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(updatedUser))
      }

      return { success: true }
    } catch (error) {
      console.error("Update school info error:", error)
      return { success: false, error: "Failed to update school information" }
    }
  }

  hasAnyUsers(): boolean {
    this.ensureInitialized()
    const users = this.getUsers()
    return users.length > 2
  }

  getAllUsers(): User[] {
    this.ensureInitialized()
    const users = this.getUsers()
    return users.map((user: any) => {
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword as User
    })
  }

  getSuggestedUsernames(baseName: string): string[] {
    this.ensureInitialized()
    const users = this.getUsers()
    const existingUsernames = users.map((u: any) => u.username.toLowerCase())
    const suggestions: string[] = []

    const cleanBase = baseName.toLowerCase().replace(/\s+/g, "")

    for (let i = 1; i <= 5; i++) {
      const suggestion = `${cleanBase}${i}`
      if (!existingUsernames.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    }

    return suggestions.slice(0, 3)
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      const users = this.getUsers()
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())

      if (!user) {
        return { success: true }
      }

      const token = this.generateResetToken()
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      const resetToken: PasswordResetToken = {
        token,
        email: user.email,
        expires,
        used: false,
      }

      const tokens = this.getResetTokens()
      const updatedTokens = [...tokens, resetToken]
      this.saveResetTokens(updatedTokens)

      await this.sendPasswordResetEmail(user.email, user.name, token)

      return { success: true }
    } catch (error) {
      console.error("Password reset request error:", error)
      return { success: false, error: "Failed to process password reset request" }
    }
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      const tokens = this.getResetTokens()
      const resetToken = tokens.find((t) => t.token === token)

      if (!resetToken) {
        return { valid: false, error: "Invalid reset token" }
      }

      if (resetToken.used) {
        return { valid: false, error: "Reset token has already been used" }
      }

      if (new Date() > new Date(resetToken.expires)) {
        return { valid: false, error: "Reset token has expired" }
      }

      return { valid: true }
    } catch (error) {
      console.error("Token verification error:", error)
      return { valid: false, error: "Failed to verify token" }
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized()

      const tokenVerification = await this.verifyResetToken(token)
      if (!tokenVerification.valid) {
        return { success: false, error: tokenVerification.error }
      }

      const tokens = this.getResetTokens()
      const resetToken = tokens.find((t) => t.token === token)

      if (!resetToken) {
        return { success: false, error: "Invalid reset token" }
      }

      const users = this.getUsers()
      const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === resetToken.email.toLowerCase())

      if (userIndex === -1) {
        return { success: false, error: "User not found" }
      }

      users[userIndex].password = newPassword

      if (this.isClient()) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
      }

      resetToken.used = true
      this.saveResetTokens(tokens)

      return { success: true }
    } catch (error) {
      console.error("Password reset error:", error)
      return { success: false, error: "Failed to reset password" }
    }
  }

  private async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    try {
      const resetUrl = `${window.location.origin}?reset-token=${token}`

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "Password Reset - Smart Attendance Tracker",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Password Reset Request</h2>
              <p>Hello ${name},</p>
              <p>You requested to reset your password for your Smart Attendance Tracker account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">This email was sent from the Smart Attendance Tracker system.</p>
            </div>
          `,
          text: `Password Reset Request\n\nHello ${name},\n\nYou requested to reset your password for your Smart Attendance Tracker account.\n\nClick this link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour for security reasons.\n\nIf you didn't request this password reset, please ignore this email.`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send reset email")
      }
    } catch (error) {
      console.error("Error sending password reset email:", error)
    }
  }
}

export const authService = new AuthService()
