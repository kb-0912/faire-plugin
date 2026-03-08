import {
    createWorkflow,
    WorkflowResponse,
    createStep,
    StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import FaireModuleService from "../modules/faire/service"
import { FAIRE_MODULE } from "../modules/faire"
import { FaireOrder } from "../modules/faire/types"

/**
 * Convert ISO 3166-1 alpha-3 country codes (Faire) to alpha-2 (Medusa).
 * Faire uses 3-letter codes like "USA", "CAN", "GBR".
 * Medusa uses 2-letter codes like "us", "ca", "gb".
 */
const COUNTRY_CODE_3_TO_2: Record<string, string> = {
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
}

function faireCountryToMedusa(faireCode: string): string {
    if (!faireCode) return "us"
    // If already 2-letter, just lowercase
    if (faireCode.length === 2) return faireCode.toLowerCase()
    // Look up in map
    const upper = faireCode.toUpperCase()
    return COUNTRY_CODE_3_TO_2[upper] || faireCode.substring(0, 2).toLowerCase()
}

/**
 * Step 1: Fetch new orders from Faire that haven't been imported yet.
 */
const fetchNewFaireOrdersStep = createStep(
    "fetch-new-faire-orders",
    async (_, { container }) => {
        const faireService =
            container.resolve<FaireModuleService>(FAIRE_MODULE)
        const query = container.resolve("query")

        // Fetch orders with state=NEW from Faire
        const faireOrders = await faireService.getFaireOrders(["NEW"])

        if (!faireOrders.length) {
            return new StepResponse({ orders: [], skipped: 0 })
        }

        // Check which orders have already been imported by looking at existing orders
        // with faire_order_id in metadata
        const { data: existingOrders } = await query.graph({
            entity: "order",
            fields: ["id", "metadata"],
        })

        const importedFaireIds = new Set(
            existingOrders
                .filter((o: any) => o.metadata?.faire_order_id)
                .map((o: any) => o.metadata.faire_order_id)
        )

        const newOrders = faireOrders.filter(
            (o) => !importedFaireIds.has(o.id)
        )
        const skipped = faireOrders.length - newOrders.length

        return new StepResponse({ orders: newOrders, skipped })
    }
)

/**
 * Step 2: Create draft orders in Medusa for each new Faire order.
 * Orders are created with status "pending" (draft) for manual review.
 */
const createMedusaOrdersStep = createStep(
    "create-medusa-orders-from-faire",
    async (
        input: { orders: FaireOrder[]; skipped: number },
        { container }
    ) => {
        const query = container.resolve("query")
        const logger = container.resolve("logger")
        let created = 0
        let errors = 0

        // Get a default region for orders (needed by Medusa)
        const { data: regions } = await query.graph({
            entity: "region",
            fields: ["id", "currency_code"],
        })

        const usdRegion = regions.find(
            (r: any) => r.currency_code === "usd"
        )

        if (!usdRegion) {
            logger.error(
                "[Faire Orders] No USD region found. Cannot create orders."
            )
            return new StepResponse({
                created: 0,
                errors: input.orders.length,
                skipped: input.skipped,
            })
        }

        // Get a default sales channel
        const { data: salesChannels } = await query.graph({
            entity: "sales_channel",
            fields: ["id"],
        })

        const defaultSalesChannel = salesChannels[0]

        for (const faireOrder of input.orders) {
            try {
                // Fetch retailer info from Faire for customer details
                const faireService =
                    container.resolve<FaireModuleService>(FAIRE_MODULE)
                const retailer = await faireService.getFaireRetailer(
                    faireOrder.retailer_id
                )

                // Map Faire order items to Medusa line items
                // Look up variant by SKU
                const lineItems: Array<{
                    title: string
                    quantity: number
                    unit_price: number
                    variant_id?: string
                }> = []

                for (const item of faireOrder.items) {
                    // Try to find the Medusa variant by SKU
                    const { data: variants } = await query.graph({
                        entity: "product_variant",
                        fields: ["id", "title"],
                        filters: { sku: item.sku },
                    })

                    const variantId = variants[0]?.id

                    lineItems.push({
                        title: item.product_name + (item.variant_name ? ` - ${item.variant_name}` : ""),
                        quantity: item.quantity,
                        unit_price: item.price.amount_minor, // Faire V2: price.amount_minor (cents), Medusa V2: smallest unit (cents)
                        ...(variantId ? { variant_id: variantId } : {}),
                    })
                }

                // Parse Faire address into Medusa shipping address
                const nameParts = (faireOrder.address?.name || "Customer").split(" ")
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
                }

                // Create the order using Medusa's createOrderWorkflow
                const { result: order } = await createOrderWorkflow(container).run({
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
                            faire_purchase_order_number:
                                faireOrder.purchase_order_number || "",
                        },
                    },
                })

                logger.info(
                    `[Faire Orders] Created draft order ${order.id} from Faire order ${faireOrder.id}`
                )
                created++
            } catch (err: any) {
                logger.error(
                    `[Faire Orders] Failed to create order from Faire ${faireOrder.id}: ${err.message}`
                )
                errors++
            }
        }

        return new StepResponse({
            created,
            errors,
            skipped: input.skipped,
        })
    }
)

/**
 * Workflow: Import orders from Faire into Medusa as draft orders.
 * - Fetches NEW orders from Faire API
 * - Skips orders already imported (by faire_order_id in metadata)
 * - Creates draft orders in Medusa for manual review
 */
export const syncFaireOrdersWorkflow = createWorkflow(
    { name: "sync-faire-orders" },
    function () {
        const data = fetchNewFaireOrdersStep()
        const result = createMedusaOrdersStep(data)
        return new WorkflowResponse(result)
    }
)
