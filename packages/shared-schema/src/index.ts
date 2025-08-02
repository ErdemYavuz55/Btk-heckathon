import { z } from 'zod';

// UI Input schema for sliders/controls
export const uiInputSchema = z.object({
  name: z.string(),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  value: z.number()
});

// Main spec schema for generator responses
export const specSchema = z.object({
  uiInputs: z.array(uiInputSchema),
  code: z.string(),
  image: z.string().url().optional()
});

// Request schema for generator API
export const generateRequestSchema = z.object({
  prompt: z.string(),
  topic: z.enum(['math', 'physics', 'chemistry', 'history']),
  lang: z.string().default('en')
});

// Export types
export type UiInput = z.infer<typeof uiInputSchema>;
export type Spec = z.infer<typeof specSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>; 