CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bundle_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_product_id" uuid NOT NULL,
	"component_product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"warranty_duration_days" integer DEFAULT 365 NOT NULL,
	"warehouse_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_issue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"serial_number_id" uuid NOT NULL,
	"sell_price" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_number" varchar(100) NOT NULL,
	"issue_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goods_issues_issue_number_unique" UNIQUE("issue_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" varchar(100) NOT NULL,
	"supplier_name" varchar(255) NOT NULL,
	"receipt_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goods_receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand" varchar(255),
	"category_id" uuid,
	"buy_price" numeric(15, 2),
	"sell_price" numeric(15, 2),
	"image_url" text,
	"is_bundle" boolean DEFAULT false,
	"warehouse_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rma_number" varchar(100) NOT NULL,
	"serial_number_id" uuid NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'received' NOT NULL,
	"resolution" text,
	"created_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "rmas_rma_number_unique" UNIQUE("rma_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "serial_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"condition" varchar(20) DEFAULT 'new' NOT NULL,
	"status" varchar(20) DEFAULT 'in_stock' NOT NULL,
	"sold_at" timestamp with time zone,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "serial_numbers_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_number_id" uuid NOT NULL,
	"adjustment_type" varchar(20) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"reason" text NOT NULL,
	"opname_id" uuid,
	"created_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_opname_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opname_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"system_quantity" integer NOT NULL,
	"physical_quantity" integer NOT NULL,
	"difference" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_opnames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opname_number" varchar(100) NOT NULL,
	"opname_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "stock_opnames_opname_number_unique" UNIQUE("opname_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplier_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_number" varchar(100) NOT NULL,
	"serial_number_id" uuid NOT NULL,
	"supplier_name" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"warehouse_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "supplier_returns_return_number_unique" UNIQUE("return_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"warehouse_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_issue_items" ADD CONSTRAINT "goods_issue_items_issue_id_goods_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."goods_issues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_issue_items" ADD CONSTRAINT "goods_issue_items_serial_number_id_serial_numbers_id_fk" FOREIGN KEY ("serial_number_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_issues" ADD CONSTRAINT "goods_issues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_issues" ADD CONSTRAINT "goods_issues_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rmas" ADD CONSTRAINT "rmas_serial_number_id_serial_numbers_id_fk" FOREIGN KEY ("serial_number_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rmas" ADD CONSTRAINT "rmas_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rmas" ADD CONSTRAINT "rmas_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_serial_number_id_serial_numbers_id_fk" FOREIGN KEY ("serial_number_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_stock_opnames_id_fk" FOREIGN KEY ("opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_serial_number_id_serial_numbers_id_fk" FOREIGN KEY ("serial_number_id") REFERENCES "public"."serial_numbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bundle_unique_idx" ON "bundle_items" USING btree ("bundle_product_id","component_product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gi_date_idx" ON "goods_issues" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gr_date_idx" ON "goods_receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rma_status_idx" ON "rmas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sn_product_idx" ON "serial_numbers" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sn_warehouse_idx" ON "serial_numbers" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sn_status_idx" ON "serial_numbers" USING btree ("status");