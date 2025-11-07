"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { EmailStatus } from "@/components/email-status"
import { db } from "@/lib/database"
import { authService } from "@/lib/auth"
import { notifications } from "@/lib/notifications"
import { useToast } from "@/hooks/use-toast"

export function Settings() {
  const [settings, setSettings] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState({ schoolName: "", schoolId: "" })
  const [isEditingSchoolInfo, setIsEditingSchoolInfo] = useState(false)
  const { toast } = useToast()
  const user = authService.getCurrentUser()

  useEffect(() => {
    loadSettings()
    if (user) {
      setSchoolInfo({ schoolName: user.schoolName, schoolId: user.schoolId })
      if (user.role === "admin" && user.schoolName === "Setup Required") {
        setIsEditingSchoolInfo(true)
      }
    }
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const currentSettings = await db.getSettings()
      setSettings(currentSettings)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    console.log("[v0] Starting to save settings:", settings)
    setIsSaving(true)
    try {
      // Save school info if admin and editing
      if (user?.role === "admin" && isEditingSchoolInfo) {
        console.log("[v0] Saving school info:", schoolInfo)
        const result = await authService.updateSchoolInfo(schoolInfo.schoolName, schoolInfo.schoolId)

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to update school information",
            variant: "destructive",
          })
          setIsSaving(false)
          return
        }
      }

      // Update settings with school info
      const updatedSettings = {
        ...settings,
        schoolName: schoolInfo.schoolName,
        schoolId: schoolInfo.schoolId,
      }

      console.log("[v0] Calling db.updateSettings with:", updatedSettings)
      await db.updateSettings(updatedSettings)
      console.log("[v0] Settings saved successfully to database")

      setSettings(updatedSettings)
      setIsEditingSchoolInfo(false)

      toast({
        title: "Settings Saved",
        description: "All settings have been updated successfully.",
        variant: "default",
      })
      notifications.success("Settings Saved", "Settings updated successfully")
      console.log("[v0] Save settings completed successfully")

      // Reload if school info was changed
      if (user?.role === "admin" && isEditingSchoolInfo) {
        window.location.reload()
      }
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setIsLoading(true)
      try {
        await db.resetSettings()
        await loadSettings()
        toast({
          title: "Settings Reset",
          description: "All settings have been reset to default values.",
          variant: "default",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reset settings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const clearAllData = async () => {
    const confirmation = prompt(
      "This will permanently delete ALL data including students and attendance records. Type 'DELETE ALL DATA' to confirm:",
    )

    if (confirmation === "DELETE ALL DATA") {
      setIsLoading(true)
      try {
        await db.clearAllData()
        toast({
          title: "Data Cleared",
          description: "All data has been permanently deleted.",
          variant: "default",
        })
        notifications.success("Data Cleared", "All data cleared successfully")
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to clear data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const exportData = async () => {
    try {
      const students = await db.getStudents()
      const attendance = await db.getAllAttendance()
      const currentSettings = await db.getSettings()

      const exportData = {
        students,
        attendance,
        settings: currentSettings,
        exportDate: new Date().toISOString(),
        exportedBy: user?.username,
        version: "1.0",
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance-system-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Complete",
        description: "System data has been exported successfully.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      })
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)

        if (confirm("This will replace all existing data. Are you sure you want to continue?")) {
          setIsLoading(true)

          await db.clearAllData()

          if (importData.students) {
            for (const student of importData.students) {
              await db.addStudent(student)
            }
          }

          if (importData.attendance) {
            for (const record of importData.attendance) {
              await db.saveAttendance(record)
            }
          }

          if (importData.settings) {
            await db.updateSettings(importData.settings)
            setSettings(importData.settings)
          }

          toast({
            title: "Import Complete",
            description: "Data has been imported successfully.",
            variant: "default",
          })
          notifications.success("Import Complete", "Data imported successfully")
        }
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage system configuration and preferences</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <span className="text-lg">👑</span>
          Admin Panel
        </Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Basic information about your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={schoolInfo.schoolName}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })}
                    disabled={user?.role !== "admin" || !isEditingSchoolInfo}
                    className={user?.role !== "admin" || !isEditingSchoolInfo ? "bg-gray-50 cursor-not-allowed" : ""}
                    placeholder="Enter school name"
                  />
                  {user?.role === "admin" && !isEditingSchoolInfo && (
                    <p className="text-xs text-gray-500 mt-1">Set during registration</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="schoolId">School ID</Label>
                  <Input
                    id="schoolId"
                    value={schoolInfo.schoolId}
                    onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolId: e.target.value })}
                    disabled={user?.role !== "admin" || !isEditingSchoolInfo}
                    className={user?.role !== "admin" || !isEditingSchoolInfo ? "bg-gray-50 cursor-not-allowed" : ""}
                    placeholder="Enter school ID"
                  />
                  {user?.role === "admin" && !isEditingSchoolInfo && (
                    <p className="text-xs text-gray-500 mt-1">Teachers will use this ID to join</p>
                  )}
                </div>
              </div>

              {user?.role === "admin" && !isEditingSchoolInfo && (
                <Button onClick={() => setIsEditingSchoolInfo(true)} variant="outline" size="sm">
                  Edit School Information
                </Button>
              )}
              {user?.role === "admin" && isEditingSchoolInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Click "Save Settings" at the bottom to save all changes including school information.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Input
                    id="academicYear"
                    value={settings.academicYear || ""}
                    onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                    placeholder="2024-2025"
                  />
                </div>
                <div>
                  <Label htmlFor="schoolPhone">School Phone Number</Label>
                  <Input
                    id="schoolPhone"
                    value={settings.schoolPhone || ""}
                    onChange={(e) => setSettings({ ...settings, schoolPhone: e.target.value })}
                    placeholder="Enter school phone number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="schoolAddress">School Address</Label>
                <Textarea
                  id="schoolAddress"
                  value={settings.schoolAddress || ""}
                  onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                  placeholder="Enter complete school address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <EmailStatus />

          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure when and how notifications are sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600">Send attendance notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-600">Send attendance notifications via SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-gray-600">Automatically generate daily attendance reports</p>
                </div>
                <Switch
                  checked={settings.dailyReports || false}
                  onCheckedChange={(checked) => setSettings({ ...settings, dailyReports: checked })}
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="notificationTime">Daily Report Time</Label>
                <Input
                  id="notificationTime"
                  type="time"
                  value={settings.notificationTime || "16:00"}
                  onChange={(e) => setSettings({ ...settings, notificationTime: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Configuration</CardTitle>
              <CardDescription>Configure attendance tracking preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="attendanceThreshold">Attendance Threshold (%)</Label>
                <Input
                  id="attendanceThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.attendanceThreshold || 75}
                  onChange={(e) => setSettings({ ...settings, attendanceThreshold: Number.parseInt(e.target.value) })}
                />
                <p className="text-sm text-gray-600 mt-1">Minimum attendance percentage for alerts</p>
              </div>
              <div>
                <Label htmlFor="gradeSystem">Grade System</Label>
                <Select
                  value={settings.gradeSystem || "standard"}
                  onValueChange={(value) => setSettings({ ...settings, gradeSystem: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (K-12)</SelectItem>
                    <SelectItem value="college">College/University</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Late Mark</Label>
                  <p className="text-sm text-gray-600">Allow marking students as late</p>
                </div>
                <Switch
                  checked={settings.allowLateMark || true}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowLateMark: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Import and manage system data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    style={{ display: "none" }}
                    id="import-file"
                  />
                  <Button
                    onClick={() => document.getElementById("import-file")?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    📥 Import Data
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Button onClick={resetToDefaults} variant="outline" className="w-full bg-transparent">
                  🔄 Reset to Defaults
                </Button>
                <Button onClick={clearAllData} variant="destructive" className="w-full">
                  🗑️ Clear All Data
                </Button>
                <p className="text-xs text-gray-500 text-center">Warning: These actions cannot be undone</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Current system status and information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Current User</Label>
                  <p className="font-mono">
                    {user?.username} ({user?.role})
                  </p>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <p className="font-mono">{new Date().toLocaleString()}</p>
                </div>
                <div>
                  <Label>Storage Type</Label>
                  <p className="font-mono">LocalStorage</p>
                </div>
                <div>
                  <Label>Version</Label>
                  <p className="font-mono">1.0.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button onClick={loadSettings} variant="outline" disabled={isLoading}>
          {isLoading ? "Loading..." : "Reset Changes"}
        </Button>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
