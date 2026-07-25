import { useState } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Button, Text, Badge, toast } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type SyncResponse = {
  action?: "created" | "updated"
  faire_product_id?: string
  variant_count?: number
  message?: string
}

type ResetResponse = {
  deleted?: number
  cleared?: number
  errors?: number
}

const ProductFaireWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const initialFaireId =
    (data.metadata?.faire_product_id as string | undefined) || ""

  const [faireId, setFaireId] = useState<string>(initialFaireId)

  const sync = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/faire/products/${data.id}/sync`, {
        method: "POST",
      }) as Promise<SyncResponse>,
    onSuccess: (res) => {
      if (res.faire_product_id) setFaireId(res.faire_product_id)
      toast.success(
        res.action === "created"
          ? "Product created on Faire"
          : "Product updated on Faire"
      )
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to sync product to Faire")
    },
  })

  const reset = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/faire/reset`, {
        method: "POST",
        body: { product_ids: [data.id] },
      }) as Promise<ResetResponse>,
    onSuccess: () => {
      setFaireId("")
      toast.success("Unlinked from Faire (deleted on Faire, links cleared)")
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to unlink from Faire")
    },
  })

  const isLinked = !!faireId

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Faire</Heading>
        {isLinked ? (
          <Badge color="green" size="2xsmall">
            Synced
          </Badge>
        ) : (
          <Badge color="grey" size="2xsmall">
            Not synced
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-3 px-6 py-4">
        {isLinked && (
          <div className="flex flex-col gap-1">
            <Text size="small" className="text-ui-fg-subtle">
              Faire product ID
            </Text>
            <Text size="small" className="font-mono break-all">
              {faireId}
            </Text>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => sync.mutate()}
            isLoading={sync.isPending}
          >
            {isLinked ? "Update on Faire" : "Sync to Faire"}
          </Button>

          {isLinked && (
            <Button
              variant="danger"
              size="small"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this product on Faire and clear its Faire link? The Medusa product is NOT deleted."
                  )
                ) {
                  reset.mutate()
                }
              }}
              isLoading={reset.isPending}
            >
              Unlink
            </Button>
          )}
        </div>

        <Text size="xsmall" className="text-ui-fg-muted">
          Products sync to Faire automatically on create/update. Use this to
          retry or force a sync for this product.
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductFaireWidget
