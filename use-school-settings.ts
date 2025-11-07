"use client"

import { useState, useEffect } from "react"
import { db, type Settings } from "@/lib/database"

export function useSchoolSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const schoolSettings = await db.getSettings()
        setSettings(schoolSettings)
      } catch (error) {
        console.error("Error loading school settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateSchoolName = async (schoolName: string) => {
    if (!settings) return

    try {
      const updatedSettings = await db.updateSettings({
        ...settings,
        schoolName,
      })
      setSettings(updatedSettings)
    } catch (error) {
      console.error("Error updating school name:", error)
    }
  }

  return {
    schoolName: settings?.schoolName || "Smart Attendance Tracker",
    settings,
    isLoading,
    updateSchoolName,
  }
}
