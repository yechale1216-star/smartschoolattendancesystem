import type { Student } from "./database"
import { toast } from "@/hooks/use-toast"
import { db } from "./database"
import { syncQueue } from "./sync-queue"

export interface NotificationOptions {
  title: string
  message: string
  type: "success" | "error" | "warning" | "info"
  duration?: number
}

class NotificationService {
  show(options: NotificationOptions) {
    const variant =
      options.type === "error"
        ? "destructive"
        : options.type === "success"
          ? "success"
          : options.type === "warning"
            ? "warning"
            : "default"

    toast({
      title: options.title,
      description: options.message,
      variant: variant as any,
      duration: options.duration || (options.type === "success" ? 2500 : options.type === "error" ? 5000 : 4000),
    })
  }

  success(title: string, message: string, duration?: number) {
    this.show({ title, message, type: "success", duration: duration || 2500 })
  }

  error(title: string, message: string, duration?: number) {
    this.show({ title, message, type: "error", duration: duration || 5000 })
  }

  warning(title: string, message: string, duration?: number) {
    this.show({ title, message, type: "warning", duration: duration || 4000 })
  }

  info(title: string, message: string, duration?: number) {
    this.show({ title, message, type: "info", duration: duration || 4000 })
  }
}

export const notifications = new NotificationService()

// Email notification service
export class EmailNotificationService {
  private onSetupRequired?: () => void

  setSetupRequiredCallback(callback: () => void) {
    this.onSetupRequired = callback
  }

  private async getSchoolInfo(): Promise<{ name: string; phone: string; email: string }> {
    try {
      const settings = await db.getSettings()
      console.log("[v0] School info retrieved:", {
        name: settings.schoolName,
        phone: settings.schoolPhone,
        email: settings.emailUsername,
        fullSettings: settings,
      })
      return {
        name: settings.schoolName || "Smart Attendance Tracker",
        phone: settings.schoolPhone || "",
        email: settings.emailUsername || "yechale1216@gmail.com",
      }
    } catch (error) {
      console.error("Error getting school info:", error)
      return {
        name: "Smart Attendance Tracker",
        phone: "",
        email: "yechale1216@gmail.com",
      }
    }
  }

