import { MedusaService } from "@medusajs/utils"
import axios, { AxiosInstance } from "axios"
import {
  FaireProduct,
  FaireProductsResponse,
  FaireOrder,
  FaireOrdersResponse,
  FaireModuleOptions,
} from "./types"
import FaireSetting from "./models/faire-setting"

class FaireModuleService extends MedusaService({ FaireSetting }) {
  private client: AxiosInstance
  private faire_api_key: string
  private faire_app_credentials?: string
  private faireApiUrl: string
  private defaultWholesalePercent: number

  constructor(container: any, options: FaireModuleOptions) {
    super(container)
    this.faireApiUrl = "https://www.faire.com/external-api/v2"
    this.faire_api_key = options.faire_api_key
    this.faire_app_credentials = options.faire_app_credentials
    this.defaultWholesalePercent = options.wholesale_price_percentage ?? 50
    this.client = this.createFaireClient()
  }

  // =============================================
  // SETTINGS (DATABASE-BACKED)
  // =============================================

  /**
   * Get or create the singleton settings row.
   */
  private async getOrCreateSettings(): Promise<any> {
    const [existing] = await this.listFaireSettings({}, { take: 1 })
    if (existing) return existing

    return await this.createFaireSettings({
      wholesale_price_percentage: this.defaultWholesalePercent,
    })
  }

  /**
   * Get the configured wholesale price percentage from the database.
   */
  public async getWholesalePercent(): Promise<number> {
    const settings = await this.getOrCreateSettings()
    return settings.wholesale_price_percentage
  }

  /**
   * Update wholesale price percentage and persist to database.
   */
  public async setWholesalePercent(percent: number): Promise<number> {
    const clamped = Math.max(1, Math.min(100, percent))
    const settings = await this.getOrCreateSettings()

    const updated = await this.updateFaireSettings({
      id: settings.id,
      wholesale_price_percentage: clamped,
    })

    return updated.wholesale_price_percentage
  }

  // =============================================
  // PRODUCTS
  // =============================================

  /**
   * Create a product on Faire from a Medusa product.
   * Maps Medusa options dynamically and uses configurable wholesale pricing.
   */
  public async createFaireProduct(
    product: any,
    wholesalePercent: number = 50
  ): Promise<FaireProduct> {
    const lifecycleState = this.mapLifecycleState(product.status)
    const images = this.buildProductImages(product)
    const variantOptionSets = this.buildVariantOptionSets(product)

    const faireProduct: any = {
      idempotence_token: product.id,
      name: product.title,
      description: product.description || "",
      lifecycle_state: lifecycleState,
      unit_multiplier: 1,
      minimum_order_quantity: 0,
      per_style_minimum_order_quantity: 0,
      images,
      variant_option_sets: variantOptionSets,
      variants: product.variants.map((variant: any) =>
        this.buildFaireVariant(variant, product, wholesalePercent, images)
      ),
      preorderable: false,
    }

    try {
      const response = await this.client.post(
        `${this.faireApiUrl}/products`,
        faireProduct
      )
      return response.data as FaireProduct
    } catch (error: any) {
      this.logApiError("createFaireProduct", error)
      throw new Error(
        `Failed to create product "${product.title}": ${error.message}`
      )
    }
  }

  /**
   * Update an existing product on Faire.
   * Only sends changed fields.
   */
  public async updateFaireProduct(
    faireProductId: string,
    product: any,
    wholesalePercent: number = 50
  ): Promise<FaireProduct> {
    const lifecycleState = this.mapLifecycleState(product.status)
    const images = this.buildProductImages(product)

    const payload: any = {
      name: product.title,
      description: product.description || "",
      lifecycle_state: lifecycleState,
      images,
      variants: product.variants.map((variant: any) => {
        const built = this.buildFaireVariant(
          variant,
          product,
          wholesalePercent,
          images
        )
        // Look up Faire variant ID from the product-level faire_variant_map
        // (stored as JSON string: { "medusa_variant_id": "faire_variant_id" })
        const variantMap = product.metadata?.faire_variant_map
          ? JSON.parse(product.metadata.faire_variant_map)
          : {}
        if (variantMap[variant.id]) {
          built.id = variantMap[variant.id]
        }
        return built
      }),
    }

    try {
      const response = await this.client.patch(
        `${this.faireApiUrl}/products/${faireProductId}`,
        payload
      )
      return response.data as FaireProduct
    } catch (error: any) {
      this.logApiError("updateFaireProduct", error)
      throw new Error(
        `Failed to update product "${faireProductId}": ${error.message}`
      )
    }
  }

  /**
   * Delete a product from Faire.
   */
  public async deleteFaireProduct(faireProductId: string): Promise<void> {
    try {
      await this.client.delete(
        `${this.faireApiUrl}/products/${faireProductId}`
      )
    } catch (error: any) {
      this.logApiError("deleteFaireProduct", error)
      throw new Error(
        `Failed to delete product "${faireProductId}": ${error.message}`
      )
    }
  }

