// Simple OTP service for development/testing
// In production, you would integrate with a proper email service

export interface OTPData {
  otp: string;
  expiresAt: number;
  email: string;
  rfidCardId: string;
}

// Store OTPs temporarily (in production, use Redis or database)
const otpStorage = new Map<string, OTPData>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email (simplified for development)
export async function sendOTP(email: string, rfidCardId: string): Promise<{ success: boolean; message: string }> {
  try {
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    const otpKey = `${email}_${rfidCardId}`;
    otpStorage.set(otpKey, {
      otp,
      expiresAt,
      email,
      rfidCardId
    });

    // For development: Log OTP to console instead of sending email
    console.log(`OTP for ${email} (RFID: ${rfidCardId}): ${otp}`);
    console.log('In production, this would be sent via email service');

    // In production, integrate with your preferred email service here
    // Example: SendGrid, AWS SES, Nodemailer, etc.

    return {
      success: true,
      message: `OTP sent to ${email}. Check console for OTP in development mode.`
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.'
    };
  }
}

// Verify OTP
export function verifyOTP(email: string, rfidCardId: string, inputOTP: string): { success: boolean; message: string } {
  try {
    const otpKey = `${email}_${rfidCardId}`;
    const storedOTP = otpStorage.get(otpKey);

    if (!storedOTP) {
      return {
        success: false,
        message: 'OTP not found. Please request a new OTP.'
      };
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStorage.delete(otpKey);
      return {
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      };
    }

    if (storedOTP.otp !== inputOTP) {
      return {
        success: false,
        message: 'Invalid OTP. Please check and try again.'
      };
    }

    // OTP is valid, remove it from storage
    otpStorage.delete(otpKey);
    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: 'Error verifying OTP. Please try again.'
    };
  }
}

// Clean up expired OTPs (call this periodically)
export function cleanupExpiredOTPs(): void {
  const now = Date.now();
  for (const [key, otpData] of otpStorage.entries()) {
    if (now > otpData.expiresAt) {
      otpStorage.delete(key);
    }
  }
}
