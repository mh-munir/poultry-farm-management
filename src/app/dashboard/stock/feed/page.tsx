import { StockManagement, type StockItem } from '@/components/dashboard/stock/stock-management';
import { getStockItemsByType, getFeedStockCompanyNames } from '@/features/stock/actions';
import { cookies } from 'next/headers';
import { PurchaseToast } from '@/components/dashboard/stock/purchase-toast';
import { type ComboboxOption } from '@/components/ui/combobox';

export default async function FeedPage() {
  const [feedItems, companies] = await Promise.all([
    getStockItemsByType('FEED'),
    getFeedStockCompanyNames()
  ]);

  const companyNames: ComboboxOption[] = companies.map((company) => ({
    value: company.name,
    label: company.name
  }));

  const initialItems: StockItem[] = feedItems.map((item) => {
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

  const cookiesStore = await cookies();
  const purchaseSuccess = cookiesStore.get('purchaseSuccess')?.value;

  return (
    <>
      <PurchaseToast initialSuccess={purchaseSuccess} />
      <StockManagement
        title="Feed"
        description="Manage feed stock with quantity and pricing."
        initialItems={initialItems}
        availableProducts={initialItems}
        suppliers={companies}
        companyNames={companyNames}
        useCompanySearch
        addButtonLabel="Add Feed Stock"
        redirectPath="/dashboard/stock/feed"
      />
    </>
  );
}
