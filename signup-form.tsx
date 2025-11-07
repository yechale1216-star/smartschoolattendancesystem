"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authService, type SignupCredentials } from "@/lib/auth"
import { notifications } from "@/lib/notifications"

interface SignupFormProps {
  onSignupSuccess: () => void
  onBackToLogin: () => void
}

export function SignupForm({ onSignupSuccess, onBackToLogin }: SignupFormProps) {
  const [credentials, setCredentials] = useState<SignupCredentials>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "teacher",
    name: "",
    schoolId: "",
    schoolName: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleNameChange = (name: string) => {
    setCredentials((prev) => ({ ...prev, name }))
    if (name.length > 2) {
      const suggestions = authService.getSuggestedUsernames(name)
      setUsernameSuggestions(suggestions)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setCredentials((prev) => ({ ...prev, username: suggestion }))
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !credentials.username ||
      !credentials.email ||
      !credentials.password ||
      !credentials.confirmPassword ||
      !credentials.name ||
      !credentials.schoolId ||
      !credentials.schoolName
    ) {
      notifications.error("Validation Error", "Please fill in all fields")
      return
    }

    if (credentials.username.length < 3) {
      notifications.error("Validation Error", "Username must be at least 3 characters long")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(credentials.username)) {
      notifications.error("Validation Error", "Username can only contain letters, numbers, and underscores")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      notifications.error("Validation Error", "Please enter a valid email address")
      return
    }

    if (credentials.password !== credentials.confirmPassword) {
      notifications.error("Validation Error", "Passwords do not match")
      return
    }

    if (credentials.password.length < 6) {
      notifications.error("Validation Error", "Password must be at least 6 characters long")
      return
    }

    if (credentials.schoolName.trim().length < 3) {
      notifications.error("Validation Error", "School name must be at least 3 characters long")
      return
    }

    if (credentials.schoolId.trim().length < 3) {
      notifications.error("Validation Error", "School ID must be at least 3 characters long")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.signup(credentials)

      if (result.success) {
        notifications.success("Account Created", `Welcome to ${credentials.schoolName}, ${result.user.name}!`)
        onSignupSuccess()
      } else {
        notifications.error("Signup Failed", result.error || "Failed to create account")
        if (result.error?.includes("already taken") || result.error?.includes("reserved")) {
          setShowSuggestions(true)
        }
      }
    } catch (error) {
      notifications.error("Signup Error", "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-background flex items-center justify-center min-h-screen p-0 md:p-4">
      <Card className="auth-card w-full h-full md:h-auto md:max-w-md md:rounded-lg rounded-none border-0 md:border overflow-y-auto">
        <CardHeader className="text-center space-y-2 pt-8 md:pt-6">
          <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription className="text-muted-foreground">Join Your School Attendance System</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={credentials.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolName" className="text-foreground">
                School Name
              </Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="Enter your school name"
                value={credentials.schoolName}
                onChange={(e) => setCredentials((prev) => ({ ...prev, schoolName: e.target.value }))}
                required
                minLength={3}
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolId" className="text-foreground">
                School ID
              </Label>
              <Input
                id="schoolId"
                type="text"
                placeholder="Enter your school ID"
                value={credentials.schoolId}
                onChange={(e) => setCredentials((prev) => ({ ...prev, schoolId: e.target.value }))}
                required
                minLength={3}
                className="bg-background border-border text-foreground h-12"
              />
              <p className="text-xs text-muted-foreground">All users with the same School ID will share data</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                onFocus={() => setShowSuggestions(usernameSuggestions.length > 0)}
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
                className="bg-background border-border text-foreground h-12"
              />
              {showSuggestions && usernameSuggestions.length > 0 && (
                <div className="bg-muted border border-border rounded-md p-2 text-sm">
                  <p className="text-muted-foreground mb-1">Suggested usernames:</p>
                  <div className="flex flex-wrap gap-1">
                    {usernameSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={credentials.email}
                onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">
                Account Type
              </Label>
              <Select
                value={credentials.role}
                onValueChange={(value: "admin" | "teacher") => setCredentials((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="bg-background border-border text-foreground h-12">
                  <SelectValue placeholder="Select Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator (One per school)</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
              {credentials.role === "admin" && (
                <p className="text-xs text-yellow-600">
                  Note: Only one admin is allowed per school. If an admin already exists, you will need to sign up as a
                  teacher.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={credentials.confirmPassword}
                onChange={(e) => setCredentials((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                className="bg-background border-border text-foreground h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={onBackToLogin} className="text-sm text-primary hover:text-primary/80">
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
