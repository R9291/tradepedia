import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address format"),
  phone: z
    .string()
    .min(9, "Phone number is too short")
    .max(20, "Phone number is too long")
    .refine((val) => {
      const cleaned = val.replace(/[\s\-\(\)\+]/g, "");
      return /^\d{9,15}$/.test(cleaned);
    }, "Please enter a valid phone number (e.g. 0712345678 or +254712345678)"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export const kycSubmissionSchema = z.object({
  documentType: z.enum(["NATIONAL_ID", "PASSPORT", "ALIEN_CARD"], {
    errorMap: () => ({ message: "Select a valid document type" }),
  }),
  idNumber: z.string().min(4, "ID Number must be at least 4 characters").max(30),
  nationality: z.string().min(2, "Nationality is required").default("Kenyan"),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date of birth format",
  }),
  address: z.string().min(5, "Address must be at least 5 characters"),
  documentUrl: z.string().min(1, "Document upload is required"),
  selfieUrl: z.string().min(1, "Selfie upload is required"),
});

export const adminKycReviewSchema = z.object({
  documentId: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewerNote: z.string().min(3, "Reviewer note must provide clear rationale").max(500),
});

export const adminAdjustmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().refine((n) => n !== 0, "Adjustment amount cannot be zero"),
  reason: z.string().min(5, "A descriptive administrative reason is required for any ledger adjustment"),
});

export const depositInitiateSchema = z.object({
  amount: z
    .number()
    .min(100, "Minimum deposit amount is KES 100.00")
    .max(150000, "Maximum single deposit amount is KES 150,000.00"),
  phoneNumber: z
    .string()
    .min(9, "Phone number is too short")
    .max(20, "Phone number is too long"),
});
