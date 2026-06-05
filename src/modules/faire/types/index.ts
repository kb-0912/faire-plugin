// ===== Plugin Options =====
export type FaireModuleOptions = {
    faire_api_key: string
    wholesale_price_percentage?: number // default 50
}

// ===== Faire API Types =====
export interface FaireImage {
    id?: string
    url: string
    width?: number
    height?: number
    sequence?: number
    tags?: string[]
}

export interface FaireOptionSet {
    name: string
    values: string[]
}

export interface FaireVariantOption {
    name: string
    value: string
}

export interface FaireVariantPrice {
    geo_constraint: { country: string }
    wholesale_price: { amount_minor: number; currency: string }
    retail_price: { amount_minor: number; currency: string }
}

export interface FaireVariant {
    id?: string
    idempotence_token?: string
    product_id?: string
    name?: string
    sku?: string
    sale_state?: string
    lifecycle_state?: string
    available_quantity?: number
    options?: FaireVariantOption[]
    images?: FaireImage[]
    wholesale_price_cents?: number
    retail_price_cents?: number
    prices?: FaireVariantPrice[]
    created_at?: string
    updated_at?: string
}

export interface FaireProduct {
    id?: string
    idempotence_token?: string
    brand_id?: string
    name?: string
    short_description?: string
    description?: string
    sale_state?: string
    lifecycle_state?: string
    unit_multiplier?: number
    minimum_order_quantity?: number
    per_style_minimum_order_quantity?: number
    variant_option_sets?: FaireOptionSet[]
    variants?: FaireVariant[]
    images?: FaireImage[]
    taxonomy_type?: { id: string; name?: string } | null
    preorderable?: boolean
    preorder_details?: any | null
    made_in_country?: string
    created_at?: string
    updated_at?: string
}

// ===== Faire Money (V2 format) =====
export interface FaireMoney {
    amount_minor: number
    currency: string
}

// ===== Faire Order Types =====
export interface FaireOrderItem {
    id: string
    order_id: string
    product_id: string
    variant_id: string
    quantity: number
    sku: string
    price: FaireMoney
    tester_price?: FaireMoney
    product_name: string
    variant_name: string
    includes_tester: boolean
    discounts?: any[]
    created_at: string
    updated_at: string
}

export interface FaireAddress {
    name: string
    address1: string
    address2?: string
    postal_code: string
    city: string
    state: string
    state_code: string
    phone_number?: string
    country: string
    country_code: string
    company_name?: string
}

export interface FaireOrder {
    id: string
    display_id: string
    created_at: string
    updated_at: string
    state: string
    items: FaireOrderItem[]
    shipments?: any[]
    address: FaireAddress
    retailer_id: string
    ship_after?: string
    payout_costs?: any
    source?: string
    purchase_order_number?: string
    notes?: string
    has_pending_retailer_cancellation_request: boolean
}

export interface FaireOrdersResponse {
    page: number
    limit: number
    cursor?: string
    orders: FaireOrder[]
}

export interface FaireProductsResponse {
    page: number
    limit: number
    cursor?: string
    products: FaireProduct[]
}

export interface FaireInventoryUpdate {
    sku: string
    on_hand_quantity: number | null
}