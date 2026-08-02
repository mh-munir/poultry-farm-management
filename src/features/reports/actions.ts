'use server';

import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { Prisma } from '@prisma/client';

const BANGLADESH_OFFSET = 6 * 60;

function toBangladeshTime(date: Date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + BANGLADESH_OFFSET * 60000);
}

function getStartOfDay(date: Date) {
  const bd = toBangladeshTime(date);
  bd.setHours(0, 0, 0, 0);
  return bd;
}

function getEndOfDay(date: Date) {
  const start = getStartOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return end;
}

function getStartOfMonth(date: Date) {
  const bd = toBangladeshTime(date);
  bd.setDate(1);
  bd.setHours(0, 0, 0, 0);
  return bd;
}

function getEndOfMonth(date: Date) {
  const start = getStartOfMonth(date);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
}

function getStartOfYear(date: Date) {
  const bd = toBangladeshTime(date);
  bd.setMonth(0, 1);
  bd.setHours(0, 0, 0, 0);
  return bd;
}

function getEndOfYear(date: Date) {
  const start = getStartOfYear(date);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  return end;
}

export async function getDailyReportData(date: Date) {
  await requireUser();
  const start = getStartOfDay(date);
  const end = getEndOfDay(date);

  const [
    salesAgg,
    purchaseAgg,
    costAgg,
    salesTransactions,
    purchaseTransactions,
    costTransactions,
    productTypeTotals
  ] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      _count: { _all: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: start, lt: end }
        }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
      _count: { _all: true },
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: {
        expenseDate: { gte: start, lt: end }
      }
    }),
    prisma.transaction.findMany({
      where: {
        transactionType: 'SALE',
        transactionDate: { gte: start, lt: end }
      },
      include: {
        party: { select: { name: true } },
        transactionItems: {
          include: {
            product: { select: { name: true, productType: true, unit: true } }
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    }),
    prisma.transaction.findMany({
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      },
      include: {
        party: { select: { name: true } },
        transactionItems: {
          include: {
            product: { select: { name: true, productType: true, unit: true } }
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: { gte: start, lt: end }
      },
      orderBy: { expenseDate: 'desc' }
    }),
    prisma.$queryRaw<Array<{ transactionType: string; productType: string; total: any }>>`
      SELECT tr."transactionType", p."productType", SUM(ti."lineTotal") AS "total"
      FROM "TransactionItem" ti
      JOIN "Transaction" tr ON tr.id = ti."transactionId"
      JOIN "Product" p ON p.id = ti."productId"
      WHERE tr."transactionType" IN ('SALE', 'PURCHASE')
        AND tr."transactionDate" >= ${start}
        AND tr."transactionDate" < ${end}
      GROUP BY tr."transactionType", p."productType"
    `
  ]);

  const productTypeMap = new Map(
    (productTypeTotals as Array<{ transactionType: string; productType: string; total: any }>)
      .filter((r) => r.transactionType === 'SALE')
      .map((r) => [r.productType, Number(r.total ?? 0)])
  );
  const feedSales = productTypeMap.get('FEED') ?? 0;
  const medicineSales = productTypeMap.get('MEDICINE') ?? 0;

  const purchaseTypeMap = new Map(
    (productTypeTotals as Array<{ transactionType: string; productType: string; total: any }>)
      .filter((r) => r.transactionType === 'PURCHASE')
      .map((r) => [r.productType, Number(r.total ?? 0)])
  );
  const feedPurchases = purchaseTypeMap.get('FEED') ?? 0;
  const medicinePurchases = purchaseTypeMap.get('MEDICINE') ?? 0;

  const totalSales = Number(salesAgg._sum.lineTotal ?? 0);
  const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalCost = Number(costAgg._sum.amount ?? 0);
  const netProfit = totalSales - totalPurchase - totalCost;

  return {
    date: start.toISOString().slice(0, 10),
    sales: {
      total: totalSales,
      transactions: salesTransactions,
      count: salesAgg._count._all,
      paid: Number(purchaseAgg._sum.paidAmount ?? 0),
      due: Number(purchaseAgg._sum.dueAmount ?? 0),
      feedTotal: feedSales,
      medicineTotal: medicineSales
    },
    purchases: {
      total: totalPurchase,
      transactions: purchaseTransactions,
      count: purchaseAgg._count._all,
      paid: Number(purchaseAgg._sum.paidAmount ?? 0),
      due: Number(purchaseAgg._sum.dueAmount ?? 0),
      feedTotal: feedPurchases,
      medicineTotal: medicinePurchases
    },
    costs: {
      total: totalCost,
      count: costAgg._count._all,
      transactions: costTransactions
    },
    profit: {
      gross: totalSales - totalPurchase,
      net: netProfit
    },
    transactions: [...salesTransactions, ...purchaseTransactions].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
  };
}

export async function getMonthlyReportData(year: number, month: number) {
  await requireUser();
  const date = new Date(year, month - 1, 1);
  const start = getStartOfMonth(date);
  const end = getEndOfMonth(date);

  const [salesAgg, purchaseAgg, costAgg, salesTransactions, purchaseTransactions] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      _count: { _all: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: start, lt: end }
        }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
      _count: { _all: true },
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        expenseDate: { gte: start, lt: end }
      }
    }),
    prisma.transaction.findMany({
      where: {
        transactionType: 'SALE',
        transactionDate: { gte: start, lt: end }
      },
      include: { party: { select: { name: true } } },
      orderBy: { transactionDate: 'desc' }
    }),
    prisma.transaction.findMany({
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      },
      include: { party: { select: { name: true } } },
      orderBy: { transactionDate: 'desc' }
    })
  ]);

  const totalSales = Number(salesAgg._sum.lineTotal ?? 0);
  const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalCost = Number(costAgg._sum.amount ?? 0);

  const dailyBreakdownRows = await prisma.$queryRaw<Array<{ day: Date; sales: any; purchases: any; costs: any }>>`
    WITH days AS (
      SELECT generate_series(${start}, ${end} - interval '1 day', '1 day'::interval) AS "day"
    ),
    sales AS (
      SELECT date_trunc('day', tr."transactionDate") AS "day", SUM(ti."lineTotal") AS "sales"
      FROM "TransactionItem" ti
      JOIN "Transaction" tr ON tr.id = ti."transactionId"
      WHERE tr."transactionType" = 'SALE'
        AND tr."transactionDate" >= ${start}
        AND tr."transactionDate" < ${end}
      GROUP BY 1
    ),
    purchases AS (
      SELECT date_trunc('day', "transactionDate") AS "day", SUM("totalAmount") AS "purchases"
      FROM "Transaction"
      WHERE "transactionType" = 'PURCHASE'
        AND "transactionDate" >= ${start}
        AND "transactionDate" < ${end}
      GROUP BY 1
    ),
    costs AS (
      SELECT date_trunc('day', "expenseDate") AS "day", SUM("amount") AS "costs"
      FROM "Expense"
      WHERE "expenseDate" >= ${start}
        AND "expenseDate" < ${end}
      GROUP BY 1
    )
    SELECT days."day",
      COALESCE(sales."sales", 0) AS "sales",
      COALESCE(purchases."purchases", 0) AS "purchases",
      COALESCE(costs."costs", 0) AS "costs"
    FROM days
    LEFT JOIN sales ON sales."day" = days."day"
    LEFT JOIN purchases ON purchases."day" = days."day"
    LEFT JOIN costs ON costs."day" = days."day"
    ORDER BY days."day"
  `;

  const dailyBreakdownMap = new Map((dailyBreakdownRows as Array<{ day: Date; sales: any; purchases: any; costs: any }>).map((d) => {
    const dateKey = d.day.toISOString().slice(0, 10);
    const salesVal = Number(d.sales ?? 0);
    const purchasesVal = Number(d.purchases ?? 0);
    const costsVal = Number(d.costs ?? 0);
    return [dateKey, { sales: salesVal, purchases: purchasesVal, costs: costsVal, profit: salesVal - purchasesVal - costsVal }];
  }));

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyBreakdown: Record<string, { sales: number; purchases: number; costs: number; profit: number }> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dateKey = dayDate.toISOString().slice(0, 10);
    dailyBreakdown[dateKey] = dailyBreakdownMap.get(dateKey) ?? { sales: 0, purchases: 0, costs: 0, profit: 0 };
  }

  return {
    year,
    month,
    monthLabel: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    sales: {
      total: totalSales,
      count: salesAgg._count._all,
      transactions: salesTransactions,
      feedTotal: 0,
      medicineTotal: 0
    },
    purchases: {
      total: totalPurchase,
      count: purchaseAgg._count._all,
      transactions: purchaseTransactions,
      feedTotal: 0,
      medicineTotal: 0
    },
    costs: {
      total: totalCost
    },
    profit: {
      gross: totalSales - totalPurchase,
      net: totalSales - totalPurchase - totalCost
    },
    dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
      date,
      ...data
    }))
  };
}

