import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  phone: z.string().min(9, 'Nomor HP minimal 9 digit').max(18, 'Nomor HP maksimal 18 digit'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})