  async sendAttendanceNotification(
    student: Student,
    status: "absent" | "late" | "excused",
    note?: string,
  ): Promise<boolean> {
    try {
      if (!student.parent_email || !student.parent_email.includes("@")) {
        console.error("Invalid parent email for student:", student.name, student.parent_email)
        notifications.error(
          "Invalid Email",
          `Cannot send notification to ${student.parent_name}: Invalid email address (${student.parent_email})`,
        )
        return false
      }

      const schoolInfo = await this.getSchoolInfo()

      const subjects = {
        absent: `${schoolInfo.name} - Student Absence Notification: ${student.name}`,
        late: `${schoolInfo.name} - Student Late Arrival: ${student.name}`,
        excused: `${schoolInfo.name} - Excused Absence Confirmation: ${student.name}`,
      }

      const bodies = {
        absent: `Dear ${student.parent_name},

This is to inform you that your child, ${student.name}, in ${student.grade}, was marked absent today.

${note ? `Reason: ${note}\n\n` : ""}If this absence was unplanned, kindly contact the school administration for clarification.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for your cooperation.

Sincerely,
${schoolInfo.name}`,
        late: `Dear ${student.parent_name},

Your child, ${student.name}, in ${student.grade}, arrived late to school today.

Please ensure your child arrives on time to support their learning and attendance record.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for your attention.

Sincerely,
${schoolInfo.name}`,
        excused: `Dear ${student.parent_name},

This is to confirm that your child, ${student.name}, in ${student.grade}, has been marked as excused absent today due to the reason provided.

${note ? `Reason: ${note}\n\n` : ""}If this information is incorrect, kindly contact the school office immediately.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for keeping us informed.

Sincerely,
${schoolInfo.name}`,
      }

      if (!navigator.onLine) {
        // Queue the email for later
        if (syncQueue) {
          syncQueue.add("email", {
            to: student.parent_email,
            subject: subjects[status],
            text: bodies[status],
            html: bodies[status].replace(/\n/g, "<br>"),
            studentName: student.name,
            parentName: student.parent_name,
          })
          notifications.info("Email Queued", `Email for ${student.parent_name} will be sent when you're back online`)
        }
        return false
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: student.parent_email,
          subject: subjects[status],
          text: bodies[status],
          html: bodies[status].replace(/\n/g, "<br>"),
        }),
      })

      let result
      try {
        const responseText = await response.text()

        if (responseText.startsWith("{") || responseText.startsWith("[")) {
          result = JSON.parse(responseText)
        } else {
          console.error("Email API returned HTML instead of JSON:", responseText.substring(0, 100))
          throw new Error(`Email API returned HTML error page (status: ${response.status})`)
        }
      } catch (parseError) {
        console.error("Failed to parse email API response:", parseError)
        throw new Error(
          `Email API response parsing failed: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        )
      }

      if (!response.ok || !result.success) {
        if (result.error === "SETUP_REQUIRED") {
          notifications.warning(
            "Email Setup Required",
            "Real email notifications require Resend API key configuration. Click to view setup guide.",
            8000,
          )
          if (this.onSetupRequired) {
            this.onSetupRequired()
          }
          return false
        } else if (result.error === "RESEND_ERROR" && result.instructions) {
          notifications.error(
            "Email Configuration Error",
            `${result.message}. ${result.instructions.solution || "Please check your Resend configuration."}`,
            8000,
          )
          return false
        } else {
          throw new Error(result.message || result.error || "Failed to send email")
        }
      }

      if (result.success) {
        const message = result.testing
          ? `Testing mode: Email for ${student.parent_name} redirected to ${result.actualRecipient} (originally ${result.originalRecipient})`
          : `Real notification sent to ${student.parent_name} at ${student.parent_email} for ${student.name}'s ${status} status`

        notifications.success(result.testing ? "Email Sent (Testing)" : "Email Sent", message, 2000)
        return true
      } else {
        throw new Error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email to", student.parent_email, ":", error)

      if (!navigator.onLine && syncQueue) {
        const schoolInfo = await this.getSchoolInfo()
        const subjects = {
          absent: `${schoolInfo.name} - Student Absence Notification: ${student.name}`,
          late: `${schoolInfo.name} - Student Late Arrival: ${student.name}`,
          excused: `${schoolInfo.name} - Excused Absence Confirmation: ${student.name}`,
        }
        const bodies = {
          absent: `Dear ${student.parent_name},

This is to inform you that your child, ${student.name}, in ${student.grade}, was marked absent today.

${note ? `Reason: ${note}\n\n` : ""}If this absence was unplanned, kindly contact the school administration for clarification.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for your cooperation.

Sincerely,
${schoolInfo.name}`,
          late: `Dear ${student.parent_name},

Your child, ${student.name}, in ${student.grade}, arrived late to school today.

Please ensure your child arrives on time to support their learning and attendance record.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for your attention.

Sincerely,
${schoolInfo.name}`,
          excused: `Dear ${student.parent_name},

This is to confirm that your child, ${student.name}, in ${student.grade}, has been marked as excused absent today due to the reason provided.

${note ? `Reason: ${note}\n\n` : ""}If this information is incorrect, kindly contact the school office immediately.

${schoolInfo.phone ? `School Phone: ${schoolInfo.phone}\n` : ""}Thank you for keeping us informed.

Sincerely,
${schoolInfo.name}`,
        }

        syncQueue.add("email", {
          to: student.parent_email,
          subject: subjects[status],
          text: bodies[status],
          html: bodies[status].replace(/\n/g, "<br>"),
          studentName: student.name,
          parentName: student.parent_name,
        })
        notifications.info("Email Queued", `Email for ${student.parent_name} will be sent when you're back online`)
        return false
      }

      notifications.error(
        "Email Failed",
        `Failed to send notification to ${student.parent_name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      return false
    }
  }

  async sendBulkNotifications(
    notificationList: Array<{
      student: Student
      status: "absent" | "late" | "excused"
      note?: string
    }>,
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const notification of notificationList) {
      const result = await this.sendAttendanceNotification(notification.student, notification.status, notification.note)

      if (result) {
        success++
      } else {
        failed++
      }
    }

    return { success, failed }
  }
}

export const emailService = new EmailNotificationService()

export class SmsNotificationService {
  private async getSchoolInfo(): Promise<{ name: string; phone: string }> {
    try {
      const settings = await db.getSettings()
      console.log("[v0] School info retrieved:", {
        name: settings.schoolName,
        phone: settings.schoolPhone,
        fullSettings: settings,
      })
      return {
        name: settings.schoolName || "Smart Attendance Tracker",
        phone: settings.schoolPhone || "",
      }
    } catch (error) {
      console.error("Error getting school info:", error)
      return {
        name: "Smart Attendance Tracker",
        phone: "",
      }
    }
  }

  async sendAttendanceNotification(
    student: Student,
    status: "absent" | "late" | "excused",
    note?: string,
  ): Promise<boolean> {
    try {
      if (!student.parent_phone) {
        console.error("No parent phone for student:", student.name)
        notifications.error("Missing Phone", `Cannot send SMS to ${student.parent_name}: No phone number provided`)
        return false
      }

      let formattedPhone = student.parent_phone.trim()
      const cleanPhone = formattedPhone.replace(/[^\d+]/g, "")

      if (cleanPhone.startsWith("+251")) {
        formattedPhone = cleanPhone
      } else if (cleanPhone.startsWith("251")) {
        formattedPhone = "+" + cleanPhone
      } else if (cleanPhone.startsWith("09") || cleanPhone.startsWith("07")) {
        formattedPhone = "+251" + cleanPhone.substring(1)
      } else if (cleanPhone.startsWith("9") || cleanPhone.startsWith("7")) {
        formattedPhone = "+251" + cleanPhone
      } else {
        console.error("Invalid Ethiopian phone format for student:", student.name, student.parent_phone)
        notifications.error(
          "Invalid Phone",
          `Cannot send SMS to ${student.parent_name}: Invalid Ethiopian phone format (${student.parent_phone}). Expected format: +251xxxxxxxxx or 09xxxxxxxx`,
        )
        return false
      }

      if (!formattedPhone.match(/^\+251[79]\d{8}$/)) {
        console.error("Invalid Ethiopian phone format after formatting:", student.name, formattedPhone)
        notifications.error(
          "Invalid Phone",
          `Cannot send SMS to ${student.parent_name}: Invalid phone format after formatting (${formattedPhone})`,
        )
        return false
      }

      const schoolInfo = await this.getSchoolInfo()

      const messages = {
        absent: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) was marked absent today.${note ? ` Reason: ${note}.` : ""} Please contact school if unplanned.${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
        late: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) arrived late today. Please ensure punctuality.${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
        excused: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) has been marked as excused absent today.${note ? ` Reason: ${note}.` : ""}${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
      }

      if (!navigator.onLine) {
        // Queue the SMS for later
        if (syncQueue) {
          syncQueue.add("sms", {
            to: formattedPhone,
            message: messages[status],
            studentName: student.name,
            parentName: student.parent_name,
          })
          notifications.info("SMS Queued", `SMS for ${student.parent_name} will be sent when you're back online`)
        }
        return false
      }

      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: messages[status],
        }),
      })

      let result
      try {
        const responseText = await response.text()

        if (responseText.startsWith("{") || responseText.startsWith("[")) {
          result = JSON.parse(responseText)
        } else {
          console.error("SMS API returned HTML instead of JSON:", responseText.substring(0, 100))
          throw new Error(`SMS API returned HTML error page (status: ${response.status})`)
        }
      } catch (parseError) {
        console.error("Failed to parse SMS API response:", parseError)
        throw new Error(
          `SMS API response parsing failed: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        )
      }

      if (response.ok && result.success) {
        const message = result.demo
          ? `Demo SMS sent to ${student.parent_name} at ${formattedPhone} for ${student.name}'s ${status} status (${result.message})`
          : `Real SMS sent to ${student.parent_name} at ${formattedPhone} for ${student.name}'s ${status} status`

        notifications.success(result.demo ? "SMS Sent (Demo)" : "SMS Sent", message)
        return true
      } else {
        throw new Error(result.error || result.message || "Failed to send SMS")
      }
    } catch (error) {
      console.error("Error sending SMS to", student.parent_phone, ":", error)

      if (!navigator.onLine && syncQueue) {
        let formattedPhone = student.parent_phone.trim()
        const cleanPhone = formattedPhone.replace(/[^\d+]/g, "")
        if (cleanPhone.startsWith("+251")) {
          formattedPhone = cleanPhone
        } else if (cleanPhone.startsWith("251")) {
          formattedPhone = "+" + cleanPhone
        } else if (cleanPhone.startsWith("09") || cleanPhone.startsWith("07")) {
          formattedPhone = "+251" + cleanPhone.substring(1)
        } else if (cleanPhone.startsWith("9") || cleanPhone.startsWith("7")) {
          formattedPhone = "+251" + cleanPhone
        }

        const schoolInfo = await this.getSchoolInfo()
        const messages = {
          absent: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) was marked absent today.${note ? ` Reason: ${note}.` : ""} Please contact school if unplanned.${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
          late: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) arrived late today. Please ensure punctuality.${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
          excused: `Dear ${student.parent_name}, your child ${student.name} (${student.grade}) has been marked as excused absent today.${note ? ` Reason: ${note}.` : ""}${schoolInfo.phone ? ` School: ${schoolInfo.phone}.` : ""} Sincerely, ${schoolInfo.name}`,
        }

        syncQueue.add("sms", {
          to: formattedPhone,
          message: messages[status],
          studentName: student.name,
          parentName: student.parent_name,
        })
        notifications.info("SMS Queued", `SMS for ${student.parent_name} will be sent when you're back online`)
        return false
      }

      notifications.error(
        "SMS Failed",
        `Failed to send SMS to ${student.parent_name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
      return false
    }
  }

  async sendBulkNotifications(
    notificationList: Array<{
      student: Student
      status: "absent" | "late" | "excused"
      note?: string
    }>,
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const notification of notificationList) {
      const result = await this.sendAttendanceNotification(notification.student, notification.status, notification.note)

      if (result) {
        success++
      } else {
        failed++
      }
    }

    return { success, failed }
  }
}

export const smsService = new SmsNotificationService()

export class CombinedNotificationService {
  async sendAttendanceNotification(
    student: Student,
    status: "absent" | "late" | "excused",
    note?: string,
    methods: { email?: boolean; sms?: boolean } = { email: true, sms: true },
  ): Promise<{ email: boolean; sms: boolean }> {
    const results = { email: false, sms: false }

    if (methods.email) {
      results.email = await emailService.sendAttendanceNotification(student, status, note)
    }

    if (methods.sms) {
      results.sms = await smsService.sendAttendanceNotification(student, status, note)
    }

    return results
  }

  async sendBulkNotifications(
    notificationList: Array<{
      student: Student
      status: "absent" | "late" | "excused"
      note?: string
    }>,
    methods: { email?: boolean; sms?: boolean } = { email: true, sms: true },
  ): Promise<{ email: { success: number; failed: number }; sms: { success: number; failed: number } }> {
    const results = {
      email: { success: 0, failed: 0 },
      sms: { success: 0, failed: 0 },
    }

    if (methods.email) {
      results.email = await emailService.sendBulkNotifications(notificationList)
    }

    if (methods.sms) {
      results.sms = await smsService.sendBulkNotifications(notificationList)
    }

    return results
  }
}

export const combinedNotificationService = new CombinedNotificationService()