export async function getYearlyReportData(year: number) {
  await requireUser();
  const start = getStartOfYear(new Date(year, 0, 1));
  const end = getEndOfYear(new Date(year, 0, 1));

  const [salesAgg, purchaseAgg, costAgg] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: start, lt: end }
        }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true, paidAmount: true, dueAmount: true },
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        expenseDate: { gte: start, lt: end }
      }
    })
  ]);

  const monthlyBreakdown = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // `month` comes back as a string from $queryRaw; request string and convert below.
  const monthlyRowsRaw = await prisma.$queryRaw<Array<{ month: string; sales: any; purchases: any; costs: any }>>`
    WITH months AS (
      SELECT generate_series(${start}, ${end} - interval '1 month', '1 month'::interval) AS "month"
    ),
    sales AS (
      SELECT date_trunc('month', tr."transactionDate") AS "month", SUM(ti."lineTotal") AS "sales"
      FROM "TransactionItem" ti
      JOIN "Transaction" tr ON tr.id = ti."transactionId"
      WHERE tr."transactionType" = 'SALE'
        AND tr."transactionDate" >= ${start}
        AND tr."transactionDate" < ${end}
      GROUP BY 1
    ),
    purchases AS (
      SELECT date_trunc('month', "transactionDate") AS "month", SUM("totalAmount") AS "purchases"
      FROM "Transaction"
      WHERE "transactionType" = 'PURCHASE'
        AND "transactionDate" >= ${start}
        AND "transactionDate" < ${end}
      GROUP BY 1
    ),
    costs AS (
      SELECT date_trunc('month', "expenseDate") AS "month", SUM("amount") AS "costs"
      FROM "Expense"
      WHERE "expenseDate" >= ${start}
        AND "expenseDate" < ${end}
      GROUP BY 1
    )
    SELECT months."month",
      COALESCE(sales."sales", 0) AS "sales",
      COALESCE(purchases."purchases", 0) AS "purchases",
      COALESCE(costs."costs", 0) AS "costs"
    FROM months
    LEFT JOIN sales ON sales."month" = months."month"
    LEFT JOIN purchases ON purchases."month" = months."month"
    LEFT JOIN costs ON costs."month" = months."month"
    ORDER BY months."month"
  `;

  const monthlyRows = (monthlyRowsRaw as Array<{ month: string; sales: any; purchases: any; costs: any }>).map((m) => ({
    ...m,
    month: new Date(m.month)
  }));

  const monthlyMap = new Map((monthlyRows as Array<{ month: Date; sales: any; purchases: any; costs: any }>).map((m) => {
    const monthIndex = m.month.getMonth();
    const salesVal = Number(m.sales ?? 0);
    const purchasesVal = Number(m.purchases ?? 0);
    const costsVal = Number(m.costs ?? 0);
    return [monthIndex, { month: monthNames[monthIndex], sales: salesVal, purchases: purchasesVal, costs: costsVal, profit: salesVal - purchasesVal - costsVal }];
  }));

  for (let month = 0; month < 12; month++) {
    monthlyBreakdown.push(monthlyMap.get(month) ?? { month: monthNames[month], sales: 0, purchases: 0, costs: 0, profit: 0 });
  }

  const totalSales = Number(salesAgg._sum.lineTotal ?? 0);
  const totalPurchase = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalCost = Number(costAgg._sum.amount ?? 0);

  return {
    year,
    sales: {
      total: totalSales,
      feedTotal: 0,
      medicineTotal: 0
    },
    purchases: {
      total: totalPurchase,
      feedTotal: 0,
      medicineTotal: 0
    },
    costs: {
      total: totalCost
    },
    profit: {
      gross: totalSales - totalPurchase,
      net: totalSales - totalPurchase - totalCost
    },
    monthlyBreakdown
  };
}

