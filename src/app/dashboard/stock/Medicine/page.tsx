import { StockManagement, type StockItem } from '@/components/dashboard/stock/stock-management';
import { getStockItemsByType } from '@/features/stock/actions';
import { getSuppliersForPurchases } from '@/features/purchases/actions';

export default async function MedicinePage() {
  const [medicineItems, suppliers] = await Promise.all([
    getStockItemsByType('MEDICINE'),
    getSuppliersForPurchases()
  ]);

  const initialItems: StockItem[] = medicineItems.map((item) => {
    const lastTransaction = item.transactionItems[0]?.transaction;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
      buyRate: Number(item.defaultPurchasePrice ?? 0),
      salesRate: Number(item.defaultSellingPrice ?? 0),
      lastTransactionDate: lastTransaction?.transactionDate,
      companyName: lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  return (
    <StockManagement
      title="Medicine"
      description="Track medicine inventory, quantity, and pricing in one place."
      initialItems={initialItems}
      availableProducts={initialItems}
      suppliers={suppliers}
      addButtonLabel="Add Medicine Stock"
      redirectPath="/dashboard/stock/Medicine"
    />
  );
}
