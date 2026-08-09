import type { Company } from '@prisma/client';

export type CompanyDTO = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  companyType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  openingBalance: string;
  openingBalanceDescription: string | null;
};

export function serializeCompany(company: Company): CompanyDTO {
  return {
    id: company.id,
    name: company.name,
    contactPerson: company.contactPerson,
    phone: company.phone,
    email: company.email,
    address: company.address,
    companyType: company.companyType,
    isActive: company.isActive,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
    createdById: company.createdById,
    openingBalance: company.openingBalance.toString(),
    openingBalanceDescription: company.openingBalanceDescription,
  };
}