export async function getSalesReportData(filters: {
  dateFrom?: Date;
  dateTo?: Date;
  partyId?: number;
  productId?: number;
  productType?: string;
}) {
  await requireUser();
  const where: any = { transactionType: 'SALE' };

  if (filters.dateFrom || filters.dateTo) {
    where.transactionDate = {};
    if (filters.dateFrom) where.transactionDate.gte = filters.dateFrom;
    if (filters.dateTo) where.transactionDate.lt = filters.dateTo;
  }

  if (filters.partyId) {
    where.partyId = filters.partyId;
  }

  if (filters.productId || filters.productType) {
    where.transactionItems = {
      some: {
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.productType ? { product: { productType: filters.productType } } : {})
      }
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      transactionDate: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      party: { select: { id: true, name: true } },
      transactionItems: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          product: { select: { id: true, name: true, productType: true, unit: true } }
        }
      }
    },
    orderBy: { transactionDate: 'desc' }
  });

  const filteredTransactions = transactions;
  const total = filteredTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const paid = filteredTransactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const due = filteredTransactions.reduce((sum, t) => sum + Number(t.dueAmount), 0);

  const items = filteredTransactions.flatMap((t) =>
    t.transactionItems.map((item) => ({
      id: item.id,
      transactionId: t.id,
      date: t.transactionDate,
      partyName: t.party?.name ?? 'Unknown',
      productName: item.product.name,
      productType: item.product.productType,
      unit: item.product.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      paid: Number(t.paidAmount),
      due: Number(t.dueAmount)
    }))
  );

  return {
    summary: {
      total,
      count: filteredTransactions.length,
      paid,
      due
    },
    items
  };
}

