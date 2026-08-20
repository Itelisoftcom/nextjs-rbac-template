CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"app_name" text DEFAULT 'RBAC Admin' NOT NULL,
	"default_color_mode" text DEFAULT 'system' NOT NULL,
	"default_theme_id" text,
	"font_id" text DEFAULT 'geist' NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_default_theme_id_themes_id_fk" FOREIGN KEY ("default_theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;