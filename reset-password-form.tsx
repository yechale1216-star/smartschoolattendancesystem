"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/auth"
import { notifications } from "@/lib/notifications"
import { Eye, EyeOff, CheckCircle } from "lucide-react"

interface ResetPasswordFormProps {
  token: string
  onResetSuccess: () => void
}

export function ResetPasswordForm({ token, onResetSuccess }: ResetPasswordFormProps) {
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Verify token validity on component mount
    const verifyToken = async () => {
      try {
        const result = await authService.verifyResetToken(token)
        setTokenValid(result.valid)
        if (!result.valid) {
          notifications.error("Invalid Token", "This password reset link is invalid or has expired.")
        }
      } catch (error) {
        setTokenValid(false)
        notifications.error("Error", "Unable to verify reset token.")
      }
    }

    if (token) {
      verifyToken()
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwords.password || !passwords.confirmPassword) {
      notifications.error("Validation Error", "Please fill in all fields")
      return
    }

    if (passwords.password !== passwords.confirmPassword) {
      notifications.error("Validation Error", "Passwords do not match")
      return
    }

    if (passwords.password.length < 6) {
      notifications.error("Validation Error", "Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.resetPassword(token, passwords.password)

      if (result.success) {
        notifications.success("Password Reset", "Your password has been successfully reset!")
        onResetSuccess()
      } else {
        notifications.error("Reset Failed", result.error || "Failed to reset password")
      }
    } catch (error) {
      notifications.error("Error", "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying reset token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-purple-700 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-red-600">Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">Password reset links expire after 1 hour for security reasons.</p>
            <Button onClick={() => (window.location.href = "/")} className="w-full">
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min 6 characters)"
                  value={passwords.password}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {passwords.password && passwords.confirmPassword && (
              <div className="flex items-center text-sm">
                {passwords.password === passwords.confirmPassword ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Passwords match
                  </div>
                ) : (
                  <div className="text-red-600">Passwords do not match</div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || passwords.password !== passwords.confirmPassword}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
