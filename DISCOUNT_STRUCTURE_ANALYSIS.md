# Prisma Schema: Discount Structure Analysis

## 1. Transaction Model Field Definitions

**Location**: `prisma/schema.prisma` (lines 276-306)

```prisma
model Transaction {
  id               Int                 @id @default(autoincrement())
  transactionType  String              // 'SALE' or 'PURCHASE'
  partyId          Int?
  transactionDate  DateTime            @default(now())
  invoiceNumber    String              @unique
  referenceNumber  String?
  status           String              @default("COMPLETED")
  
  subtotal         Decimal             // Sum of all line totals (quantity × unitPrice)
  discount         Decimal             @default(0)    // Transaction-level discount only
  tax              Decimal             @default(0)
  totalAmount      Decimal             // = subtotal - discount
  paidAmount       Decimal             @default(0)
  dueAmount        Decimal             @default(0)    // = totalAmount - paidAmount
  
  dueDate          DateTime?
  notes            String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  createdById      String?
  companyId        Int?
  mediaName        String              @default("")
  
  // Relations
  dueAdjustments   DueAdjustment[]
  ledgerEntries    LedgerEntry[]
  payments         PaymentAllocation[]
  smsNotifications SmsNotification?
  stockMovements   StockMovement[]
  company          Company?            @relation("CompanyTransactions", fields: [companyId], references: [id])
  createdBy        User?               @relation(fields: [createdById], references: [id])
  party            Party?              @relation(fields: [partyId], references: [id])
  transactionItems TransactionItem[]

  @@index([partyId, transactionDate])
  @@index([companyId, transactionDate])
  @@index([transactionType, transactionDate])
  @@index([transactionType, status])
}
```

---

## 2. TransactionItem Model Field Definitions

**Location**: `prisma/schema.prisma` (lines 335-352)

```prisma
model TransactionItem {
  id              Int         @id @default(autoincrement())
  transactionId   Int
  productId       Int
  
  quantity        Decimal     // Item quantity
  unitPrice       Decimal     // Price per unit
  lineTotal       Decimal     // = quantity × unitPrice (NO ITEM-LEVEL DISCOUNT)
  taxAmount       Decimal     @default(0)
  
  description     String?
  chickenQuantity Decimal?    // For chicken products (weight tracking)
  
  // Relations
  product         Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@index([productId])
}
```

---

## 3. Discount Business Rules & Documentation

### 🔑 **Key Finding: No Per-Item Discounts**

From the **COMPREHENSIVE_FINANCIAL_AUDIT_REPORT.md**, the system explicitly states:

> **Grand Total = Subtotal - Transaction Discount (no line discounts supported)**

**Important Notes**:
- **Only transaction-level discounts are supported** in the schema
- **Per-item discounts are NOT stored in the database**
- `lineTotal` in `TransactionItem` is **pure gross amount**: `lineTotal = quantity × unitPrice`
- Discount is applied only at the `Transaction` level

### Discount Application Scope

| Level | Support | Storage | Notes |
|-------|---------|---------|-------|
| **Per-Item Discount** | ❌ NO | Not in schema | lineTotal always = qty × price |
| **Transaction Discount** | ✅ YES | Transaction.discount | Applied to entire transaction |

---

## 4. Financial Formulas

### Formula Reference

```typescript
// FORMULA 1: Line Item Total (per item, NO discount applied)
lineTotal = quantity × unitPrice

// FORMULA 2: Subtotal (sum of all line totals)
Subtotal = SUM(lineTotal for all items)
         = SUM(quantity × unitPrice)

// FORMULA 3: Grand Total (transaction level, WITH discount)
totalAmount = Subtotal - Transaction.discount

// FORMULA 4: Due Amount
dueAmount = totalAmount - paidAmount

// FORMULA 5: Running Balance
runningBalance = previousBalance ± transaction amount
```

### Code Implementation Examples

**From `src/features/sales/actions.ts`** (Lines 67-74):
```typescript
function validateSaleAmounts(data: z.infer<typeof saleSchema>) {
  // Line totals: quantity × unitPrice (no discount)
  const subtotal = data.items.reduce((sum, item) => {
    return sum.plus(new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice)));
  }, new Prisma.Decimal(0));
  
  // Transaction-level discount only
  const discount = new Prisma.Decimal(data.discount);
  
  // Grand total = subtotal - transaction discount
  const totalAmount = subtotal.minus(discount);
  
  // Due = total - payment
  const paymentAmount = new Prisma.Decimal(data.paymentAmount);
  return { subtotal, totalAmount, discount, paymentAmount };
}
```

**From `src/features/sales/actions.ts`** (Lines 164):
```typescript
// TransactionItem creation: lineTotal EXCLUDES discount
lineTotal: new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice))
```

---

## 5. Data Type Requirements

### Precision Handling

All financial calculations **must use `Prisma.Decimal`** to maintain precision:

```typescript
✅ CORRECT:
const subtotal = new Prisma.Decimal(item.quantity).times(new Prisma.Decimal(item.unitPrice));
const totalAmount = subtotal.minus(new Prisma.Decimal(data.discount));

❌ INCORRECT:
const subtotal = Number(quantity) * Number(unitPrice);  // Loses precision
```

**Affected Fields**:
- `Transaction.subtotal` → `Decimal`
- `Transaction.discount` → `Decimal`
- `Transaction.totalAmount` → `Decimal`
- `Transaction.paidAmount` → `Decimal`
- `Transaction.dueAmount` → `Decimal`
- `TransactionItem.quantity` → `Decimal`
- `TransactionItem.unitPrice` → `Decimal`
- `TransactionItem.lineTotal` → `Decimal`

---

## 6. Important Schema Constraints

### NULL Handling
- `discount` has `@default(0)` → Never NULL
- `paidAmount` has `@default(0)` → Never NULL
- `dueAmount` has `@default(0)` → Never NULL
- `tax` has `@default(0)` → No tax calculations in current system

### Relationships
- Each `Transaction` has many `TransactionItem` (one-to-many)
- `TransactionItem` cascade delete with parent `Transaction`
- Transactions link to `Party` and/or `Company` (not both required)

---

## 7. Summary: LineTotal Behavior

| Question | Answer | Details |
|----------|--------|---------|
| **Does lineTotal include discounts?** | **NO** | lineTotal = qty × unitPrice (gross) |
| **Where is discount applied?** | **At Transaction level** | Discount field on Transaction model |
| **Are per-item discounts supported?** | **NO** | Only one discount field per transaction |
| **Is lineTotal stored in DB?** | **YES** | TransactionItem.lineTotal is persisted |
| **Formula for lineTotal** | `qty × price` | No conditional logic |

---

## Audit Status

✅ **VERIFIED** - From COMPREHENSIVE_FINANCIAL_AUDIT_REPORT.md:
- Line Item Total calculation: CORRECT (Prisma.Decimal)
- Subtotal calculation: CORRECT (Prisma.Decimal)
- Grand Total calculation: CORRECT (Prisma.Decimal)
- Due Amount calculation: CORRECT (Prisma.Decimal)
- All financial fields use proper precision handling
