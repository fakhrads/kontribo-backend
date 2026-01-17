CREATE TYPE "public"."webhook_event_type" AS ENUM('XENDIT_SUPPORT', 'XENDIT_WITHDRAWAL', 'XENDIT_FOUNDER_PAYOUT');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('PASSWORD', 'GOOGLE');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CONTRIBUTOR');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."context_type" AS ENUM('SOFTWARE', 'VIDEO', 'PHOTO', 'AUDIO', 'GAME_SCRIPT', 'GAME_ASSET', 'DESIGN', 'ARTICLE', 'DATASET', 'DOCUMENTATION', 'TEMPLATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."contributor_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."asset_kind" AS ENUM('AVATAR', 'BANNER', 'THUMBNAIL', 'GALLERY', 'ATTACHMENT');--> statement-breakpoint
CREATE TYPE "public"."asset_provider" AS ENUM('IDCLOUDHOST_S3', 'AWS_S3', 'OTHER_S3');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('UPLOADING', 'READY', 'FAILED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."asset_visibility" AS ENUM('PUBLIC', 'PRIVATE');--> statement-breakpoint
CREATE TYPE "public"."payout_channel" AS ENUM('BANK', 'EWALLET');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."ledger_bucket" AS ENUM('AVAILABLE', 'PENDING', 'RESERVED', 'REVENUE');--> statement-breakpoint
CREATE TYPE "public"."ledger_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."ledger_owner_type" AS ENUM('CONTRIBUTOR', 'FOUNDER');--> statement-breakpoint
CREATE TYPE "public"."ledger_ref_type" AS ENUM('SUPPORT', 'WITHDRAWAL', 'FOUNDER_PAYOUT', 'ADJUSTMENT', 'REFUND', 'CHARGEBACK', 'FEE');--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "webhook_event_type" NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"signature_valid" boolean DEFAULT false NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processing_error" text DEFAULT '' NOT NULL,
	"payload" text DEFAULT '' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"password_hash" text,
	"provider_user_id" varchar(255),
	"provider_email" varchar(320),
	"provider_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"status" "session_status" DEFAULT 'ACTIVE' NOT NULL,
	"ip" varchar(64) DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" DEFAULT 'CONTRIBUTOR' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"email" varchar(320) NOT NULL,
	"username" varchar(32) NOT NULL,
	"display_name" varchar(120) DEFAULT '' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contribution_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"type" "context_type" DEFAULT 'OTHER' NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"external_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"thumbnail_asset_id" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contributor_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"label" varchar(40) DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"sort_order" text DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "contributor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" varchar(32) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"category" varchar(64) DEFAULT '' NOT NULL,
	"status" "contributor_status" DEFAULT 'ACTIVE' NOT NULL,
	"avatar_asset_id" uuid,
	"banner_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"context_id" uuid,
	"kind" "asset_kind" NOT NULL,
	"provider" "asset_provider" DEFAULT 'IDCLOUDHOST_S3' NOT NULL,
	"bucket" varchar(128) NOT NULL,
	"region" varchar(64),
	"endpoint" text,
	"object_key" text NOT NULL,
	"original_filename" varchar(255),
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" varchar(64),
	"visibility" "asset_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"status" "asset_status" DEFAULT 'UPLOADING' NOT NULL,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "founder_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"status" "withdrawal_status" DEFAULT 'REQUESTED' NOT NULL,
	"xendit_disbursement_id" varchar(80),
	"xendit_idempotency_key" varchar(80) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "payout_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"channel" "payout_channel" NOT NULL,
	"label" varchar(80) DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"bank_code" varchar(32),
	"bank_account_name" varchar(120),
	"bank_account_number" varchar(40),
	"ewallet_type" varchar(32),
	"ewallet_number" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "support_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"context_id" uuid,
	"amount_gross" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"supporter_name" varchar(120),
	"supporter_email" varchar(320),
	"status" "support_status" DEFAULT 'PENDING' NOT NULL,
	"xendit_invoice_id" varchar(80),
	"xendit_payment_id" varchar(80),
	"idempotency_key" varchar(80) NOT NULL,
	"paid_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"amount_to_user" integer NOT NULL,
	"fee_flat" integer DEFAULT 4500 NOT NULL,
	"total_debit" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"status" "withdrawal_status" DEFAULT 'REQUESTED' NOT NULL,
	"xendit_disbursement_id" varchar(80),
	"xendit_idempotency_key" varchar(80) NOT NULL,
	"xendit_fee_actual" integer DEFAULT 0 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "ledger_owner_type" NOT NULL,
	"contributor_id" uuid,
	"bucket" "ledger_bucket" NOT NULL,
	"direction" "ledger_direction" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"reference_type" "ledger_ref_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"idempotency_key" varchar(100),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"code_verifier" text NOT NULL,
	"nonce" text NOT NULL,
	"redirect_to" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_contexts" ADD CONSTRAINT "contribution_contexts_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_links" ADD CONSTRAINT "contributor_links_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_profiles" ADD CONSTRAINT "contributor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_context_id_contribution_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contribution_contexts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_destinations" ADD CONSTRAINT "payout_destinations_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_transactions" ADD CONSTRAINT "support_transactions_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_transactions" ADD CONSTRAINT "support_transactions_context_id_contribution_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contribution_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_destination_id_payout_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."payout_destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_contributor_id_contributor_profiles_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_events_type_idx" ON "webhook_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "webhook_events_external_idx" ON "webhook_events" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_idem_uq" ON "webhook_events" USING btree ("type","idempotency_key");--> statement-breakpoint
CREATE INDEX "auth_identities_user_idx" ON "auth_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_identities_provider_idx" ON "auth_identities" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_user_uq" ON "auth_identities" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_user_provider_uq" ON "auth_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contribution_contexts_contributor_idx" ON "contribution_contexts" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "contribution_contexts_type_idx" ON "contribution_contexts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "contribution_contexts_archived_idx" ON "contribution_contexts" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "contributor_links_contributor_idx" ON "contributor_links" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "contributor_links_active_idx" ON "contributor_links" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "contributor_profiles_user_uq" ON "contributor_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contributor_profiles_username_uq" ON "contributor_profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "contributor_profiles_status_idx" ON "contributor_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_contributor_idx" ON "assets" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "assets_context_idx" ON "assets" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_kind_idx" ON "assets" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_object_uq" ON "assets" USING btree ("provider","bucket","object_key");--> statement-breakpoint
CREATE INDEX "founder_payouts_status_idx" ON "founder_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "founder_payouts_xendit_disbursement_idx" ON "founder_payouts" USING btree ("xendit_disbursement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "founder_payouts_xendit_idem_uq" ON "founder_payouts" USING btree ("xendit_idempotency_key");--> statement-breakpoint
CREATE INDEX "payout_destinations_contributor_idx" ON "payout_destinations" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "payout_destinations_default_idx" ON "payout_destinations" USING btree ("contributor_id","is_default");--> statement-breakpoint
CREATE INDEX "payout_destinations_active_idx" ON "payout_destinations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "support_transactions_contributor_idx" ON "support_transactions" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "support_transactions_status_idx" ON "support_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_transactions_xendit_invoice_idx" ON "support_transactions" USING btree ("xendit_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_transactions_idem_uq" ON "support_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_contributor_idx" ON "withdrawal_requests" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "withdrawal_requests_xendit_disbursement_idx" ON "withdrawal_requests" USING btree ("xendit_disbursement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withdrawal_requests_xendit_idem_uq" ON "withdrawal_requests" USING btree ("xendit_idempotency_key");--> statement-breakpoint
CREATE INDEX "ledger_entries_owner_idx" ON "ledger_entries" USING btree ("owner_type","contributor_id","bucket");--> statement-breakpoint
CREATE INDEX "ledger_entries_ref_idx" ON "ledger_entries" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_occurred_at_idx" ON "ledger_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_idem_uq" ON "ledger_entries" USING btree ("owner_type","idempotency_key");