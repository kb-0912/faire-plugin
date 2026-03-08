"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncProductsToFaireWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const faire_1 = require("../modules/faire");
const utils_1 = require("@medusajs/framework/utils");
/**
 * Step 1: Get all products that need sync to Faire.
 * - Products without `faire_product_id` in metadata → create
 * - Products with `faire_product_id` → update
 */
const getProductsForSyncStep = (0, workflows_sdk_1.createStep)("get-products-for-sync", async (_, { container }) => {
    const query = container.resolve("query");
    const { data: products } = await query.graph({
        entity: "product",
        fields: [
            "id",
            "title",
            "description",
            "status",
            "thumbnail",
            "images.url",
            "collection.title",
            "categories.name",
            "options.id",
            "options.title",
            "options.values.id",
            "options.values.value",
            "variants.id",
            "variants.title",
            "variants.sku",
            "variants.allow_backorder",
            "variants.manage_inventory",
            "variants.options.id",
            "variants.options.option_value.value",
            "variants.options.option.title",
            "variants.prices.currency_code",
            "variants.prices.amount",
            "variants.inventory_quantity",
            "metadata",
        ],
    });
    // Separate into new vs existing
    const toCreate = products.filter((p) => !p.metadata?.faire_product_id);
    const toUpdate = products.filter((p) => !!p.metadata?.faire_product_id);
    return new workflows_sdk_1.StepResponse({ toCreate, toUpdate });
});
/**
 * Step 2: Create new products on Faire & update existing ones.
 */
const syncProductsToFaireStep = (0, workflows_sdk_1.createStep)("sync-products-to-faire", async (input, { container }) => {
    const faireService = container.resolve(faire_1.FAIRE_MODULE);
    const productModuleService = container.resolve(utils_1.Modules.PRODUCT);
    let created = 0;
    let updated = 0;
    let errors = 0;
    const wholesalePercent = await faireService.getWholesalePercent();
    // --- Create new products ---
    for (const product of input.toCreate) {
        try {
            const faireProduct = await faireService.createFaireProduct(product, wholesalePercent);
            // Build variant ID mapping
            const faireVariantMap = {};
            if (faireProduct.variants) {
                for (const fv of faireProduct.variants) {
                    if (fv.idempotence_token && fv.id) {
                        faireVariantMap[fv.idempotence_token] = fv.id;
                    }
                }
            }
            // Store Faire product & variant IDs in metadata
            // _skip_faire_sync prevents the product.updated subscriber from
            // re-triggering an update to Faire (which was just done above)
            await productModuleService.updateProducts(product.id, {
                metadata: {
                    faire_product_id: faireProduct.id,
                    synced_to_faire: true,
                    faire_variant_map: JSON.stringify(faireVariantMap),
                    _skip_faire_sync: true,
                },
            });
            created++;
        }
        catch (err) {
            console.error(`[Faire Sync] Create error for ${product.id}:`, err.message);
            errors++;
        }
    }
    // --- Update existing products ---
    for (const product of input.toUpdate) {
        try {
            const faireProductId = product.metadata.faire_product_id;
            const faireProduct = await faireService.updateFaireProduct(faireProductId, product, wholesalePercent);
            // Update variant mapping if new variants were created
            if (faireProduct.variants) {
                const existingMap = product.metadata.faire_variant_map
                    ? JSON.parse(product.metadata.faire_variant_map)
                    : {};
                for (const fv of faireProduct.variants) {
                    if (fv.idempotence_token && fv.id) {
                        existingMap[fv.idempotence_token] = fv.id;
                    }
                }
                await productModuleService.updateProducts(product.id, {
                    metadata: {
                        faire_variant_map: JSON.stringify(existingMap),
                        _skip_faire_sync: true,
                    },
                });
            }
            updated++;
        }
        catch (err) {
            console.error(`[Faire Sync] Update error for ${product.id}:`, err.message);
            errors++;
        }
    }
    return new workflows_sdk_1.StepResponse({ created, updated, errors });
});
/**
 * Main sync workflow.
 * Creates new products and updates existing ones on Faire.
 */
exports.syncProductsToFaireWorkflow = (0, workflows_sdk_1.createWorkflow)({ name: "sync-products-to-faire" }, function () {
    const data = getProductsForSyncStep();
    const result = syncProductsToFaireStep(data);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy1wcm9kdWN0LXRvLWZhaXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9zeW5jLXByb2R1Y3QtdG8tZmFpcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSzBDO0FBRTFDLDRDQUErQztBQUMvQyxxREFBbUQ7QUFJbkQ7Ozs7R0FJRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsSUFBQSwwQkFBVSxFQUN2Qyx1QkFBdUIsRUFDdkIsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7SUFDekIsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUV4QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUMzQyxNQUFNLEVBQUUsU0FBUztRQUNqQixNQUFNLEVBQUU7WUFDTixJQUFJO1lBQ0osT0FBTztZQUNQLGFBQWE7WUFDYixRQUFRO1lBQ1IsV0FBVztZQUNYLFlBQVk7WUFDWixrQkFBa0I7WUFDbEIsaUJBQWlCO1lBQ2pCLFlBQVk7WUFDWixlQUFlO1lBQ2YsbUJBQW1CO1lBQ25CLHNCQUFzQjtZQUN0QixhQUFhO1lBQ2IsZ0JBQWdCO1lBQ2hCLGNBQWM7WUFDZCwwQkFBMEI7WUFDMUIsMkJBQTJCO1lBQzNCLHFCQUFxQjtZQUNyQixxQ0FBcUM7WUFDckMsK0JBQStCO1lBQy9CLCtCQUErQjtZQUMvQix3QkFBd0I7WUFDeEIsNkJBQTZCO1lBQzdCLFVBQVU7U0FDWDtLQUNGLENBQUMsQ0FBQTtJQUVGLGdDQUFnQztJQUNoQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUM5QixDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUMxQyxDQUFBO0lBQ0QsTUFBTSxRQUFRLEdB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