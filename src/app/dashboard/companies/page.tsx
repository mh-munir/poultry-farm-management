import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

export const dynamic = 'force-dynamic';
import { CompaniesOverview } from '@/components/dashboard/companies-overview';
import { DataTable } from '@/components/ui/responsive-table';
import { Pagination } from '@/components/ui/pagination';
import { AddCompanyDialog } from '@/app/dashboard/parties/add-company-dialog';
import { PayCompanyButton } from './pay-company-button';
import { CompanyToast } from '@/app/dashboard/parties/company-toast';
import { CompanySearchForm } from '@/app/dashboard/parties/company-search-form';
import { CompanyRowActions } from '@/app/dashboard/parties/company-row-actions';
import { StockManagement, type StockItem } from '@/components/dashboard/stock/stock-management';
import { AddStockModal } from '@/components/dashboard/stock/add-stock-modal';
import { type ComboboxOption } from '@/components/ui/combobox';
import { getCompanyPageData, getCompanyStats, getCompaniesByType } from '@/features/companies/actions';
import { getStockItemsByType } from '@/features/stock/actions';

const COMPANY_TYPES = ['ALL', 'FEED', 'MEDICINE', 'CHICK', 'FEED_CHICK'] as const;
const COMPANY_STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

type CompanyRow = {
  id: number;
  name: string;
  companyType: string;
  totalPurchase: number;
  totalPaid: number;
  totalDue: number;
  currentBalance: number;
  openingBalance: string;
  openingBalanceDescription: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

type CompanyOption = {
  id: number;
  name: string;
};

type SerializableDecimal = number | string | { toString(): string } | null;

type StockItemRecord = {
  id: number;
  name: string;
  unit: string | null;
  stockBalance?: { quantityOnHand?: SerializableDecimal } | null;
  defaultPurchasePrice?: SerializableDecimal;
  defaultSellingPrice?: SerializableDecimal;
  lowStockThreshold?: SerializableDecimal;
  productType?: string | null;
  transactionItems?: Array<{
    transaction?: {
      transactionDate?: Date | string | null;
      paidAmount?: SerializableDecimal;
      dueAmount?: SerializableDecimal;
      company?: { name?: string | null } | null;
      party?: { name?: string | null } | null;
    } | null;
  }>;
  company?: { id?: number; name?: string | null } | null;
};

function formatCompanyType(type: string, dict: ReturnType<typeof getDictionary>) {
  if (type === 'FEED') return dict.dashboard.feedCompany;
  if (type === 'MEDICINE') return dict.dashboard.medicineCompany;
  if (type === 'CHICK') return dict.dashboard.hatchlingChickCompany;
  if (type === 'FEED_CHICK') return dict.dashboard.feedChickCompany;
  return type.replace('_', ' ');
}

export default async function CompaniesPage({
  searchParams
}: {
  searchParams?: Promise<{
    companyPage?: string;
    companySearch?: string;
    companyType?: string;
    companyStatus?: string;
    companyError?: string;
    companySuccess?: string;
  }>;
}) {
  await requireUser();

  const cookiesStore = await cookies();
  const locale = getLocaleFromValue(cookiesStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);
  const companySuccessCookie = cookiesStore.get('companySuccess');
  const companySuccess = companySuccessCookie?.value ?? '';

  const params = await searchParams;
  const companyPage = Number(params?.companyPage ?? '1');
  const companySearch = params?.companySearch ?? '';
  const companyType = params?.companyType ?? 'ALL';
  const companyStatus = params?.companyStatus ?? 'ALL';
  const companyError = params?.companyError ?? '';

  const buildPaginationHref = (pageNumber: number) => {
    const params = new URLSearchParams({
      ...(companySearch ? { companySearch } : {}),
      ...(companyType && companyType !== 'ALL' ? { companyType } : {}),
      ...(companyStatus && companyStatus !== 'ALL' ? { companyStatus } : {})
    });
    params.set('companyPage', String(pageNumber));
    return `/dashboard/companies?${params.toString()}`;
  };

  const [companyData, companyStats, feedItems, feedCompanies, medicineItems, medicineCompanies, chickItems, chickCompanies] = await Promise.all([
    getCompanyPageData({ page: companyPage, search: companySearch, companyType, status: companyStatus }),
    getCompanyStats({ search: companySearch, companyType, status: companyStatus }),
    getStockItemsByType('FEED'),
    getCompaniesByType('FEED'),
    getStockItemsByType('MEDICINE'),
    getCompaniesByType('MEDICINE'),
    getStockItemsByType('CHICK'),
    getCompaniesByType('CHICK')
  ]);

  const feedCompanyOptions: ComboboxOption[] = feedCompanies.map((company: CompanyOption) => ({
    value: String(company.id),
    label: company.name
  }));

  const medicineCompanyOptions: ComboboxOption[] = medicineCompanies.map((company: CompanyOption) => ({
    value: String(company.id),
    label: company.name
  }));

  const chickCompanyOptions: ComboboxOption[] = chickCompanies.map((company: CompanyOption) => ({
    value: String(company.id),
    label: company.name
  }));

  const initialFeedItems: StockItem[] = feedItems.map((item: StockItemRecord) => {
    const transactionItems = item.transactionItems ?? [];
    const lastTransaction = transactionItems[0]?.transaction;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit ?? undefined,
      quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
      buyRate: Number(item.defaultPurchasePrice ?? 0),
      salesRate: Number(item.defaultSellingPrice ?? 0),
      lowStockThreshold: Number(item.lowStockThreshold ?? 0),
      productType: item.productType ?? undefined,
      companyId: item.company?.id ?? null,
      lastTransactionDate: lastTransaction?.transactionDate,
      companyName: item.company?.name ?? lastTransaction?.company?.name ?? lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  const initialMedicineItems: StockItem[] = medicineItems.map((item: StockItemRecord) => {
    const transactionItems = item.transactionItems ?? [];
    const lastTransaction = transactionItems[0]?.transaction;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit ?? undefined,
      quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
      buyRate: Number(item.defaultPurchasePrice ?? 0),
      salesRate: Number(item.defaultSellingPrice ?? 0),
      lowStockThreshold: Number(item.lowStockThreshold ?? 0),
      productType: item.productType ?? undefined,
      companyId: item.company?.id ?? null,
      lastTransactionDate: lastTransaction?.transactionDate,
      companyName: item.company?.name ?? lastTransaction?.company?.name ?? lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  const initialChickItems: StockItem[] = chickItems.map((item: StockItemRecord) => {
    const transactionItems = item.transactionItems ?? [];
    const lastTransaction = transactionItems[0]?.transaction;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit ?? undefined,
      quantity: Number(item.stockBalance?.quantityOnHand ?? 0),
      buyRate: Number(item.defaultPurchasePrice ?? 0),
      salesRate: Number(item.defaultSellingPrice ?? 0),
      lowStockThreshold: Number(item.lowStockThreshold ?? 0),
      productType: item.productType ?? undefined,
      companyId: item.company?.id ?? null,
      lastTransactionDate: lastTransaction?.transactionDate,
      companyName: item.company?.name ?? lastTransaction?.company?.name ?? lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-semibold">{dict.dashboard.manageCompanies}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.dashboard.feedAndMedicineSuppliers}</p>
      </div>

      <CompanyToast success={companySuccess} error={companyError} />

      {/* Companies Section */}
      <div className="mb-8">
        <CompaniesOverview stats={companyStats} dict={dict} />

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <AddCompanyDialog />
            <PayCompanyButton />
            <AddStockModal
              feedCompanies={feedCompanies}
              medicineCompanies={medicineCompanies}
              chickCompanies={chickCompanies}
              feedProducts={initialFeedItems}
              medicineProducts={initialMedicineItems}
              chickProducts={initialChickItems}
              paymentMethodOptions={[
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank transfer' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'MOBILE_MONEY', label: 'Mobile money' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
          </div>
          <CompanySearchForm
            search={companySearch}
            companyType={companyType}
            status={companyStatus}
          />
        </div>

        <div className="overflow-visible rounded-2xl boreder-0 sm:border bg-card shadow-sm">
          <div className="border-1 sm:border-b px-4 py-4 bg-muted/20">
            <h2 className="text-lg font-semibold">{dict.dashboard.feedCompanies}</h2>
          </div>
          <DataTable minWidth="920px">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">{dict.common.companyName}</th>
                <th className="px-4 py-3 font-medium">{dict.common.type}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.common.totalPurchase}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.common.totalPaid}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.common.totalDue}</th>
                <th className="px-4 py-3 font-medium text-right">{dict.common.balance}</th>
                <th className="px-4 py-3 font-medium">{dict.common.status}</th>
                <th className="px-4 py-3 text-right font-medium">{dict.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {companyData.companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {dict.common.noData}
                  </td>
                </tr>
              ) : (
                companyData.companies.map((company: CompanyRow) => (
                  <tr key={company.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/companies/${company.id}` as any}
                          className="font-medium text-primary hover:underline"
                        >
                          {company.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        company.companyType === 'FEED' ? 'bg-amber-100 text-amber-800' :
                        company.companyType === 'MEDICINE' ? 'bg-rose-100 text-rose-800' :
                        company.companyType === 'CHICK' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-violet-100 text-violet-800'
                      }`}>
                        {formatCompanyType(company.companyType, dict)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{company.totalPurchase.toLocaleString()} TK</td>
                    <td className="px-4 py-3 text-right">{company.totalPaid.toLocaleString()} TK</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${company.totalDue > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                        {company.totalDue.toLocaleString()} TK
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(company.currentBalance ?? 0) > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          🔴 {dict.common.payable}
                          <span className="ml-2 font-semibold">৳{Math.abs(Number(company.currentBalance ?? 0)).toLocaleString()}</span>
                        </span>
                      ) : Number(company.currentBalance ?? 0) < 0 ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          🟢 {dict.common.advance}
                          <span className="ml-2 font-semibold">৳{Math.abs(Number(company.currentBalance ?? 0)).toLocaleString()}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          ⚪ {dict.common.clear}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${company.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {company.isActive ? dict.common.active : dict.common.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CompanyRowActions
                        company={{
                          id: company.id,
                          name: company.name,
                          contactPerson: company.contactPerson ?? null,
                          phone: company.phone ?? null,
                          email: company.email ?? null,
                          address: company.address ?? null,
                          companyType: company.companyType,
                          isActive: company.isActive,
                          openingBalance: company.openingBalance,
                          openingBalanceDescription: company.openingBalanceDescription
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>

          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {dict.common.searchPlaceholder} {companyData.companies.length} / {companyData.total}
            </p>
            <Pagination
              currentPage={companyPage}
              totalPages={companyData.totalPages}
              hrefBuilder={buildPaginationHref}
              className="justify-end"
            />
          </div>
        </div>
      </div>

      {/* Feeds Section */}
      <div className="mb-8">
          <StockManagement
          title="Feed"
          description="Manage feed stock with quantity and pricing."
          initialItems={initialFeedItems}
          availableProducts={initialFeedItems}
          suppliers={feedCompanies}
          companyNames={feedCompanyOptions}
          useCompanySearch
          allowCreateCompany
          createNewLabel="Create new company: "
          addButtonLabel="Add Feed Stock"
          asSection
          showAddButton={false}
        />
      </div>

      {/* Medicines Section */}
      <div className="mb-8">
          <StockManagement
          title="Medicine"
          description="Track medicine inventory, quantity, and pricing in one place."
          initialItems={initialMedicineItems}
          availableProducts={initialMedicineItems}
          suppliers={medicineCompanies}
          companyNames={medicineCompanyOptions}
          useCompanySearch
          addButtonLabel="Add Medicine Stock"
          asSection
          showAddButton={false}
        />
      </div>

      {/* Hatchling / Chick Section */}
      <div className="mb-8">
          <StockManagement
          title="Hatchling / Chick"
          description="Manage hatchling/chick stock with quantity and pricing."
          initialItems={initialChickItems}
          availableProducts={initialChickItems}
          suppliers={chickCompanies}
          companyNames={chickCompanyOptions}
          useCompanySearch
          addButtonLabel="Add Hatchling / Chick Stock"
          asSection
          showAddButton={false}
          stockType="CHICK"
        />
      </div>
    </main>
  );
}
