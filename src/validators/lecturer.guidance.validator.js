import { z } from "zod";

export const feedbackSchema = z.object({
  feedback: z.string().min(1, "feedback is required"),
});

export const approveGuidanceSchema = z.object({
  feedback: z.string().optional(),
  meetingUrl: z.string().url().optional(),
});

export const approveComponentsSchema = z.object({
  componentIds: z.array(z.string().min(1)).min(1, "componentIds cannot be empty"),
});

export const failThesisSchema = z.object({
  reason: z.string().min(1).optional(),
});
