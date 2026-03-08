"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncFaireOrdersWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const faire_1 = require("../modules/faire");
/**
 * Convert ISO 3166-1 alpha-3 country codes (Faire) to alpha-2 (Medusa).
 * Faire uses 3-letter codes like "USA", "CAN", "GBR".
 * Medusa uses 2-letter codes like "us", "ca", "gb".
 */
const COUNTRY_CODE_3_TO_2 = {
    USA: "us", CAN: "ca", GBR: "gb", AUS: "au", DEU: "de",
    FRA: "fr", ITA: "it", ESP: "es", JPN: "jp", KOR: "kr",
    CHN: "cn", IND: "in", BRA: "br", MEX: "mx", NLD: "nl",
    BEL: "be", AUT: "at", CHE: "ch", SWE: "se", NOR: "no",
    DNK: "dk", FIN: "fi", IRL: "ie", NZL: "nz", SGP: "sg",
    HKG: "hk", TWN: "tw", ZAF: "za", ARE: "ae", ISR: "il",
    PRT: "pt", POL: "pl", CZE: "cz", ROU: "ro", HUN: "hu",
    GRC: "gr", TUR: "tr", THA: "th", MYS: "my", PHL: "ph",
    IDN: "id", VNM: "vn", COL: "co", ARG: "ar", CHL: "cl",
    PER: "pe", SAU: "sa", QAT: "qa", KWT: "kw", EGY: "eg",
};
function faireCountryToMedusa(faireCode) {
    if (!faireCode)
        return "us";
    // If already 2-letter, just lowercase
    if (faireCode.length === 2)
        return faireCode.toLowerCase();
    // Look up in map
    const upper = faireCode.toUpperCase();
    return COUNTRY_CODE_3_TO_2[upper] || faireCode.substring(0, 2).toLowerCase();
}
/**
 * Step 1: Fetch new orders from Faire that haven't been imported yet.
 */
const fetchNewFaireOrdersStep = (0, workflows_sdk_1.createStep)("fetch-new-faire-orders", async (_, { container }) => {
    const faireService = container.resolve(faire_1.FAIRE_MODULE);
    const query = container.resolve("query");
    // Fetch orders with state=NEW from Faire
    const faireOrders = await faireService.getFaireOrders(["NEW"]);
    if (!faireOrders.length) {
        return new workflows_sdk_1.StepResponse({ orders: [], skipped: 0 });
    }
    // Check which orders have already been imported by looking at existing orders
    // with faire_order_id in metadata
    const { data: existingOrders } = await query.graph({
        entity: "order",
        fields: ["id", "metadata"],
    });
    const importedFaireIds = new Set(existingOrders
        .filter((o) => o.metadata?.faire_order_id)
        .map((o) => o.metadata.faire_order_id));
    const newOrders = faireOrders.filter((o) => !importedFaireIds.has(o.id));
    const skipped = faireOrders.length - newOrders.length;
    return new workflows_sdk_1.StepResponse({ orders: newOrders, skipped });
});
/**
 * Step 2: Create draft orders in Medusa for each new Faire order.
 * Orders are created with status "pending" (draft) for manual review.
 */
