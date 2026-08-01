import Link from 'next/link';
import { Factory, Package2 } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { StatCard } from '@/components/dashboard/stat-card';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { AddCompanyDialog } from '@/app/dashboard/parties/add-company-dialog';
import { PayCompanyButton } from './pay-company-button';
import { CompanyToast } from '@/app/dashboard/parties/company-toast';
import { CompanySearchForm } from '@/app/dashboard/parties/company-search-form';
import { CompanyRowActions } from '@/app/dashboard/parties/company-row-actions';
import { StockManagement, type StockItem } from '@/components/dashboard/stock/stock-management';
import { AddStockModal } from '@/components/dashboard/stock/add-stock-modal';
import { getCompanyNames, getCompanyPageData, getCompanyStats, getCompaniesByType } from '@/features/companies/actions';
import { getStockItemsByType } from '@/features/stock/actions';
import { type ComboboxOption } from '@/components/ui/combobox';

const COMPANY_TYPES = ['ALL', 'FEED', 'MEDICINE', 'BOTH'] as const;
const COMPANY_STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

function formatCompanyType(type: string) {
  if (type === 'FEED') return 'Feed Company';
  if (type === 'MEDICINE') return 'Medicine Company';
  if (type === 'BOTH') return 'Feed & Medicine';
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
  const companySuccessCookie = cookiesStore.get('companySuccess');
  const companySuccess = companySuccessCookie?.value ?? '';

  const params = await searchParams;
  const companyPage = Number(params?.companyPage ?? '1');
  const companySearch = params?.companySearch ?? '';
  const companyType = params?.companyType ?? 'ALL';
  const companyStatus = params?.companyStatus ?? 'ALL';
  const companyError = params?.companyError ?? '';

  const [companyData, companyStats, companyOptions, feedItems, feedCompanies, medicineItems, medicineCompanies] = await Promise.all([
    getCompanyPageData({ page: companyPage, search: companySearch, companyType, status: companyStatus }),
    getCompanyStats({ search: companySearch, companyType, status: companyStatus }),
    getCompanyNames(),
    getStockItemsByType('FEED'),
    getCompaniesByType('FEED'),
    getStockItemsByType('MEDICINE'),
    getCompaniesByType('MEDICINE')
  ]);

  const feedCompanyOptions: ComboboxOption[] = feedCompanies.map((company) => ({
    value: company.name,
    label: company.name
  }));

  const medicineCompanyOptions: ComboboxOption[] = medicineCompanies.map((company) => ({
    value: company.name,
    label: company.name
  }));

  const initialFeedItems: StockItem[] = feedItems.map((item) => {
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
      companyName: lastTransaction?.company?.name ?? lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  const initialMedicineItems: StockItem[] = medicineItems.map((item) => {
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
      companyName: lastTransaction?.company?.name ?? lastTransaction?.party?.name,
      paidAmount: Number(lastTransaction?.paidAmount ?? 0),
      dueAmount: Number(lastTransaction?.dueAmount ?? 0)
    };
  });

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="mb-6">
        <h1 className="mt-2 text-3xl font-semibold">Manage companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Feed and medicine suppliers used in purchases and stock management.</p>
      </div>

      <CompanyToast success={companySuccess} error={companyError} />

      {/* Companies Section */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 flex-1">
            <StatCard title="Total Companies" value={companyStats.total} icon={Factory} accent="bg-indigo-50 text-indigo-600" />
            <StatCard title="Active Companies" value={companyStats.active} icon={Package2} accent="bg-emerald-50 text-emerald-600" />
            <StatCard title="Feed Companies" value={companyStats.feed} icon={Package2} accent="bg-amber-50 text-amber-600" />
            <StatCard title="Medicine Companies" value={companyStats.medicine} icon={Package2} accent="bg-rose-50 text-rose-600" />
            <StatCard title="Both" value={companyStats.both} icon={Package2} accent="bg-violet-50 text-violet-600" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <AddCompanyDialog />
            <PayCompanyButton />
            <AddStockModal
              feedCompanies={feedCompanies}
              medicineCompanies={medicineCompanies}
              feedProducts={initialFeedItems}
              medicineProducts={initialMedicineItems}
            />
          </div>
          <CompanySearchForm search={companySearch} companyType={companyType} status={companyStatus} />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-4 bg-muted/20">
            <h2 className="text-lg font-semibold">Feeds and Medicine Companies</h2>
          </div>
          <ResponsiveTable stickyLastColumn minWidth="920px">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Company Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Total Purchase</th>
                  <th className="px-4 py-3 font-medium text-right">Total Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Total Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {companyData.companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No companies found. Create your first company to get started.
                    </td>
                  </tr>
                ) : (
                  companyData.companies.map((company) => (
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
                          'bg-violet-100 text-violet-800'
                        }`}>
                          {formatCompanyType(company.companyType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{company.totalPurchase.toLocaleString()} TK</td>
                      <td className="px-4 py-3 text-right">{company.totalPaid.toLocaleString()} TK</td>
                      <td className="px-4 py-3 text-right">{company.totalDue.toLocaleString()} TK</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${company.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CompanyRowActions
                          company={{
                            id: company.id,
                            name: company.name,
                            contactPerson: company.contactPerson,
                            phone: company.phone,
                            email: company.email,
                            address: company.address,
                            companyType: company.companyType,
                            isActive: company.isActive
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>

          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {companyData.companies.length} of {companyData.total} companies
            </p>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: companyData.totalPages }, (_, index) => index + 1).map((pageNumber) => {
                  const params = new URLSearchParams({
                    ...(companySearch ? { companySearch } : {}),
                    ...(companyType && companyType !== 'ALL' ? { companyType } : {}),
                    ...(companyStatus && companyStatus !== 'ALL' ? { companyStatus } : {})
                  });
                  params.set('companyPage', String(pageNumber));

                  return (
                    <Link
                      key={pageNumber}
                      href={`/dashboard/companies?${params.toString()}`}
                      className={`rounded-md px-3 py-2 text-sm ${companyPage === pageNumber ? 'bg-primary text-primary-foreground' : 'border bg-background'}`}
                    >
                      {pageNumber}
                    </Link>
                  );
                })}
              </div>
            </div>
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
    </main>
  );
}
