import { z } from 'zod';

export const supplierReturnStatusEnum = z.enum(['pending', 'shipped', 'completed', 'rejected']);
export type SupplierReturnStatus = z.infer<typeof supplierReturnStatusEnum>;

export const createSupplierReturnSchema = z.object({
  serial_number_id: z.string().uuid(),
  supplier_name: z.string().min(1).max(255),
  reason: z.string().min(1),
});

export const updateSupplierReturnStatusSchema = z.object({
  status: supplierReturnStatusEnum,
});

export type CreateSupplierReturnInput = z.infer<typeof createSupplierReturnSchema>;
export type UpdateSupplierReturnStatusInput = z.infer<typeof updateSupplierReturnStatusSchema>;