const createMedusaOrdersStep = (0, workflows_sdk_1.createStep)("create-medusa-orders-from-faire", async (input, { container }) => {
    const query = container.resolve("query");
    const logger = container.resolve("logger");
    let created = 0;
    let errors = 0;
    // Get a default region for orders (needed by Medusa)
    const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "currency_code"],
    });
    const usdRegion = regions.find((r) => r.currency_code === "usd");
    if (!usdRegion) {
        logger.error("[Faire Orders] No USD region found. Cannot create orders.");
        return new workflows_sdk_1.StepResponse({
            created: 0,
            errors: input.orders.length,
            skipped: input.skipped,
        });
    }
    // Get a default sales channel
    const { data: salesChannels } = await query.graph({
        entity: "sales_channel",
        fields: ["id"],
    });
    const defaultSalesChannel = salesChannels[0];
    for (const faireOrder of input.orders) {
        try {
            // Fetch retailer info from Faire for customer details
            const faireService = container.resolve(faire_1.FAIRE_MODULE);
            const retailer = await faireService.getFaireRetailer(faireOrder.retailer_id);
            // Map Faire order items to Medusa line items
            // Look up variant by SKU
            const lineItems = [];
            for (const item of faireOrder.items) {
                // Try to find the Medusa variant by SKU
                const { data: variants } = await query.graph({
                    entity: "product_variant",
                    fields: ["id", "title"],
                    filters: { sku: item.sku },
                });
                const variantId = variants[0]?.id;
                lineItems.push({
                    title: item.product_name + (item.variant_name ? ` - ${item.variant_name}` : ""),
                    quantity: item.quantity,
                    unit_price: item.price.amount_minor, // Faire V2: price.amount_minor (cents), Medusa V2: smallest unit (cents)
                    ...(variantId ? { variant_id: variantId } : {}),
                });
            }
            // Parse Faire address into Medusa shipping address
            const nameParts = (faireOrder.address?.name || "Customer").split(" ");
            const shippingAddress = {
                first_name: nameParts[0] || "Faire",
                last_name: nameParts.slice(1).join(" ") || "Customer",
                address_1: faireOrder.address?.address1 || "",
                address_2: faireOrder.address?.address2 || "",
                city: faireOrder.address?.city || "",
                province: faireOrder.address?.state_code || faireOrder.address?.state || "",
                postal_code: faireOrder.address?.postal_code || "",
                country_code: faireCountryToMedusa(faireOrder.address?.country_code || "US"),
                phone: faireOrder.address?.phone_number || "",
                company: faireOrder.address?.company_name || "",
            };
            // Create the order using Medusa's createOrderWorkflow
            const { result: order } = await (0, core_flows_1.createOrderWorkflow)(container).run({
                input: {
                    region_id: usdRegion.id,
                    email: retailer?.email || `faire-${faireOrder.retailer_id}@faire-orders.local`,
                    status: "pending",
                    items: lineItems,
                    shipping_address: shippingAddress,
                    ...(defaultSalesChannel
                        ? { sales_channel_id: defaultSalesChannel.id }
                        : {}),
                    metadata: {
                        faire_order_id: faireOrder.id,
                        faire_display_id: faireOrder.display_id,
                        faire_retailer_id: faireOrder.retailer_id,
                        faire_retailer_name: retailer?.name || faireOrder.address?.company_name || "",
                        faire_source: faireOrder.source || "MARKETPLACE",
                        faire_notes: faireOrder.notes || "",
                        faire_purchase_order_number: faireOrder.purchase_order_number || "",
                    },
                },
            });
            logger.info(`[Faire Orders] Created draft order ${order.id} from Faire order ${faireOrder.id}`);
            created++;
        }
        catch (err) {
            logger.error(`[Faire Orders] Failed to create order from Faire ${faireOrder.id}: ${err.message}`);
            errors++;
        }
    }
    return new workflows_sdk_1.StepResponse({
        created,
        errors,
        skipped: input.skipped,
    });
});
/**
 * Workflow: Import orders from Faire into Medusa as draft orders.
 * - Fetches NEW orders from Faire API
 * - Skips orders already imported (by faire_order_id in metadata)
 * - Creates draft orders in Medusa for manual review
 */
exports.syncFaireOrdersWorkflow = (0, workflows_sdk_1.createWorkflow)({ name: "sync-faire-orders" }, function () {
    const data = fetchNewFaireOrdersStep();
    const result = createMedusaOrdersStep(data);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy1mYWlyZS1vcmRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3N5bmMtZmFpcmUtb3JkZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFFQUswQztBQUUxQyw0REFBaUU7QUFFakUsNENBQStDO0FBRy9DOzs7O0dBSUc7QUFDSCxNQUFNLG1CQUFtQixHQUEyQjtJQUNoRCxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJO0lBQ3JELEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUk7SUFDckQsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSTtJQUNyRCxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJO0lBQ3JELEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUk7SUFDckQsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSTtJQUNyRCxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVB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