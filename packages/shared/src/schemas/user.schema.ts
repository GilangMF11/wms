import { z } from 'zod';

export const userRoleEnum = z.enum(['admin', 'staff', 'owner']);
export type UserRole = z.infer<typeof userRoleEnum>;

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1).max(255),
  role: userRoleEnum,
  warehouse_id: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(255).optional(),
  role: userRoleEnum.optional(),
  warehouse_id: z.string().uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
