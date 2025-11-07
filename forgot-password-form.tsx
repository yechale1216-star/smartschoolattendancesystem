"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authService } from "@/lib/auth"
import { notifications } from "@/lib/notifications"
import { ArrowLeft, Mail } from "lucide-react"

interface ForgotPasswordFormProps {
  onBackToLogin: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      notifications.error("Validation Error", "Please enter your email address")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifications.error("Validation Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const result = await authService.requestPasswordReset(email)

      if (result.success) {
        setEmailSent(true)
        notifications.success(
          "Reset Email Sent",
          "If an account with this email exists, you'll receive password reset instructions shortly.",
        )
      } else {
        // For security, we don't reveal if the email exists or not
        setEmailSent(true)
        notifications.success(
          "Reset Email Sent",
          "If an account with this email exists, you'll receive password reset instructions shortly.",
        )
      }
    } catch (error) {
      notifications.error("Error", "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-700 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">Check Your Email</CardTitle>
            <CardDescription>We've sent password reset instructions to your email address</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              If an account with <strong>{email}</strong> exists, you'll receive an email with instructions to reset
              your password.
            </p>
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or try again in a few minutes.
            </p>
            <Button variant="outline" onClick={onBackToLogin} className="w-full mt-4 bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-600">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you instructions to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button variant="link" onClick={onBackToLogin} className="text-sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
