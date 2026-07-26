import { z } from 'zod';

export const createStockOpnameSchema = z.object({
  opname_date: z.string().datetime().optional(),
});

export const submitOpnameItemsSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        physical_quantity: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type CreateStockOpnameInput = z.infer<typeof createStockOpnameSchema>;
export type SubmitOpnameItemsInput = z.infer<typeof submitOpnameItemsSchema>;
