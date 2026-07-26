import { z } from 'zod';

const receiptItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  unit_price: z.number().nonnegative(),
});

export const createGoodsReceiptSchema = z.object({
  supplier_name: z.string().min(1).max(255),
  receipt_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(receiptItemSchema).min(1),
});

export const updateGoodsReceiptSchema = z.object({
  supplier_name: z.string().min(1).max(255).optional(),
  receipt_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(receiptItemSchema).min(1).optional(),
});

export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type UpdateGoodsReceiptInput = z.infer<typeof updateGoodsReceiptSchema>;
