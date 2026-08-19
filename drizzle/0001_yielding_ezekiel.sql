ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_name_active" ON "roles" USING btree ("name") WHERE "roles"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_code_active" ON "roles" USING btree ("code") WHERE "roles"."deleted_at" IS NULL;