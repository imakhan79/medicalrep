import { Package } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductForm } from "./product-form"

const LIST_LIMIT = 200

export default async function ProductsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canEdit }, { data: canExport }, { data: products, error }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "products", p_action: "edit" }),
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "products", p_action: "export" }),
    supabase.from("products").select("id, name, sku").order("name").limit(LIST_LIMIT),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle="The product catalog used across samples, orders, and visits."
      />

      {canEdit && <ProductForm orgId={orgId} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All products</CardTitle>
          {canExport && (
            <ExportCsvButton
              rows={(products ?? []).map((p) => ({ name: p.name, sku: p.sku }))}
              filename="products.csv"
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Products">
            {products?.map((p) => (
              <li key={p.id} className="p-3 flex items-center justify-between gap-4">
                <p className="font-medium">{p.name}</p>
                {p.sku && <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground shrink-0">{p.sku}</span>}
              </li>
            ))}
            {products?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No products yet.</li>}
          </ul>
          {products && products.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
