import { Container, Heading, Button, toast, Text, Badge, Input, Label } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { sdk } from "../../lib/sdk"
import { useState, useEffect } from "react"

type SyncResult = {
  created?: number
  updated?: number
  errors?: number
  skipped?: number
  message?: string
}

type SettingsResponse = {
  wholesale_price_percentage: number
}

const FairePage = () => {
  const [productResult, setProductResult] = useState<SyncResult | null>(null)
  const [orderResult, setOrderResult] = useState<SyncResult | null>(null)
  const [wholesalePercent, setWholesalePercent] = useState<number>(50)
  const [wholesaleDirty, setWholesaleDirty] = useState(false)
  const queryClient = useQueryClient()

  // Load current settings
  const { data: settings } = useQuery({
    queryKey: ["faire-settings"],
    queryFn: () =>
      sdk.client.fetch("/admin/faire/settings", {
        method: "GET",
      }) as Promise<SettingsResponse>,
  })

  useEffect(() => {
    if (settings?.wholesale_price_percentage !== undefined) {
      setWholesalePercent(settings.wholesale_price_percentage)
      setWholesaleDirty(false)
    }
  }, [settings])

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: (percent: number) =>
      sdk.client.fetch("/admin/faire/settings", {
        method: "POST",
        body: { wholesale_price_percentage: percent },
      }) as Promise<SettingsResponse>,
    onSuccess: (data) => {
      setWholesalePercent(data.wholesale_price_percentage)
      setWholesaleDirty(false)
      queryClient.invalidateQueries({ queryKey: ["faire-settings"] })
      toast.success("Wholesale price setting saved")
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to save settings")
    },
  })

  // Product sync mutation
  const productSync = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/faire/sync", {
        method: "POST",
      }) as Promise<SyncResult>,
    onSuccess: (data) => {
      setProductResult(data)
      toast.success("Product sync to Faire complete")
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to sync products to Faire")
    },
  })

  // Order sync mutation
  const orderSync = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/faire/orders", {
        method: "POST",
      }) as Promise<SyncResult>,
    onSuccess: (data) => {
      setOrderResult(data)
      toast.success("Faire order import complete")
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to import orders from Faire")
    },
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Settings Section */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Wholesale Pricing</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Set the wholesale price as a percentage of the retail price. This applies
              when syncing products to Faire.
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="wholesale-percent" className="whitespace-nowrap">
              Wholesale %
            </Label>
            <Input
              id="wholesale-percent"
              type="number"
              min={1}
              max={100}
              value={wholesalePercent}
              onChange={(e) => {
                setWholesalePercent(Number(e.target.value))
                setWholesaleDirty(true)
              }}
              className="w-24"
            />
            <Text size="small" className="text-ui-fg-subtle whitespace-nowrap">
              of retail price
            </Text>
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={() => saveSettings.mutate(wholesalePercent)}
            isLoading={saveSettings.isPending}
            disabled={!wholesaleDirty}
          >
            Save
          </Button>
          {!wholesaleDirty && settings && (
            <Badge color="green">Active: {settings.wholesale_price_percentage}%</Badge>
          )}
        </div>
      </Container>

      {/* Product Sync Section */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Product Sync</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Sync products from Medusa to Faire. New products will be created, existing ones updated.
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <Button
            variant="primary"
            onClick={() => productSync.mutate()}
            isLoading={productSync.isPending}
          >
            Sync Products to Faire
          </Button>

          {productResult && (
            <div className="flex items-center gap-2">
              {(productResult.created ?? 0) > 0 && (
                <Badge color="green">
                  {productResult.created} created
                </Badge>
              )}
              {(productResult.updated ?? 0) > 0 && (
                <Badge color="blue">
                  {productResult.updated} updated
                </Badge>
              )}
              {(productResult.errors ?? 0) > 0 && (
                <Badge color="red">
                  {productResult.errors} errors
                </Badge>
              )}
              {(productResult.created ?? 0) === 0 &&
                (productResult.updated ?? 0) === 0 &&
                (productResult.errors ?? 0) === 0 && (
                  <Badge color="grey">All products up to date</Badge>
                )}
            </div>
          )}
        </div>
      </Container>

      {/* Order Import Section */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Order Import</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Import new orders from Faire as draft orders in Medusa. Orders are polled
              automatically every 5 minutes, or you can trigger manually.
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <Button
            variant="secondary"
            onClick={() => orderSync.mutate()}
            isLoading={orderSync.isPending}
          >
            Import Orders from Faire
          </Button>

          {orderResult && (
            <div className="flex items-center gap-2">
              {(orderResult.created ?? 0) > 0 && (
                <Badge color="green">
                  {orderResult.created} imported
                </Badge>
              )}
              {(orderResult.skipped ?? 0) > 0 && (
                <Badge color="grey">
                  {orderResult.skipped} skipped
                </Badge>
              )}
              {(orderResult.errors ?? 0) > 0 && (
                <Badge color="red">
                  {orderResult.errors} errors
                </Badge>
              )}
              {(orderResult.created ?? 0) === 0 &&
                (orderResult.skipped ?? 0) === 0 &&
                (orderResult.errors ?? 0) === 0 && (
                  <Badge color="grey">No new orders</Badge>
                )}
            </div>
          )}
        </div>
      </Container>

      {/* Info Section */}
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">How it works</Heading>
          <div className="mt-3 space-y-2">
            <Text size="small" className="text-ui-fg-subtle">
              <strong>Products:</strong> New Medusa products are created on Faire. Existing synced
              products are updated (name, description, status, images, prices). Product options
              are mapped dynamically.
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              <strong>Pricing:</strong> Wholesale price = Retail price × Wholesale %. Prices use
              the Faire V2 format with currency support.
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              <strong>Lifecycle:</strong> Published → Faire PUBLISHED. Draft → Faire DRAFT.
              Deleted → Removed from Faire.
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              <strong>Inventory:</strong> Stock changes in Medusa are automatically synced to Faire
              in real-time via event subscribers.
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              <strong>Orders:</strong> New Faire orders are polled every 5 minutes and created as
              draft orders in Medusa for your review. Already imported orders are skipped.
            </Text>
          </div>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Faire",
})

export default FairePage