export async function getPurchasesReportData(filters: {
  dateFrom?: Date;
  dateTo?: Date;
  partyId?: number;
  companyId?: number;
  productId?: number;
  productType?: string;
}) {
  await requireUser();
  const where: any = { transactionType: 'PURCHASE' };

  if (filters.dateFrom || filters.dateTo) {
    where.transactionDate = {};
    if (filters.dateFrom) where.transactionDate.gte = filters.dateFrom;
    if (filters.dateTo) where.transactionDate.lt = filters.dateTo;
  }

  if (filters.partyId) {
    where.partyId = filters.partyId;
  }

  if (filters.companyId) {
    where.companyId = filters.companyId;
  }

  if (filters.productId || filters.productType) {
    where.transactionItems = {
      some: {
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.productType ? { product: { productType: filters.productType } } : {})
      }
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      id: true,
      transactionDate: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      party: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      transactionItems: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          product: { select: { id: true, name: true, productType: true, unit: true } }
        }
      }
    },
    orderBy: { transactionDate: 'desc' }
  });

  const filteredTransactions = transactions;
  const total = filteredTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const paid = filteredTransactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const due = filteredTransactions.reduce((sum, t) => sum + Number(t.dueAmount), 0);

  const items = filteredTransactions.flatMap((t) =>
    t.transactionItems.map((item) => ({
      id: item.id,
      transactionId: t.id,
      date: t.transactionDate,
      partyName: t.party?.name ?? 'Unknown',
      productName: item.product.name,
      productType: item.product.productType,
      unit: item.product.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      paid: Number(t.paidAmount),
      due: Number(t.dueAmount)
    }))
  );

  return {
    summary: {
      total,
      count: filteredTransactions.length,
      paid,
      due
    },
    items
  };
}

