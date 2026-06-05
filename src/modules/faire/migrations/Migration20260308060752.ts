import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260308060752 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "faire_setting" ("id" text not null, "wholesale_price_percentage" integer not null default 50, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "faire_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_faire_setting_deleted_at" ON "faire_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "faire_setting" cascade;`);
  }

}