  /**
   * Get all products from Faire (paginated).
   * Used for duplicate detection via idempotence_token matching.
   */
  public async getFaireProducts(): Promise<FaireProduct[]> {
    const allProducts: FaireProduct[] = []
    let cursor: string | undefined

    try {
      do {
        const params: any = { limit: 50 }
        if (cursor) params.cursor = cursor

        const response = await this.client.get(
          `${this.faireApiUrl}/products`,
          { params }
        )
        const data = response.data as FaireProductsResponse
        allProducts.push(...data.products)
        cursor = data.cursor
      } while (cursor)

      return allProducts
    } catch (error: any) {
      this.logApiError("getFaireProducts", error)
      throw new Error(`Failed to fetch products from Faire: ${error.message}`)
    }
  }

  // =============================================
  // INVENTORY
  // =============================================

  /**
   * Update inventory levels on Faire by SKUs.
   * Uses the v2 endpoint with on_hand_quantity field.
   */
  public async updateFaireInventoryBySku(
    sku: string,
    onHandQuantity: number
  ): Promise<any> {
    if (!sku) {
      throw new Error("Invalid SKU: must be a non-empty string")
    }

    const adjustedQuantity = Math.max(0, Math.floor(onHandQuantity))

    try {
      const payload = {
        inventories: [
          {
            sku,
            on_hand_quantity: adjustedQuantity,
          },
        ],
      }

      const response = await this.client.patch(
        `${this.faireApiUrl}/product-inventory/by-skus`,
        payload
      )
      return response.data
    } catch (error: any) {
      this.logApiError("updateFaireInventoryBySku", error)
      throw new Error(
        `Failed to update inventory for SKU "${sku}": ${error.message}`
      )
    }
  }

  /**
   * Update on-hand inventory for many SKUs at once.
   * Faire's PATCH /product-inventory/by-skus accepts a batch `inventories` array.
   * Sends in chunks to stay within request limits.
   */
  public async updateFaireInventoryBySkus(
    items: Array<{ sku: string; onHandQuantity: number }>
  ): Promise<{ updated: number; errors: number }> {
    const valid = items.filter((i) => i.sku)
    if (!valid.length) return { updated: 0, errors: 0 }

    const CHUNK = 50
    let updated = 0
    let errors = 0

    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK)
      const payload = {
        inventories: chunk.map((it) => ({
          sku: it.sku,
          on_hand_quantity: Math.max(0, Math.floor(it.onHandQuantity)),
        })),
      }

