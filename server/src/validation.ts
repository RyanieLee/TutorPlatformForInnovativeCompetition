import { z } from 'zod'
import { areaLabelSchema } from './area'
import { fail } from './core'
import { containsPersonalInfo } from './match-model'
export const idParam = z.object({ id: z.string().min(1).max(100) })
export const listQuerySchema = (defaultSize: number) => z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(defaultSize)
})
export const bookingStatuses = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'] as const
export const applicationStatuses = ['draft', 'pending', 'approved', 'rejected'] as const
export const reportStatuses = ['open', 'resolved'] as const
export const bookingListQuery = listQuerySchema(100).extend({ status: z.enum(bookingStatuses).optional() })
export const applicationListQuery = listQuerySchema(50).extend({ status: z.enum(applicationStatuses).optional() })
export const reportListQuery = listQuerySchema(100).extend({ status: z.enum(reportStatuses).optional() })
const text = (max: number) => z.string().trim().min(1).max(max)
const evidence = {
  experienceMonths: z.number().int().min(0).max(120).nullable().optional(),
  academicScore: z.number().int().min(0).max(100).nullable().optional(),
  teachingSkillLevel: z.number().int().min(0).max(5).nullable().optional(),
  caseCount: z.number().int().min(0).max(50).nullable().optional(),
  caseSummary: z.string().trim().max(120).refine(value=>!containsPersonalInfo(value),'案例摘要不能包含姓名、联系方式或地址').optional()
}
export const applicationSchema = z.object({
  displayName: text(20), university: text(40), major: text(40),
  subjects: z.array(text(30)).min(1).max(6).refine(values=>new Set(values).size===values.length,'科目不能重复'), teachingMode: z.enum(['线上', '线下', '均可']),
  area: text(40), pricePerHour: z.number().int().min(1).max(1000),
  introduction: text(500).refine(v => v.length >= 10), availability: text(100), ...evidence
}).strict()
export const draftSchema = z.object({ displayName:z.string().max(20),university:z.string().max(40),major:z.string().max(40),subjects:z.array(z.string().max(30)).max(6),teachingMode:z.enum(['线上','线下','均可']),area:z.string().max(40),pricePerHour:z.number().int().min(0).max(1000),introduction:z.string().max(500),availability:z.string().max(100),...evidence }).strict()
export const bookingSchema = z.object({ areaLabel: areaLabelSchema.optional(), requestId: z.string().min(8).max(100).optional(), tutorId: idParam.shape.id, studentName: text(40), subject: text(30), expectedTime: text(100), note: z.string().max(500).default('') }).strict()
export const reportSchema = z.object({ tutorId: idParam.shape.id, reason: z.enum(['资料不实','内容不当','其他']), description: z.string().max(500).default('') }).strict()
export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) return fail('INVALID', 400, result.error.issues[0]?.message || '请求参数无效')
  return result.data
}
