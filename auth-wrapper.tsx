"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "./login-form"
import { RegistrationSelection } from "./registration-selection"
import { AdminSignupForm } from "./admin-signup-form"
import { TeacherSignupForm } from "./teacher-signup-form"
import { ForgotPasswordForm } from "./forgot-password-form"
import { ResetPasswordForm } from "./reset-password-form"

interface AuthWrapperProps {
  onAuthSuccess: () => void
}

export function AuthWrapper({ onAuthSuccess }: AuthWrapperProps) {
  const [currentView, setCurrentView] = useState<
    "login" | "registration-selection" | "admin-signup" | "teacher-signup" | "forgot-password" | "reset-password"
  >("login")
  const [resetToken, setResetToken] = useState<string | null>(null)

  useEffect(() => {
    // Check if there's a reset token in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("reset-token")
    if (token) {
      setResetToken(token)
      setCurrentView("reset-password")
    }
  }, [])

  const handleResetSuccess = () => {
    // Clear the token from URL and redirect to login
    window.history.replaceState({}, document.title, window.location.pathname)
    setResetToken(null)
    setCurrentView("login")
  }

  if (currentView === "registration-selection") {
    return (
      <RegistrationSelection
        onSelectAdmin={() => setCurrentView("admin-signup")}
        onSelectTeacher={() => setCurrentView("teacher-signup")}
        onBackToLogin={() => setCurrentView("login")}
      />
    )
  }

  if (currentView === "admin-signup") {
    return <AdminSignupForm onSignupSuccess={onAuthSuccess} onBack={() => setCurrentView("registration-selection")} />
  }

  if (currentView === "teacher-signup") {
    return <TeacherSignupForm onSignupSuccess={onAuthSuccess} onBack={() => setCurrentView("registration-selection")} />
  }

  if (currentView === "forgot-password") {
    return <ForgotPasswordForm onBackToLogin={() => setCurrentView("login")} />
  }

  if (currentView === "reset-password" && resetToken) {
    return <ResetPasswordForm token={resetToken} onResetSuccess={handleResetSuccess} />
  }

  return (
    <LoginForm
      onLoginSuccess={onAuthSuccess}
      onShowSignup={() => setCurrentView("registration-selection")}
      onShowForgotPassword={() => setCurrentView("forgot-password")}
    />
  )
}
