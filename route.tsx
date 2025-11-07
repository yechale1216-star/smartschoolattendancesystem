import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { apiKey, fromDomain, testEmail } = await request.json()

    if (!apiKey || !fromDomain || !testEmail) {
      return NextResponse.json({
        success: false,
        message: "API key, domain, and test email are required",
      })
    }

    // Test the Resend API with the provided key
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Addiss Hiwot School <noreply@${fromDomain}>`,
        to: [testEmail],
        subject: "Email Configuration Test - Addiss Hiwot School",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Configuration Successful!</h2>
            <p>This is a test email to confirm that your email notification system is working correctly.</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #374151;">Configuration Details:</h3>
              <ul style="margin: 0; color: #6b7280;">
                <li>From Domain: ${fromDomain}</li>
                <li>Test Email: ${testEmail}</li>
                <li>Service: Resend</li>
                <li>Status: ✅ Active</li>
              </ul>
            </div>
            <p>Your attendance notification system is now ready to send real emails to parents and guardians.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent from the Addiss Hiwot School attendance tracking system.
            </p>
          </div>
        `,
        text: `Email Configuration Test - Addiss Hiwot School\n\nThis is a test email to confirm that your email notification system is working correctly.\n\nConfiguration Details:\n- From Domain: ${fromDomain}\n- Test Email: ${testEmail}\n- Service: Resend\n- Status: Active\n\nYour attendance notification system is now ready to send real emails to parents and guardians.`,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully! Check ${testEmail} for the test message.`,
        messageId: result.id,
      })
    } else {
      const error = await response.json()
      return NextResponse.json({
        success: false,
        message: `Resend API Error: ${error.message || "Invalid API key or configuration"}`,
      })
    }
  } catch (error) {
    console.error("Email test error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to test email configuration. Please check your API key and try again.",
    })
  }
}
