import { StockManagement, type StockItem } from '@/components/dashboard/stock/stock-management';
import { getStockItemsByType, getMedicineStockCompanyNames } from '@/features/stock/actions';
import { type ComboboxOption } from '@/components/ui/combobox';

export default async function MedicinePage() {
  const [medicineItems, companies] = await Promise.all([
    getStockItemsByType('MEDICINE'),
    getMedicineStockCompanyNames()
  ]);

  const companyNames: ComboboxOption[] = companies.map((company) => ({
    value: company.name,
    label: company.name
  }));

  const initialItems: StockItem[] = medicineItems.map((item) => {
    const lastTransaction = item.transactionItems[0]?.transaction;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
      buyRate: Number(item.defaultPurchasePrice ?? 0),
      salesRate: Number(item.defaultSellingPrice ?? 0),
      productType: item.productType,
      lastTransactionDate: lastTransaction?.transactionDate,
      companyName: lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  return (
    <div className="px-2 py-4 sm:px-4 sm:py-6">
      <StockManagement
        title="Medicine"
        description="Track medicine inventory, quantity, and pricing in one place."
        initialItems={initialItems}
        availableProducts={initialItems}
        suppliers={companies}
        companyNames={companyNames}
        useCompanySearch
        addButtonLabel="Add Medicine Stock"
      />
    </div>
  );
}
