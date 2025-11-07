import { type NextRequest, NextResponse } from "next/server"
import { authService } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 })
    }

    const result = await authService.verifyResetToken(token)

    return NextResponse.json({
      valid: result.valid,
      error: result.error,
    })
  } catch (error) {
    console.error("Verify reset token error:", error)
    return NextResponse.json({ valid: false, error: "An error occurred verifying the token" }, { status: 500 })
  }
}