      try {
        await this.client.patch(
          `${this.faireApiUrl}/product-inventory/by-skus`,
          payload
        )
        updated += chunk.length
      } catch (error: any) {
        this.logApiError("updateFaireInventoryBySkus", error)
        errors += chunk.length
      }
    }

    return { updated, errors }
  }

  // =============================================
  // ORDERS
  // =============================================

  /**
   * Fetch orders from Faire, optionally filtered by state.
   * Fetches all pages using cursor pagination.
   *
   * NOTE: Faire's GET /orders does NOT support a `states` filter param — it only
   * supports `excluded_states`. So we filter by state client-side to avoid
   * accidentally importing non-NEW orders (PROCESSING, CANCELED, DELIVERED, ...).
   */
  public async getFaireOrders(
    states?: string[]
  ): Promise<FaireOrder[]> {
    const allOrders: FaireOrder[] = []
    let cursor: string | undefined

    try {
      do {
        const params: any = { limit: 50 }
        if (cursor) params.cursor = cursor

        const response = await this.client.get(
          `${this.faireApiUrl}/orders`,
          { params }
        )
        const data = response.data as FaireOrdersResponse
        allOrders.push(...data.orders)
        cursor = data.cursor
      } while (cursor)

      if (states?.length) {
        const wanted = new Set(states)
        return allOrders.filter((o) => wanted.has(o.state))
      }

      return allOrders
    } catch (error: any) {
      this.logApiError("getFaireOrders", error)
      throw new Error(`Failed to fetch orders from Faire: ${error.message}`)
    }
  }

  /**
   * Accept an order on Faire (move to PROCESSING state).
   */
  public async acceptFaireOrder(orderId: string): Promise<any> {
    try {
      const response = await this.client.put(
        `${this.faireApiUrl}/orders/${orderId}/processing`
      )
      return response.data
    } catch (error: any) {
      this.logApiError("acceptFaireOrder", error)
      throw new Error(
        `Failed to accept order "${orderId}": ${error.message}`
      )
    }
  }

  /**
   * Get retailer public profile from Faire.
   * Used to enrich imported orders with retailer name/company.
   */
  public async getFaireRetailer(retailerId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `${this.faireApiUrl}/retailers/public/${retailerId}`
      )
      return response.data
    } catch (error: any) {
      this.logApiError("getFaireRetailer", error)
      // Non-critical: return null if retailer lookup fails
      return null
    }
  }

  // =============================================
  // PRIVATE HELPERS
  // =============================================

  /**
   * Map Medusa product status to Faire lifecycle_state.
   */
  private mapLifecycleState(status: string): string {
    const map: Record<string, string> = {
      published: "PUBLISHED",
      draft: "DRAFT",
      proposed: "DRAFT",
      rejected: "UNPUBLISHED",
    }
    return map[status] || "DRAFT"
  }

  /**
   * Build the images array for Faire.
   * Puts thumbnail first, then remaining images.
   */
  private buildProductImages(product: any): Array<{ url: string }> {
    const allImages = product.images ?? []
    return [
      ...(product.thumbnail ? [{ url: product.thumbnail }] : []),
      ...allImages
        .filter((img: any) => img.url !== product.thumbnail)
        .map((img: any) => ({ url: img.url })),
    ]
  }

  /**
   * Build variant_option_sets from Medusa product options dynamically.
   * No more hardcoding "Size" — reads actual option titles and values.
   */
  private buildVariantOptionSets(product: any): Array<{
    name: string
    values: string[]
  }> {
    // If product has options defined, use them
    if (product.options?.length) {
      return product.options.map((option: any) => ({
        name: option.title,
        values: option.values?.map((v: any) => v.value) ?? [],
      }))
    }

    // Fallback: derive option sets from variant titles
    // (for products without explicit options)
    const uniqueTitles = [
      ...new Set(product.variants.map((v: any) => v.title)),
    ] as string[]

    if (uniqueTitles.length > 0 && uniqueTitles[0] !== "Default") {
      return [
        {
          name: "Variant",
          values: uniqueTitles,
        },
      ]
    }

    return []
  }

  /**
   * Build a single Faire variant from a Medusa variant.
   * - Reads dynamic options from variant.options
   * - Medusa V2 `prices.amount` is in MAJOR units (dollars) → convert to cents (×100)
   * - Wholesale price = retail_price × wholesalePercent / 100
   */
  private buildFaireVariant(
    variant: any,
    product: any,
    wholesalePercent: number,
    fallbackImages: Array<{ url: string }>
  ): any {
    // Get the USD price from variant prices
    const usdPrice =
      variant.prices?.find(
        (p: any) => p.currency_code === "usd"
      ) ?? variant.prices?.[0]

    // IMPORTANT: Medusa V2 stores `prices.amount` in MAJOR units (e.g. 25 = $25.00),
    // NOT in the smallest unit. Faire expects `amount_minor` in cents, so multiply by 100.
    const retailPriceMajor = usdPrice?.amount ?? 0
    const retailPriceCents = Math.round(retailPriceMajor * 100)
    const wholesalePriceCents = Math.round(
      retailPriceCents * (wholesalePercent / 100)
    )
    const currencyCode = (usdPrice?.currency_code || "usd").toUpperCase()

    // Build options dynamically from variant.options
    const options = this.buildVariantOptions(variant, product)

    // Inventory is owned by the `poll-faire-inventory` job (on_hand endpoint).
    // `variant.inventory_quantity` is unreliable via query.graph in Medusa V2, so
    // only send available_quantity when we actually have a positive value —
    // sending 0 here would wrongly mark the variant out of stock on Faire.
    const availableQty = Number(variant.inventory_quantity)

    return {
      idempotence_token: variant.id,
      name: variant.title,
      sku: variant.sku || undefined,
      ...(Number.isFinite(availableQty) && availableQty > 0
        ? { available_quantity: availableQty }
        : {}),
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
    }
  }

  /**
   * Build Faire variant options from Medusa variant options.
   */
  private buildVariantOptions(
    variant: any,
    product: any
  ): Array<{ name: string; value: string }> {
    // If variant has explicit options (Medusa v2 structure)
    if (variant.options?.length) {
      return variant.options.map((opt: any) => ({
        name: opt.option?.title ?? opt.name ?? "Option",
        value: opt.option_value?.value ?? opt.value ?? variant.title,
      }))
    }

    // Fallback: use product options and variant title
    if (product.options?.length) {
      return product.options.map((option: any) => ({
        name: option.title,
        value: variant.title,
      }))
    }

    return []
  }

  /**
   * Log API errors with full context.
   */
  private logApiError(method: string, error: any): void {
    const message = error.response
      ? `[Faire ${method}] API error ${error.response.status}: ${JSON.stringify(error.response.data)}`
      : `[Faire ${method}] Network error: ${error.message}`
    console.error(message)
  }

  /**
   * Create the axios client for Faire API.
   */
  private createFaireClient(): AxiosInstance {
    // Faire External API v2 auth:
    // - OAuth apps use `X-FAIRE-OAUTH-ACCESS-TOKEN` together with `X-FAIRE-APP-CREDENTIALS`.
    // - Legacy single-brand tokens use `X-FAIRE-ACCESS-TOKEN`.
    // If app credentials are provided we send the OAuth pair; otherwise fall back
    // to the legacy header for backward compatibility.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.faire_app_credentials) {
      headers["X-FAIRE-OAUTH-ACCESS-TOKEN"] = this.faire_api_key
      headers["X-FAIRE-APP-CREDENTIALS"] = this.faire_app_credentials
    } else {
      headers["X-FAIRE-ACCESS-TOKEN"] = this.faire_api_key
    }

    return axios.create({
      baseURL: this.faireApiUrl,
      timeout: 30000,
      headers,
      validateStatus: (status) => status >= 200 && status < 300,
    })
  }
}

export default FaireModuleService
