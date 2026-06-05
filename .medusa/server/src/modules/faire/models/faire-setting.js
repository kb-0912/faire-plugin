"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
/**
 * Faire module settings model.
 * Single-row table for storing plugin configuration.
 */
const FaireSetting = utils_1.model.define("faire_setting", {
    id: utils_1.model.id().primaryKey(),
    wholesale_price_percentage: utils_1.model.number().default(50),
});
exports.default = FaireSetting;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFpcmUtc2V0dGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2ZhaXJlL21vZGVscy9mYWlyZS1zZXR0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscURBQWlEO0FBRWpEOzs7R0FHRztBQUNILE1BQU0sWUFBWSxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQy9DLEVBQUUsRUFBRSxhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBQzNCLDBCQUEwQixFQUFFLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO0NBQ3pELENBQUMsQ0FBQTtBQUVGLGtCQUFlLFlBQVksQ0FBQSJ9