CREATE TABLE `compliance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`parcel_id` text NOT NULL,
	`milestone_type` text NOT NULL,
	`photo_key` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`timestamp` integer NOT NULL,
	`verified_by` text,
	`metadata` text,
	FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "milestone_type_check" CHECK("compliance_records"."milestone_type" IN ('awd_drain','straw_mgmt','harvest'))
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`dn_id` text NOT NULL,
	`htx_id` text NOT NULL,
	`price_per_kg` integer NOT NULL,
	`volume_kg` integer NOT NULL,
	`compliance_rules` text NOT NULL,
	`created_at` integer NOT NULL,
	`signed_at` integer
);
--> statement-breakpoint
CREATE TABLE `green_dossiers` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`parcel_ids` text NOT NULL,
	`generated_at` integer NOT NULL,
	`pdf_key` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `harvest_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`parcel_id` text NOT NULL,
	`estimated_date` integer NOT NULL,
	`confirmed_by_dn` text,
	`status` text,
	FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "harvest_status_check" CHECK("harvest_slots"."status" IN ('pending','confirmed','completed'))
);
--> statement-breakpoint
CREATE TABLE `parcels` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`area_ha` real NOT NULL,
	`sowing_date` integer NOT NULL,
	`geometry` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON UPDATE no action ON DELETE no action
);