export async function getPartyStatementData(partyId: number) {
  await requireUser();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, name: true, partyType: true }
  });

  if (!party) {
    return { party: null, entries: [], summary: null };
  }

  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: { partyId },
      select: {
        id: true,
        transactionType: true,
        transactionDate: true,
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
        invoiceNumber: true,
        transactionItems: {
          select: {
            product: { select: { name: true, productType: true } }
          }
        }
      },
      orderBy: { transactionDate: 'asc' }
    }),
    prisma.payment.findMany({
      where: { partyId },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        paymentMethod: true,
        referenceNumber: true
      },
      orderBy: { paymentDate: 'asc' }
    })
  ]);

  const entries: any[] = [];

  for (const transaction of transactions) {
    const amount = Number(transaction.totalAmount);
    const paid = Number(transaction.paidAmount);
    const due = Number(transaction.dueAmount);

    entries.push({
      id: `txn-${transaction.id}`,
      date: transaction.transactionDate,
      type: transaction.transactionType,
      description: `Invoice ${transaction.invoiceNumber}`,
      debit: amount,
      credit: paid,
      balance: 0,
      details: transaction.transactionItems.map((item) => item.product.name).join(', ')
    });
  }

  for (const payment of payments) {
    entries.push({
      id: `pay-${payment.id}`,
      date: payment.paymentDate,
      type: 'PAYMENT',
      description: `Payment via ${payment.paymentMethod}`,
      debit: 0,
      credit: Number(payment.amount),
      balance: 0,
      details: payment.referenceNumber || ''
    });
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  for (const entry of entries) {
    balance += entry.debit - entry.credit;
    entry.balance = balance;
  }

  const summary = {
    totalSales: transactions.filter((t) => t.transactionType === 'SALE').reduce((s, t) => s + Number(t.totalAmount), 0),
    totalCustomerPayments: transactions.filter((t) => t.transactionType === 'SALE').reduce((s, t) => s + Number(t.paidAmount), 0),
    customerDue: transactions.filter((t) => t.transactionType === 'SALE').reduce((s, t) => s + Number(t.dueAmount), 0),
    totalPurchases: transactions.filter((t) => t.transactionType === 'PURCHASE').reduce((s, t) => s + Number(t.totalAmount), 0),
    totalSupplierPayments: transactions.filter((t) => t.transactionType === 'PURCHASE').reduce((s, t) => s + Number(t.paidAmount), 0),
    supplierDue: transactions.filter((t) => t.transactionType === 'PURCHASE').reduce((s, t) => s + Number(t.dueAmount), 0),
    netBalance: balance
  };

  return {
    party,
    entries,
    summary
  };
}

export async function getStockReportData(filters: { productType?: string }) {
  await requireUser();
  const where: any = { isActive: true };
  if (filters.productType) {
    where.productType = filters.productType;
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      productType: true,
      unit: true,
      lowStockThreshold: true,
      defaultPurchasePrice: true,
      stockBalance: { select: { quantityOnHand: true } }
    },
    orderBy: { name: 'asc' }
  });

  const productIds = products.map((product) => product.id);
  const movementTotals = productIds.length === 0
    ? []
    : await prisma.$queryRaw<Array<{ productId: number; totalIn: any; totalOut: any }>>`
      SELECT
        "productId",
        SUM(CASE WHEN "movementType" IN ('PURCHASE', 'OPENING', 'RETURN', 'PRODUCTION') THEN "quantity" ELSE 0 END) AS "totalIn",
        SUM(CASE WHEN "movementType" IN ('SALE', 'WASTAGE') THEN "quantity" ELSE 0 END) AS "totalOut"
      FROM "StockMovement"
      WHERE "productId" IN (${Prisma.join(productIds)})
      GROUP BY "productId"
    `;
  const movementMap = new Map(movementTotals.map((row) => [
    row.productId,
    { totalIn: Number(row.totalIn ?? 0), totalOut: Number(row.totalOut ?? 0) }
  ]));

  const items = products.map((product) => {
    const quantityOnHand = Number(product.stockBalance?.quantityOnHand ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 0);
    const totals = movementMap.get(product.id) ?? { totalIn: 0, totalOut: 0 };

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      productType: product.productType,
      unit: product.unit,
      quantityOnHand,
      totalIn: totals.totalIn,
      totalOut: totals.totalOut,
      balance: quantityOnHand,
      lowStock: threshold > 0 && quantityOnHand <= threshold,
      threshold,
      movements: []
    };
  });

  const totalValue = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.id);
    const price = Number(product?.defaultPurchasePrice ?? 0);
    return sum + item.quantityOnHand * price;
  }, 0);

  return {
    items,
    totalValue,
    lowStockCount: items.filter((item) => item.lowStock).length
  };
}

