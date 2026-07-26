import { z } from 'zod';
import { productConditionEnum } from './product.schema';

export const serialNumberStatusEnum = z.enum(['in_stock', 'sold', 'returned', 'rma']);
export type SerialNumberStatus = z.infer<typeof serialNumberStatusEnum>;

export const createSerialNumberBulkSchema = z.object({
  serial_numbers: z.array(
    z.object({
      serial_number: z.string().min(1).max(255),
      product_id: z.string().uuid(),
      condition: productConditionEnum.default('new'),
      warehouse_id: z.string().uuid(),
    }),
  ),
});

export const confirmReceiptSerialSchema = z.object({
  serial_numbers: z.array(
    z.object({
      item_id: z.string().uuid(),
      serial_number: z.string().min(1).max(255),
      condition: productConditionEnum.default('new'),
    }),
  ),
});

export type CreateSerialNumberBulkInput = z.infer<typeof createSerialNumberBulkSchema>;
export type ConfirmReceiptSerialInput = z.infer<typeof confirmReceiptSerialSchema>;
