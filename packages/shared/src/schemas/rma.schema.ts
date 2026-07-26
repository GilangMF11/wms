import { z } from 'zod';

export const rmaStatusEnum = z.enum([
  'received',
  'processing',
  'completed_replaced',
  'completed_repaired',
  'rejected',
]);
export type RmaStatus = z.infer<typeof rmaStatusEnum>;

export const createRmaSchema = z.object({
  serial_number_id: z.string().uuid(),
  customer_name: z.string().min(1).max(255),
  reason: z.string().min(1),
});

export const updateRmaStatusSchema = z.object({
  status: rmaStatusEnum,
  resolution: z.string().optional(),
});

export type CreateRmaInput = z.infer<typeof createRmaSchema>;
export type UpdateRmaStatusInput = z.infer<typeof updateRmaStatusSchema>;