export async function getProfitLossReportData(dateFrom?: Date, dateTo?: Date) {
  await requireUser();
  const start = dateFrom ? getStartOfDay(dateFrom) : getStartOfYear(new Date());
  const end = dateTo ? getEndOfDay(dateTo) : getEndOfYear(new Date());

  const [salesAgg, purchaseAgg, costAgg] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: start, lt: end }
        }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      }
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        expenseDate: { gte: start, lt: end }
      }
    })
  ]);

  const totalSales = Number(salesAgg._sum.lineTotal ?? 0);
  const totalPurchases = Number(purchaseAgg._sum.totalAmount ?? 0);
  const totalCosts = Number(costAgg._sum.amount ?? 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalCosts;

  return {
    period: {
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10)
    },
    revenue: {
      totalSales
    },
    costs: {
      purchases: totalPurchases,
      operating: totalCosts,
      total: totalPurchases + totalCosts
    },
    profit: {
      gross: grossProfit,
      net: netProfit
    }
  };
}

export async function getReportSummary() {
  await requireUser();
  const today = new Date();
  const start = getStartOfDay(today);
  const end = getEndOfDay(today);
  const monthStart = getStartOfMonth(today);
  const monthEnd = getEndOfMonth(today);
  const yearStart = getStartOfYear(today);
  const yearEnd = getEndOfYear(today);

  const summaryRows = await prisma.$queryRaw<Array<{
    daily_sales: number | string | null;
    monthly_sales: number | string | null;
    yearly_sales: number | string | null;
    total_purchases: number | string | null;
    total_stock_quantity: number | string | null;
    total_transactions: bigint | number | null;
    low_stock_count: bigint | number | null;
  }>>`
    SELECT
      COALESCE(
        (
          SELECT SUM(ti."lineTotal")
          FROM "TransactionItem" ti
          JOIN "Transaction" tr ON tr.id = ti."transactionId"
          WHERE tr."transactionType" = 'SALE'
            AND tr."transactionDate" >= ${start}
            AND tr."transactionDate" < ${end}
        ),
        0
      ) AS "daily_sales",
      COALESCE(
        (
          SELECT SUM(ti."lineTotal")
          FROM "TransactionItem" ti
          JOIN "Transaction" tr ON tr.id = ti."transactionId"
          WHERE tr."transactionType" = 'SALE'
            AND tr."transactionDate" >= ${monthStart}
            AND tr."transactionDate" < ${monthEnd}
        ),
        0
      ) AS "monthly_sales",
      COALESCE(
        (
          SELECT SUM(ti."lineTotal")
          FROM "TransactionItem" ti
          JOIN "Transaction" tr ON tr.id = ti."transactionId"
          WHERE tr."transactionType" = 'SALE'
            AND tr."transactionDate" >= ${yearStart}
            AND tr."transactionDate" < ${yearEnd}
        ),
        0
      ) AS "yearly_sales",
      COALESCE(
        (
          SELECT SUM(t."totalAmount")
          FROM "Transaction" t
          WHERE t."transactionType" = 'PURCHASE'
        ),
        0
      ) AS "total_purchases",
      COALESCE(
        (
          SELECT SUM(sb."quantityOnHand")
          FROM "StockBalance" sb
        ),
        0
      ) AS "total_stock_quantity",
      (
        SELECT COUNT(*)
        FROM "Transaction"
      ) AS "total_transactions",
      (
        SELECT COUNT(*)
        FROM "Product" p
        WHERE p."isActive" = true
          AND p."lowStockThreshold" > 0
          AND EXISTS (
            SELECT 1
            FROM "StockBalance" sb
            WHERE sb."productId" = p.id
              AND sb."quantityOnHand" <= 0
          )
      ) AS "low_stock_count"
  `;

  const row = summaryRows[0] ?? {
    daily_sales: 0,
    monthly_sales: 0,
    yearly_sales: 0,
    total_purchases: 0,
    total_stock_quantity: 0,
    total_transactions: 0,
    low_stock_count: 0
  };

  return {
    daily: {
      sales: Number(row.daily_sales ?? 0)
    },
    monthly: {
      sales: Number(row.monthly_sales ?? 0)
    },
    yearly: {
      sales: Number(row.yearly_sales ?? 0)
    },
    purchases: {
      total: Number(row.total_purchases ?? 0)
    },
    stock: {
      totalValue: Number(row.total_stock_quantity ?? 0),
      lowStockCount: Number(row.low_stock_count ?? 0)
    },
    transactions: {
      total: Number(row.total_transactions ?? 0)
    }
  };
}
