import { z } from 'zod';

export const productConditionEnum = z.enum(['new', 'refurbished', 'display', 'damaged']);
export type ProductCondition = z.infer<typeof productConditionEnum>;

export const createProductSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  brand: z.string().max(255).optional(),
  category_id: z.string().uuid().optional(),
  buy_price: z.number().nonnegative().optional(),
  sell_price: z.number().nonnegative().optional(),
  image_url: z.string().url().optional(),
  is_bundle: z.boolean().default(false),
  bundle_items: z
    .array(
      z.object({
        component_product_id: z.string().uuid(),
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  warranty_duration_days: z.number().int().min(1).default(365),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
