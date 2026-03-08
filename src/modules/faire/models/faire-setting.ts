import { model } from "@medusajs/framework/utils"

/**
 * Faire module settings model.
 * Single-row table for storing plugin configuration.
 */
const FaireSetting = model.define("faire_setting", {
    id: model.id().primaryKey(),
    wholesale_price_percentage: model.number().default(50),
})

export default FaireSetting
