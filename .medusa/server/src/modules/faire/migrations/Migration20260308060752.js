"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260308060752 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260308060752 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "faire_setting" ("id" text not null, "wholesale_price_percentage" integer not null default 50, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "faire_setting_pkey" primary key ("id"));`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_faire_setting_deleted_at" ON "faire_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
    }
    async down() {
        this.addSql(`drop table if exists "faire_setting" cascade;`);
    }
}
exports.Migration20260308060752 = Migration20260308060752;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWlncmF0aW9uMjAyNjAzMDgwNjA3NTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9mYWlyZS9taWdyYXRpb25zL01pZ3JhdGlvbjIwMjYwMzA4MDYwNzUyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlFQUFxRTtBQUVyRSxNQUFhLHVCQUF3QixTQUFRLHNCQUFTO0lBRTNDLEtBQUssQ0FBQyxFQUFFO1FBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpVEFBaVQsQ0FBQyxDQUFDO1FBQy9ULElBQUksQ0FBQyxNQUFNLENBQUMsdUhBQXVILENBQUMsQ0FBQztJQUN2SSxDQUFDO0lBRVEsS0FBSyxDQUFDLElBQUk7UUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FFRjtBQVhELDBEQVdDIn0=