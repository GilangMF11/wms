import { z } from 'zod';

export const createGoodsIssueSchema = z.object({
  issue_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        serial_number_id: z.string().uuid(),
        sell_price: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export const updateGoodsIssueSchema = z.object({
  issue_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        serial_number_id: z.string().uuid(),
        sell_price: z.number().nonnegative().optional(),
      }),
    )
    .min(1)
    .optional(),
});

export type CreateGoodsIssueInput = z.infer<typeof createGoodsIssueSchema>;
export type UpdateGoodsIssueInput = z.infer<typeof updateGoodsIssueSchema>;
