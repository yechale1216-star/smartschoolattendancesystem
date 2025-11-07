"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authService, type LoginCredentials } from "@/lib/auth"
import { notifications } from "@/lib/notifications"

interface LoginFormProps {
  onLoginSuccess: () => void
  onShowSignup: () => void
  onShowForgotPassword: () => void
}

export function LoginForm({ onLoginSuccess, onShowSignup, onShowForgotPassword }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
    role: "admin",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!credentials.username || !credentials.password || !credentials.role) {
      notifications.error("Validation Error", "Please fill in all fields")
      return
    }

    if (credentials.username.length < 3) {
      notifications.error("Validation Error", "Username must be at least 3 characters long")
      return
    }

    if (credentials.password.length < 6) {
      notifications.error("Validation Error", "Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.login(credentials)

      if (result.success) {
        notifications.success("Login Successful", `Welcome back, ${result.user.name}!`)
        onLoginSuccess()
      } else {
        let errorMessage = result.error || "Invalid credentials"
        if (errorMessage.includes("Invalid credentials")) {
          errorMessage = "Invalid username, password, or role. Please check your credentials and try again."
        }
        notifications.error("Login Failed", errorMessage)
      }
    } catch (error) {
      notifications.error("Login Error", "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-background flex items-center justify-center min-h-screen p-0 md:p-4">
      <Card className="auth-card w-full h-full md:h-auto md:max-w-md md:rounded-lg rounded-none border-0 md:border">
        <CardHeader className="text-center space-y-2 pt-8 md:pt-6">
          <CardTitle className="text-2xl font-bold text-primary">Smart Attendance Tracker</CardTitle>
          <CardDescription className="text-muted-foreground">Welcome to our School Attendance System</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Username or Email
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                required
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                required
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">
                Login As
              </Label>
              <Select
                value={credentials.role}
                onValueChange={(value: "admin" | "teacher") => setCredentials((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="bg-background border-border text-foreground h-12">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={onShowForgotPassword}
              className="text-sm text-primary hover:text-primary/80"
            >
              Forgot your password?
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={onShowSignup}
              className="w-full h-12 mt-2 border-primary/20 text-primary hover:bg-primary/10 bg-transparent"
            >
              Create New Account
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              New to Smart Attendance Tracker? Create your account above
              <br />
              <span className="text-xs text-primary">Note: Usernames 'admin' and 'teacher' are reserved</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
