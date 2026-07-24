import Invoice from "../../components/invoice/Invoice"
import { requireUser } from '@/lib/auth'
import { prisma } from '@/server/db'

export default async function Page() {
  const session = await requireUser();

  // Try to fetch branding from the DB; fall back to user session image/name
  let company = { name: session.user.name ?? undefined, logo: session.user.image ?? undefined };
  try {
    const setting = await (prisma as any).setting.findUnique({ where: { key: 'branding' } })
    if (setting && setting.value) {
      const v = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value
      company = { name: v.name ?? company.name, logo: v.logo ?? company.logo }
    }
  } catch (err) {
    // ignore DB errors and use session fallback
  }

  const sampleInvoices = [
    {
      invoiceNumber: "52148",
      date: "02/01/2026",
      billedTo: "Dwayne Clark",
      address: "24 Dummy Street Area, Location, Lorem Ipsum, 5700x59",
      items: [
        { id: 1, description: "Lorem Ipsum Dolor", price: 50.0, qty: 1 },
        { id: 2, description: "Pellentesque id neque ligula", price: 20.0, qty: 3 },
        { id: 3, description: "Interdum et malesuada fames", price: 30.0, qty: 1 },
        { id: 4, description: "Vivanus volutpat faucibus", price: 90.0, qty: 1 },
      ],
    },
    {
      invoiceNumber: "52149",
      date: "03/01/2026",
      billedTo: "Agricultural Farm",
      address: "Farm Road 12, Village",
      items: [
        { id: 1, description: "Chicken Feed", price: 25.0, qty: 10 },
        { id: 2, description: "Vaccine Dose", price: 15.0, qty: 5 },
      ],
    },
  ];

  return (
    <div className="space-y-8 py-8">
      {sampleInvoices.map((inv) => (
        <div key={inv.invoiceNumber} className="bg-gray-50 p-6">
          <Invoice
            invoiceNumber={inv.invoiceNumber}
            date={inv.date}
            billedTo={inv.billedTo}
            address={inv.address}
            items={inv.items}
            company={company}
          />
        </div>
      ))}
    </div>
  )
}
