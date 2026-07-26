import { z } from 'zod';

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRefreshSchema = z.object({
  refresh_token: z.string().uuid(),
});

export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;
