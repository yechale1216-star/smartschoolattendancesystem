"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users } from "lucide-react"

interface RegistrationSelectionProps {
  onSelectAdmin: () => void
  onSelectTeacher: () => void
  onBackToLogin: () => void
}

export function RegistrationSelection({ onSelectAdmin, onSelectTeacher, onBackToLogin }: RegistrationSelectionProps) {
  return (
    <div className="auth-background flex items-center justify-center min-h-screen p-4">
      <Card className="auth-card w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-primary">Choose Account Type</CardTitle>
          <CardDescription className="text-muted-foreground">
            Select the type of account you want to create
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 p-6">
          <Card className="cursor-pointer hover:border-primary transition-colors border-2" onClick={onSelectAdmin}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Administrator</CardTitle>
              <CardDescription className="text-sm">
                Manage school settings, users, and have full access to all features
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs text-yellow-600 mb-4">Only one admin allowed per school</p>
              <Button className="w-full" onClick={onSelectAdmin}>
                Register as Admin
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors border-2" onClick={onSelectTeacher}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Teacher</CardTitle>
              <CardDescription className="text-sm">
                Manage students, take attendance, and access school data
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs text-muted-foreground mb-4">Multiple teachers can join the same school</p>
              <Button className="w-full" onClick={onSelectTeacher}>
                Register as Teacher
              </Button>
            </CardContent>
          </Card>
        </CardContent>
        <div className="text-center pb-6">
          <Button variant="link" onClick={onBackToLogin} className="text-sm text-primary hover:text-primary/80">
            Already have an account? Sign in
          </Button>
        </div>
      </Card>
    </div>
  )
}
