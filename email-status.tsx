"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, AlertCircle, Mail, ExternalLink } from "lucide-react"
import { db } from "@/lib/database"

export function EmailStatus() {
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean
    demo: boolean
    message: string
  }>({ configured: false, demo: true, message: "Checking email configuration..." })
  const [testEmail, setTestEmail] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState("Smart Attendance Tracker")

  useEffect(() => {
    checkEmailStatus()
    loadSchoolName()
  }, [])

  const loadSchoolName = async () => {
    try {
      const settings = await db.getSettings()
      setSchoolName(settings.schoolName || "Smart Attendance Tracker")
    } catch (error) {
      console.error("Error loading school name:", error)
    }
  }

  const checkEmailStatus = async () => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "test@example.com",
          subject: "Configuration Test",
          text: "This is a configuration test",
        }),
      })

      const result = await response.json()
      setEmailStatus({
        configured: !result.demo,
        demo: result.demo,
        message: result.demo ? "Add RESEND_API_KEY for real email delivery" : "Real email delivery configured",
      })
    } catch (error) {
      setEmailStatus({
        configured: false,
        demo: true,
        message: "Error checking email configuration",
      })
    }
  }

  const testEmailDelivery = async () => {
    if (!testEmail) return

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          subject: "Test Email from Attendance System",
          html: `
            <h2>Email Configuration Test</h2>
            <p>This is a test email from your attendance tracking system.</p>
            <p>If you received this email, your email notifications are working correctly!</p>
            <p><strong>School:</strong> ${schoolName}</p>
            <p><strong>System:</strong> Smart Attendance Tracker</p>
          `,
          text: "This is a test email from your attendance tracking system. If you received this email, your email notifications are working correctly!",
        }),
      })

      const result = await response.json()
      if (result.success) {
        setTestResult(
          result.demo
            ? `Test email processed. ${result.fallback_reason || "Configure RESEND_API_KEY for real delivery."}`
            : "Test email sent successfully! Check your inbox.",
        )
      } else {
        setTestResult(`Failed to send test email: ${result.error}`)
      }
    } catch (error) {
      setTestResult("Error sending test email")
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration Status
        </CardTitle>
        <CardDescription>Configure real email delivery for attendance notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {emailStatus.configured ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">
            {emailStatus.configured ? "Real Email Delivery" : "Configuration Required"}
          </span>
          <Badge variant={emailStatus.configured ? "default" : "secondary"}>
            {emailStatus.configured ? "Active" : "Setup Needed"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{emailStatus.message}</p>

        {!emailStatus.configured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Setup Required</h4>
                <p className="text-sm text-yellow-700">
                  To enable real email delivery, add your Resend API key as an environment variable:
                </p>
                <div className="bg-yellow-100 rounded p-2 font-mono text-sm">
                  RESEND_API_KEY=re_your_actual_api_key_here
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Get your API key from:</span>
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Resend Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Delivery</Label>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              placeholder="Enter email to test delivery"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={testEmailDelivery} disabled={testing || !testEmail}>
              {testing ? "Sending..." : "Test"}
            </Button>
          </div>
          {testResult && (
            <p className={`text-sm ${testResult.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
              {testResult}
            </p>
          )}
        </div>

        <Button variant="outline" onClick={checkEmailStatus} className="w-full bg-transparent">
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  )
}
