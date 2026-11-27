
import { z } from 'zod';

const positiveIntQuery = z.coerce.number().int().positive();

const dateQuery = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  }, 'Tanggal tidak valid');

export const auditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    action: z.string().trim().min(1).max(50).optional(),
    targetTable: z.string().trim().min(1).max(50).optional(),
    targetId: positiveIntQuery.optional(),
    userId: positiveIntQuery.optional(),
    from: dateQuery.optional(),
    to: dateQuery.optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    {
      message: 'Tanggal from tidak boleh melebihi tanggal to',
      path: ['from'],
    },
  );

export type AuditQuery = z.infer<typeof auditQuerySchema>;
export const auditIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});