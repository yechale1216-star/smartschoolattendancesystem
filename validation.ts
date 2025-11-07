export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class ValidationService {
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = []

    if (!email) {
      errors.push("Email is required")
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push("Please enter a valid email address")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validatePhone(phone: string): ValidationResult {
    const errors: string[] = []

    if (!phone) {
      errors.push("Phone number is required")
    } else {
      // Remove all non-digit characters for validation
      const cleanPhone = phone.replace(/\D/g, "")
      if (cleanPhone.length < 10) {
        errors.push("Phone number must be at least 10 digits")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateStudentId(studentId: string, existingIds: string[] = [], currentId?: string): ValidationResult {
    const errors: string[] = []

    if (!studentId) {
      errors.push("Student ID is required")
    } else {
      if (studentId.length < 3) {
        errors.push("Student ID must be at least 3 characters")
      }

      // Check for duplicates (exclude current student when editing)
      const isDuplicate = existingIds.some((id) => id.toLowerCase() === studentId.toLowerCase() && id !== currentId)

      if (isDuplicate) {
        errors.push("This Student ID already exists")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateName(name: string): ValidationResult {
    const errors: string[] = []

    if (!name) {
      errors.push("Name is required")
    } else {
      if (name.trim().length < 2) {
        errors.push("Name must be at least 2 characters")
      }

      if (name.trim().length > 100) {
        errors.push("Name must be less than 100 characters")
      }

      // Check for valid characters (letters, spaces, hyphens, apostrophes)
      const nameRegex = /^[a-zA-Z\s\-']+$/
      if (!nameRegex.test(name.trim())) {
        errors.push("Name can only contain letters, spaces, hyphens, and apostrophes")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateRequired(value: string, fieldName: string): ValidationResult {
    const errors: string[] = []

    if (!value || value.trim().length === 0) {
      errors.push(`${fieldName} is required`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateDateRange(startDate: string, endDate: string): ValidationResult {
    const errors: string[] = []

    if (!startDate) {
      errors.push("Start date is required")
    }

    if (!endDate) {
      errors.push("End date is required")
    }

    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const today = new Date()

      if (start > end) {
        errors.push("Start date must be before end date")
      }

      if (end > today) {
        errors.push("End date cannot be in the future")
      }

      // Check if date range is too large (more than 1 year)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      if (start < oneYearAgo) {
        errors.push("Date range cannot exceed one year")
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateCSVFile(file: File): ValidationResult {
    const errors: string[] = []

    if (!file) {
      errors.push("Please select a file")
      return { isValid: false, errors }
    }

    // Check file type
    if (file.type !== "text/csv" && !file.name.toLowerCase().endsWith(".csv")) {
      errors.push("Please select a valid CSV file")
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      errors.push("File size must be less than 5MB")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap((result) => result.errors)

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    }
  }
}
