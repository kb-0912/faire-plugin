"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/utils");
const axios_1 = __importDefault(require("axios"));
const faire_setting_1 = __importDefault(require("./models/faire-setting"));
class FaireModuleService extends (0, utils_1.MedusaService)({ FaireSetting: faire_setting_1.default }) {
    constructor(container, options) {
        super(container);
        this.faireApiUrl = "https://www.faire.com/external-api/v2";
        this.faire_api_key = options.faire_api_key;
        this.defaultWholesalePercent = options.wholesale_price_percentage ?? 50;
        this.client = this.createFaireClient();
    }
    // =============================================
    // SETTINGS (DATABASE-BACKED)
    // =============================================
    /**
     * Get or create the singleton settings row.
     */
    async getOrCreateSettings() {
        const [existing] = await this.listFaireSettings({}, { take: 1 });
        if (existing)
            return existing;
        return await this.createFaireSettings({
            wholesale_price_percentage: this.defaultWholesalePercent,
        });
    }
    /**
     * Get the configured wholesale price percentage from the database.
     */
    async getWholesalePercent() {
        const settings = await this.getOrCreateSettings();
        return settings.wholesale_price_percentage;
    }
    /**
     * Update wholesale price percentage and persist to database.
     */
    async setWholesalePercent(percent) {
        const clamped = Math.max(1, Math.min(100, percent));
        const settings = await this.getOrCreateSettings();
        const updated = await this.updateFaireSettings({
            id: settings.id,
            wholesale_price_percentage: clamped,
        });
        return updated.wholesale_price_percentage;
    }
    // =============================================
    // PRODUCTS
    // =============================================
    /**
     * Create a product on Faire from a Medusa product.
     * Maps Medusa options dynamically and uses configurable wholesale pricing.
     */
    async createFaireProduct(product, wholesalePercent = 50) {
        const lifecycleState = this.mapLifecycleState(product.status);
        const images = this.buildProductImages(product);
        const variantOptionSets = this.buildVariantOptionSets(product);
        const faireProduct = {
            idempotence_token: product.id,
            name: product.title,
            description: product.description || "",
            lifecycle_state: lifecycleState,
            unit_multiplier: 1,
            minimum_order_quantity: 0,
            per_style_minimum_order_quantity: 0,
            images,
            variant_option_sets: variantOptionSets,
            variants: product.variants.map((variant) => this.buildFaireVariant(variant, product, wholesalePercent, images)),
            preorderable: false,
        };
        try {
            const response = await this.client.post(`${this.faireApiUrl}/products`, faireProduct);
            return response.data;
        }
        catch (error) {
            this.logApiError("createFaireProduct", error);
            throw new Error(`Failed to create product "${product.title}": ${error.message}`);
        }
    }
    /**
     * Update an existing product on Faire.
     * Only sends changed fields.
     */
    async updateFaireProduct(faireProductId, product, wholesalePercent = 50) {
        const lifecycleState = this.mapLifecycleState(product.status);
        const images = this.buildProductImages(product);
        const payload = {
            name: product.title,
            description: product.description || "",
            lifecycle_state: lifecycleState,
            images,
            variants: product.variants.map((variant) => {
                const built = this.buildFaireVariant(variant, product, wholesalePercent, images);
                // Look up Faire variant ID from the product-level faire_variant_map
                // (stored as JSON string: { "medusa_variant_id": "faire_variant_id" })
                const variantMap = product.metadata?.faire_variant_map
                    ? JSON.parse(product.metadata.faire_variant_map)
                    : {};
                if (variantMap[variant.id]) {
                    built.id = variantMap[variant.id];
                }
                return built;
            }),
        };
        try {
            const response = await this.client.patch(`${this.faireApiUrl}/products/${faireProductId}`, payload);
            return response.data;
        }
        catch (error) {
            this.logApiError("updateFaireProduct", error);
            throw new Error(`Failed to update product "${faireProductId}": ${error.message}`);
        }
    }
    /**
     * Delete a product from Faire.
     */
    async deleteFaireProduct(faireProductId) {
        try {
            await this.client.delete(`${this.faireApiUrl}/products/${faireProductId}`);
        }
        catch (error) {
            this.logApiError("deleteFaireProduct", error);
            throw new Error(`Failed to delete product "${faireProductId}": ${error.message}`);
        }
    }
    /**
     * Get all products from Faire (paginated).
     * Used for duplicate detection via idempotence_token matching.
     */
    async getFaireProducts() {
        const allProducts = [];
        let cursor;
        try {
            do {
                const params = { limit: 50 };
                if (cursor)
                    params.cursor = cursor;
                const response = await this.client.get(`${this.faireApiUrl}/products`, { params });
                const data = response.data;
                allProducts.push(...data.products);
                cursor = data.cursor;
            } while (cursor);
            return allProducts;
        }
        catch (error) {
            this.logApiError("getFaireProducts", error);
            throw new Error(`Failed to fetch products from Faire: ${error.message}`);
        }
    }
    // =============================================
    // INVENTORY
    // =============================================
    /**
     * Update inventory levels on Faire by SKUs.
     * Uses the v2 endpoint with on_hand_quantity field.
     */
    async updateFaireInventoryBySku(sku, onHandQuantity) {
        if (!sku) {
            throw new Error("Invalid SKU: must be a non-empty string");
        }
        const adjustedQuantity = Math.max(0, Math.floor(onHandQuantity));
        try {
            const payload = {
                inventories: [
                    {
                        sku,
                        on_hand_quantity: adjustedQuantity,
                    },
                ],
            };
            const response = await this.client.patch(`${this.faireApiUrl}/product-inventory/by-skus`, payload);
            return response.data;
        }
        catch (error) {
            this.logApiError("updateFaireInventoryBySku", error);
            throw new Error(`Failed to update inventory for SKU "${sku}": ${error.message}`);
        }
    }
    // =============================================
    // ORDERS
    // =============================================
    /**
     * Fetch orders from Faire, optionally filtered by state.
     * Fetches all pages using cursor pagination.
     */
    async getFaireOrders(states) {
        const allOrders = [];
        let cursor;
        try {
            do {
                const params = { limit: 50 };
                if (cursor)
                    params.cursor = cursor;
                if (states?.length)
                    params.states = states.join(",");
                const response = await this.client.get(`${this.faireApiUrl}/orders`, { params });
                const data = response.data;
                allOrders.push(...data.orders);
                cursor = data.cursor;
            } while (cursor);
            return allOrders;
        }
        catch (error) {
            this.logApiError("getFaireOrders", error);
            throw new Error(`Failed to fetch orders from Faire: ${error.message}`);
        }
    }
    /**
     * Accept an order on Faire (move to PROCESSING state).
     */
    async acceptFaireOrder(orderId) {
        try {
            const response = await this.client.put(`${this.faireApiUrl}/orders/${orderId}/processing`);
            return response.data;
        }
        catch (error) {
            this.logApiError("acceptFaireOrder", error);
            throw new Error(`Failed to accept order "${orderId}": ${error.message}`);
        }
    }
    /**
     * Get retailer public profile from Faire.
     * Used to enrich imported orders with retailer name/company.
     */
    async getFaireRetailer(retailerId) {
        try {
            const response = await this.client.get(`${this.faireApiUrl}/retailers/public/${retailerId}`);
            return response.data;
        }
        catch (error) {
            this.logApiError("getFaireRetailer", error);
            // Non-critical: return null if retailer lookup fails
            return null;
        }
    }
    // =============================================
    // PRIVATE HELPERS
    // =============================================
    /**
     * Map Medusa product status to Faire lifecycle_state.
     */
    mapLifecycleState(status) {
        const map = {
            published: "PUBLISHED",
            draft: "DRAFT",
            proposed: "DRAFT",
            rejected: "UNPUBLISHED",
        };
        return map[status] || "DRAFT";
    }
    /**
     * Build the images array for Faire.
     * Puts thumbnail first, then remaining images.
     */
    buildProductImages(product) {
        const allImages = product.images ?? [];
        return [
            ...(product.thumbnail ? [{ url: product.thumbnail }] : []),
            ...allImages
                .filter((img) => img.url !== product.thumbnail)
                .map((img) => ({ url: img.url })),
        ];
    }
    /**
     * Build variant_option_sets from Medusa product options dynamically.
     * No more hardcoding "Size" — reads actual option titles and values.
     */
    buildVariantOptionSets(product) {
        // If product has options defined, use them
        if (product.options?.length) {
            return product.options.map((option) => ({
                name: option.title,
                values: option.values?.map((v) => v.value) ?? [],
            }));
        }
        // Fallback: derive option sets from variant titles
        // (for products without explicit options)
        const uniqueTitles = [
            ...new Set(product.variants.map((v) => v.title)),
        ];
        if (uniqueTitles.length > 0 && uniqueTitles[0] !== "Default") {
            return [
                {
                    name: "Variant",
                    values: uniqueTitles,
                },
            ];
        }
        return [];
    }
    /**
     * Build a single Faire variant from a Medusa variant.
     * - Reads dynamic options from variant.options
     * - Medusa V2 prices are already in smallest unit (cents), no multiplication needed
     * - Wholesale price = retail_price × wholesalePercent / 100
     */
    buildFaireVariant(variant, product, wholesalePercent, fallbackImages) {
        // Get the USD price from variant prices
        const usdPrice = variant.prices?.find((p) => p.currency_code === "usd") ?? variant.prices?.[0];
        const retailPriceCents = usdPrice?.amount ?? 0;
        const wholesalePriceCents = Math.round(retailPriceCents * (wholesalePercent / 100));
        const currencyCode = (usdPrice?.currency_code || "usd").toUpperCase();
        // Build options dynamically from variant.options
        const options = this.buildVariantOptions(variant, product);
        return {
            idempotence_token: variant.id,
            name: variant.title,
            sku: variant.sku || undefined,
            available_quantity: variant.inventory_quantity ?? 0,
            images: fallbackImages,
            options,
            // V2 prices format with geo_constraint
            prices: [
                {
                    geo_constraint: { country: currencyCode === "USD" ? "USA" : currencyCode === "CAD" ? "CAN" : "USA" },
                    wholesale_price: { amount_minor: wholesalePriceCents, currency: currencyCode },
                    retail_price: { amount_minor: retailPriceCents, currency: currencyCode },
                },
            ],
        };
    }
    /**
     * Build Faire variant options from Medusa variant options.
     */
    buildVariantOptions(variant, product) {
        // If variant has explicit options (Medusa v2 structure)
        if (variant.options?.length) {
            return variant.options.map((opt) => ({
                name: opt.option?.title ?? opt.name ?? "Option",
                value: opt.option_value?.value ?? opt.value ?? variant.title,
            }));
        }
        // Fallback: use product options and variant title
        if (product.options?.length) {
            return product.options.map((option) => ({
                name: option.title,
                value: variant.title,
            }));
        }
        return [];
    }
    /**
     * Log API errors with full context.
     */
    logApiError(method, error) {
        const message = error.response
            ? `[Faire ${method}] API error ${error.response.status}: ${JSON.stringify(error.response.data)}`
            : `[Faire ${method}] Network error: ${error.message}`;
        console.error(message);
    }
    /**
     * Create the axios client for Faire API.
     */
    createFaireClient() {
        return axios_1.default.create({
            baseURL: this.faireApiUrl,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
                "X-FAIRE-ACCESS-TOKEN": this.faire_api_key,
            },
            validateStatus: (status) => status >= 200 && status < 300,
        });
    }
}
exports.default = FaireModuleService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2ZhaXJlL3NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwyQ0FBK0M7QUFDL0Msa0RBQTRDO0FBUTVDLDJFQUFpRDtBQUVqRCxNQUFNLGtCQUFtQixTQUFRLElBQUEscUJBQWEsRUFBQyxFQUFFLFlBQVksRUFBWix1QkFBWSxFQUFFLENBQUM7SUFNOUQsWUFBWSxTQUFjLEVBQUUsT0FBMkI7UUFDckQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsdUNBQXVDLENBQUE7UUFDMUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBO1FBQzFDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxPQUFPLENBQUMsMEJBQTBCLElBQUksRUFBRSxDQUFBO1FBQ3ZFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCw2QkFBNkI7SUFDN0IsZ0RBQWdEO0lBRWhEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLG1CQUFtQjtRQUMvQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEUsSUFBSSxRQUFRO1lBQUUsT0FBTyxRQUFRLENBQUE7UUFFN0IsT0FBTyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztZQUNwQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1NBQ3pELENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxtQkFBbUI7UUFDOUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLEVBQUUs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