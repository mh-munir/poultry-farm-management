import { PartyType } from '@prisma/client';

export type PartyMemoryRecord = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  partyType: PartyType;
  taxNumber: string | null;
  creditLimit: number | null;
  openingBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
};

type PartyStoreState = {
  parties: PartyMemoryRecord[];
};

const globalState = globalThis as typeof globalThis & {
  __partyStore?: PartyStoreState;
};

function getPartyStore(): PartyStoreState {
  if (!globalState.__partyStore) {
    globalState.__partyStore = { parties: [] };
  }

  return globalState.__partyStore;
}

export function getMemoryParties() {
  return [...getPartyStore().parties].sort((a, b) => Number(b.createdAt.getTime() - a.createdAt.getTime()));
}

export function createMemoryParty(payload: Omit<PartyMemoryRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  const store = getPartyStore();
  const now = new Date();
  const party: PartyMemoryRecord = {
    id: store.parties.length > 0 ? Math.max(...store.parties.map((item) => item.id)) + 1 : 1,
    createdAt: now,
    updatedAt: now,
    ...payload
  };

  store.parties.unshift(party);
  return party;
}

export function updateMemoryParty(id: number, payload: Partial<Omit<PartyMemoryRecord, 'id' | 'createdAt'>>) {
  const store = getPartyStore();
  const index = store.parties.findIndex((party) => party.id === id);

  if (index === -1) {
    return null;
  }

  const existing = store.parties[index];
  const updated: PartyMemoryRecord = {
    ...existing,
    ...payload,
    updatedAt: new Date()
  };

  store.parties[index] = updated;
  return updated;
}

export function deleteMemoryParty(id: number) {
  const store = getPartyStore();
  const beforeLength = store.parties.length;
  store.parties = store.parties.filter((party) => party.id !== id);
  return store.parties.length !== beforeLength;
}

export function getMemoryPartyPageData({
  page,
  search,
  partyType,
  status
}: {
  page: number;
  search?: string;
  partyType?: string;
  status?: string;
}) {
  const take = 8;
  const skip = (Math.max(page, 1) - 1) * take;
  const allParties = getMemoryParties();
  const term = search?.trim().toLowerCase() ?? '';

  const filtered = allParties.filter((party) => {
    const matchesSearch = !term || [party.name, party.phone, party.email, party.taxNumber].some((value) => value?.toLowerCase().includes(term));
    const matchesType = !partyType || partyType === 'ALL' || party.partyType === partyType;
    const matchesStatus = !status || status === 'ALL' || (status === 'ACTIVE' ? party.isActive : !party.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  const paginated = filtered.slice(skip, skip + take);
  const totalPages = Math.max(1, Math.ceil(filtered.length / take));

  return {
    parties: paginated,
    total: filtered.length,
    totalPages,
    page: Math.min(page, totalPages)
  };
}

export function getMemoryPartyStats() {
  const parties = getMemoryParties();

  return {
    total: parties.length,
    active: parties.filter((party) => party.isActive).length,
    customers: parties.filter((party) => party.partyType === 'CUSTOMER').length,
    suppliers: parties.filter((party) => party.partyType === 'SUPPLIER').length
  };
}
