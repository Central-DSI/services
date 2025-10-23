import { z } from "zod";

const isFuture = (d) => d instanceof Date && !isNaN(d) && d.getTime() > Date.now();

export const requestGuidanceSchema = z.object({
  guidanceDate: z.coerce.date().refine(isFuture, "guidanceDate must be in the future"),
  studentNotes: z.string().min(1).optional(),
});

export const rescheduleGuidanceSchema = z.object({
  guidanceDate: z.coerce.date().refine(isFuture, "guidanceDate must be in the future"),
  studentNotes: z.string().min(1).optional(),
});

export const studentNotesSchema = z.object({
  studentNotes: z.string().min(1, "studentNotes is required"),
});

export const completeComponentsSchema = z.object({
  componentIds: z.array(z.string().min(1)).min(1, "componentIds cannot be empty"),
  completedAt: z.coerce.date().optional(),
});
