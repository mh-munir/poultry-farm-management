'use server';

import { requireUser } from '@/lib/auth';
import { prisma } from '@/server/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

  const [salesAgg, purchaseAgg, costAgg, salesTransactions, purchaseTransactions, costTransactions] = await Promise.all([
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
    prisma.cost.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: {
        costDate: { gte: start, lt: end }
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
    prisma.cost.findMany({
      where: {
        costDate: { gte: start, lt: end }
      },
      orderBy: { costDate: 'desc' }
    })
  ]);

  const feedSales = await prisma.transactionItem.aggregate({
    _sum: { lineTotal: true },
    where: {
      transaction: {
        transactionType: 'SALE',
        transactionDate: { gte: start, lt: end }
      },
      product: { productType: 'FEED' }
    }
  });

  const medicineSales = await prisma.transactionItem.aggregate({
    _sum: { lineTotal: true },
    where: {
      transaction: {
        transactionType: 'SALE',
        transactionDate: { gte: start, lt: end }
      },
      product: { productType: 'MEDICINE' }
    }
  });

  const feedPurchases = await prisma.transactionItem.aggregate({
    _sum: { lineTotal: true },
    where: {
      transaction: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      },
      product: { productType: 'FEED' }
    }
  });

  const medicinePurchases = await prisma.transactionItem.aggregate({
    _sum: { lineTotal: true },
    where: {
      transaction: {
        transactionType: 'PURCHASE',
        transactionDate: { gte: start, lt: end }
      },
      product: { productType: 'MEDICINE' }
    }
  });

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
      feedTotal: Number(feedSales._sum.lineTotal ?? 0),
      medicineTotal: Number(medicineSales._sum.lineTotal ?? 0)
    },
    purchases: {
      total: totalPurchase,
      transactions: purchaseTransactions,
      count: purchaseAgg._count._all,
      paid: Number(purchaseAgg._sum.paidAmount ?? 0),
      due: Number(purchaseAgg._sum.dueAmount ?? 0),
      feedTotal: Number(feedPurchases._sum.lineTotal ?? 0),
      medicineTotal: Number(medicinePurchases._sum.lineTotal ?? 0)
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
    prisma.cost.aggregate({
      _sum: { amount: true },
      where: {
        costDate: { gte: start, lt: end }
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

  const dailyBreakdown: Record<string, { sales: number; purchases: number; costs: number; profit: number }> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dayStart = getStartOfDay(dayDate);
    const dayEnd = getEndOfDay(dayDate);
    const dateKey = dayDate.toISOString().slice(0, 10);

    const [daySales, dayPurchases, dayCosts] = await Promise.all([
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: dayStart, lt: dayEnd }
          }
        }
      }),
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          transactionType: 'PURCHASE',
          transactionDate: { gte: dayStart, lt: dayEnd }
        }
      }),
      prisma.cost.aggregate({
        _sum: { amount: true },
        where: {
          costDate: { gte: dayStart, lt: dayEnd }
        }
      })
    ]);

    const daySalesTotal = Number(daySales._sum.lineTotal ?? 0);
    const dayPurchasesTotal = Number(dayPurchases._sum.totalAmount ?? 0);
    const dayCostsTotal = Number(dayCosts._sum.amount ?? 0);

    dailyBreakdown[dateKey] = {
      sales: daySalesTotal,
      purchases: dayPurchasesTotal,
      costs: dayCostsTotal,
      profit: daySalesTotal - dayPurchasesTotal - dayCostsTotal
    };
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
    prisma.cost.aggregate({
      _sum: { amount: true },
      where: {
        costDate: { gte: start, lt: end }
      }
    })
  ]);

  const monthlyBreakdown = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  for (let month = 1; month <= 12; month++) {
    const monthDate = new Date(year, month - 1, 1);
    const monthStart = getStartOfMonth(monthDate);
    const monthEnd = getEndOfMonth(monthDate);

    const [monthSales, monthPurchases, monthCosts] = await Promise.all([
      prisma.transactionItem.aggregate({
        _sum: { lineTotal: true },
        where: {
          transaction: {
            transactionType: 'SALE',
            transactionDate: { gte: monthStart, lt: monthEnd }
          }
        }
      }),
      prisma.transaction.aggregate({
        _sum: { totalAmount: true },
        where: {
          transactionType: 'PURCHASE',
          transactionDate: { gte: monthStart, lt: monthEnd }
        }
      }),
      prisma.cost.aggregate({
        _sum: { amount: true },
        where: {
          costDate: { gte: monthStart, lt: monthEnd }
        }
      })
    ]);

    const monthSalesTotal = Number(monthSales._sum.lineTotal ?? 0);
    const monthPurchasesTotal = Number(monthPurchases._sum.totalAmount ?? 0);
    const monthCostsTotal = Number(monthCosts._sum.amount ?? 0);

    monthlyBreakdown.push({
      month: monthNames[month - 1],
      sales: monthSalesTotal,
      purchases: monthPurchasesTotal,
      costs: monthCostsTotal,
      profit: monthSalesTotal - monthPurchasesTotal - monthCostsTotal
    });
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

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      party: { select: { id: true, name: true } },
      transactionItems: {
        include: {
          product: { select: { id: true, name: true, productType: true, unit: true } }
        }
      }
    },
    orderBy: { transactionDate: 'desc' }
  });

  let filteredTransactions = transactions;
  if (filters.productId) {
    filteredTransactions = transactions.filter((t) =>
      t.transactionItems.some((item) => item.productId === filters.productId)
    );
  }
  if (filters.productType) {
    filteredTransactions = transactions.filter((t) =>
      t.transactionItems.some((item) => item.product.productType === filters.productType)
    );
  }

  const total = filteredTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const paid = filteredTransactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const due = filteredTransactions.reduce((sum, t) => sum + Number(t.dueAmount), 0);

  const items = filteredTransactions.flatMap((t) =>
    t.transactionItems.map((item) => ({
      id: item.id,
      transactionId: t.id,
      date: t.transactionDate,
      partyName: t.party.name,
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

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      party: { select: { id: true, name: true } },
      transactionItems: {
        include: {
          product: { select: { id: true, name: true, productType: true, unit: true } }
        }
      }
    },
    orderBy: { transactionDate: 'desc' }
  });

  let filteredTransactions = transactions;
  if (filters.productId) {
    filteredTransactions = transactions.filter((t) =>
      t.transactionItems.some((item) => item.productId === filters.productId)
    );
  }
  if (filters.productType) {
    filteredTransactions = transactions.filter((t) =>
      t.transactionItems.some((item) => item.product.productType === filters.productType)
    );
  }

  const total = filteredTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const paid = filteredTransactions.reduce((sum, t) => sum + Number(t.paidAmount), 0);
  const due = filteredTransactions.reduce((sum, t) => sum + Number(t.dueAmount), 0);

  const items = filteredTransactions.flatMap((t) =>
    t.transactionItems.map((item) => ({
      id: item.id,
      transactionId: t.id,
      date: t.transactionDate,
      partyName: t.party.name,
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

  const transactions = await prisma.transaction.findMany({
    where: { partyId },
    include: {
      transactionItems: {
        include: {
          product: { select: { name: true, productType: true } }
        }
      },
      payments: {
        include: {
          payment: { select: { amount: true, paymentDate: true, paymentMethod: true } }
        }
      }
    },
    orderBy: { transactionDate: 'asc' }
  });

  const payments = await prisma.payment.findMany({
    where: { partyId },
    orderBy: { paymentDate: 'asc' }
  });

  const entries: any[] = [];
  let runningBalance = 0;

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

    runningBalance += amount - paid;
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

    runningBalance -= Number(payment.amount);
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
    include: {
      stockBalance: true,
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    },
    orderBy: { name: 'asc' }
  });

  const items = products.map((product) => {
    const quantityOnHand = Number(product.stockBalance?.quantityOnHand ?? 0);
    const threshold = Number(product.lowStockThreshold ?? 0);
    const movements = product.stockMovements || [];

    const totalIn = movements.filter((m) => ['PURCHASE', 'OPENING', 'RETURN', 'PRODUCTION'].includes(m.movementType)).reduce((sum, m) => sum + Number(m.quantity), 0);
    const totalOut = movements.filter((m) => ['SALE', 'WASTAGE'].includes(m.movementType)).reduce((sum, m) => sum + Number(m.quantity), 0);

    return {
      id: product.id,
      name: product.name,
      code: product.code,
      productType: product.productType,
      unit: product.unit,
      quantityOnHand,
      totalIn,
      totalOut,
      balance: quantityOnHand,
      lowStock: threshold > 0 && quantityOnHand <= threshold,
      threshold,
      movements: movements.map((m) => ({
        id: m.id,
        date: m.createdAt,
        type: m.movementType,
        quantity: Number(m.quantity),
        unitCost: Number(m.unitCost ?? 0),
        notes: m.notes
      }))
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
    prisma.cost.aggregate({
      _sum: { amount: true },
      where: {
        costDate: { gte: start, lt: end }
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

  const [
    dailySales,
    monthlySales,
    yearlySales,
    totalPurchases,
    totalStockValue,
    totalTransactions,
    lowStockCount
  ] = await Promise.all([
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: start, lt: end }
        }
      }
    }),
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: monthStart, lt: monthEnd }
        }
      }
    }),
    prisma.transactionItem.aggregate({
      _sum: { lineTotal: true },
      where: {
        transaction: {
          transactionType: 'SALE',
          transactionDate: { gte: yearStart, lt: yearEnd }
        }
      }
    }),
    prisma.transaction.aggregate({
      _sum: { totalAmount: true },
      where: { transactionType: 'PURCHASE' }
    }),
    prisma.stockBalance.aggregate({
      _sum: { quantityOnHand: true }
    }),
    prisma.transaction.count(),
    prisma.product.count({
      where: {
        isActive: true,
        lowStockThreshold: { gt: 0 },
        stockBalance: {
          quantityOnHand: { lte: 0 }
        }
      }
    })
  ]);

  return {
    daily: {
      sales: Number(dailySales._sum.lineTotal ?? 0)
    },
    monthly: {
      sales: Number(monthlySales._sum.lineTotal ?? 0)
    },
    yearly: {
      sales: Number(yearlySales._sum.lineTotal ?? 0)
    },
    purchases: {
      total: Number(totalPurchases._sum.totalAmount ?? 0)
    },
    stock: {
      totalValue: Number(totalStockValue._sum.quantityOnHand ?? 0),
      lowStockCount
    },
    transactions: {
      total: totalTransactions
    }
  };
}
