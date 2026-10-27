import { z } from "zod";

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const ymMsg = 'must be a quoted "YYYY-MM" string';
const endMsg = 'must be a quoted "YYYY-MM" string or present';

export const yearMonth = z.string({ invalid_type_error: ymMsg }).regex(YM, ymMsg);
export const endDate = z
  .string({ invalid_type_error: endMsg })
  .refine((v) => v === "present" || YM.test(v), endMsg);

const link = z.object({ label: z.string().min(1), url: z.string().url() }).strict();

export const taxonomySchema = z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), z.string().min(1));

export const roleSchema = z
  .object({
    employer: z.string().min(1),
    title: z.string().min(1),
    start: yearMonth,
    end: endDate,
    history: z
      .array(z.object({ title: z.string().min(1), start: yearMonth, end: endDate }).strict())
      .default([]),
  })
  .strict();

export const projectSchema = z
  .object({
    client: z.string().min(1),
    name: z.string().min(1),
    start: yearMonth,
    end: endDate,
    role: z.string().min(1),
    tech: z.array(z.string()).default([]),
  })
  .strict();

export const achievementSchema = z
  .object({
    date: yearMonth,
    headline: z.string().min(1),
    tags: z.array(z.string()).min(1),
    tech: z.array(z.string()).default([]),
    impact: z.string().optional(),
    links: z.array(link).default([]),
  })
  .strict();

export type RoleFront = z.infer<typeof roleSchema>;
export type ProjectFront = z.infer<typeof projectSchema>;
export type AchievementFront = z.infer<typeof achievementSchema>;
