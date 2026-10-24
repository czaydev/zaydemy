ALTER TABLE "course_sections" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "course_sections" ADD COLUMN "open_at" timestamp;
