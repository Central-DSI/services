import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email(),
  roles: z.array(z.string()).optional(),
  identityNumber: z.string().optional(),
  identityType: z.enum(["NIM", "NIP", "OTHER"]).optional(),
});