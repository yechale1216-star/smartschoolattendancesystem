"use client"

import { useState, useEffect } from "react"
import { AuthWrapper } from "@/components/auth-wrapper"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { Dashboard } from "@/components/dashboard"
import { StudentManagement } from "@/components/student-management"
import { AttendanceTracking } from "@/components/attendance-tracking"
import { Reports } from "@/components/reports"
import { Settings } from "@/components/settings"
import { PWAInstall } from "@/components/pwa-install"
import { OfflineIndicator } from "@/components/offline-indicator"
import { SyncManager } from "@/components/sync-manager"
import { authService } from "@/lib/auth"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication status
    const initializeApp = async () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    initializeApp()
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setActiveTab("dashboard")
  }

  const handleNavigate = (tab: string) => {
    setActiveTab(tab)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthWrapper onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator />
      <SyncManager />
      <Header onLogout={handleLogout} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
          {activeTab === "students" && <StudentManagement />}
          {activeTab === "attendance" && <AttendanceTracking />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "settings" && authService.isAdmin() && <Settings />}
        </div>
      </main>

      <PWAInstall />
    </div>
  )
}
