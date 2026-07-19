import { z } from 'zod';

export const BookingItemDto = z.object({
  id: z.string(),
  name: z.string(),
  qty: z.number().int().min(1),
  price: z.number().min(0),
  subtotal: z.number().min(0),
});

export const CreateBookingDto = z.object({
  draftId: z.string().optional(),
  items: z.array(BookingItemDto).min(1),
  total: z.number().min(0),
  day: z.string(),
  time: z.string(),
  frequency: z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const v = val.trim().toLowerCase();
    const map: Record<string, string> = {
      'once': 'once',
      'one-time': 'once',
      'one time': 'once',
      'single': 'once',
      'once-only': 'once',
      'daily': 'daily',
      'everyday': 'daily',
      'every day': 'daily',
      'weekly': 'weekly',
      'everyweek': 'weekly',
      'every week': 'weekly',
    };
    return map[v] || v;
  }, z.enum(['once', 'daily', 'weekly'])),
  package: z.string().optional(),
  packageName: z.string().optional(),
  address: z.preprocess((val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().optional()),
  notes: z.string().optional(),
});

export type CreateBookingDtoType = z.infer<typeof CreateBookingDto>;
