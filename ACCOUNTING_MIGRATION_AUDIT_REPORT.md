# Party Financial Summary: Pre-Implementation Audit

Generated: 2026-08-14

## Scope and safety outcome

No accounting schema, data, ledger, or UI changes were made. The requested pre-implementation audit found that tenant ownership cannot be safely migrated from the current data model.

## Schema impact analysis

- `Party` has no `companyId`.
- `Transaction`, `Payment`, and `LedgerEntry` have nullable `companyId` fields.
- `User` has no company/tenant membership field.
- `Company` is currently a supplier-style business entity, not an application tenant boundary.
- `Payment` has no persisted customer/supplier direction.
- `Transaction.status` and `Payment.status` are unconstrained strings. Existing accounting writes use `PENDING`, `PARTIAL`, and `COMPLETED`; the payment editor can also write `CANCELLED`.
- `Party.openingBalance` stores `CUSTOMER_DUE` as a positive value and `CUSTOMER_ADVANCE` as a negative value. The original value is mutable through Party edit flows.

## Historical data audit

Read-only audit results:

| Measure | Result |
| --- | ---: |
| Parties | 35 |
| Party-linked transactions | 27 |
| Party-linked payments | 6 |
| Party-linked ledger entries | 33 |
| Parties with any related accounting record | 3 (`22`, `36`, `59`) |
| Non-zero historical opening balances | 0 |
| Transaction statuses | 25 `PURCHASE/PENDING`, 2 `SALE/PENDING` |
| Payment statuses | 6 `COMPLETED` |

## Company/tenant conflict report

No party has conflicting non-null company relationships. However, this is not sufficient to migrate tenant ownership:

- Every related transaction, payment, and ledger entry for parties `22`, `36`, and `59` has `companyId = NULL`.
- The remaining 32 parties have no related accounting record from which ownership could be derived.
- No User-to-company/tenant relationship exists that could provide a deterministic fallback.

Result: all 35 parties are unassigned to a tenant. Assigning a `companyId` would require guessing, so the requested tenant-isolation migration is blocked.

## Historical payment classification report

All six party-linked payment records are reliably classified from their linked ledger entries:

| Payment IDs | Party | Classification | Status |
| --- | ---: | --- | --- |
| 33, 34, 35, 36, 37, 38 | 59 | `SUPPLIER_PAYMENT` | `COMPLETED` |

There are no ambiguous or conflicting party-linked payment directions in the current database snapshot. This result applies only to existing payment rows; payment direction must still be persisted for all future writes.

## Ledger/payment consistency report

The audit found no existing payment whose recorded amount differs from the sum of linked `PAYMENT_RECEIVED` or `PAYMENT_PAID` ledger entries. The application code still has a forward-looking defect: payment edit changes the `Payment` row without creating an adjusting/reversal ledger entry.

## Required migration plan

1. Define a real application tenant entity and membership/ownership model. Do not repurpose supplier `Company` as a tenant without a separate business decision.
2. Add a non-null tenant key to Party, Transaction, Payment, LedgerEntry, DueAdjustment, and relevant account records after a reviewed ownership backfill plan exists.
3. Add persisted `PaymentDirection` values: `CUSTOMER_PAYMENT` and `SUPPLIER_PAYMENT`.
4. Backfill payment direction only where a linked ledger entry provides exactly one direction; flag all other rows for review.
5. Add immutable opening-balance metadata, preserving the historical original amount and type independently from calculated remaining balances.
6. Add an append-only party credit/allocation record for opening advance and supplier advance application. Do not infer allocations from UI order.
7. Correct payment update/delete using ledger reversal and replacement entries within one Prisma transaction.
8. Build a Decimal-only authoritative party account service scoped by tenant and Party, then migrate the profile and payment modals to it.
9. Run reconciliation reports before enabling the new summary for migrated tenants.

## Authoritative calculation design

For one `(tenantId, partyId)`, order eligible obligation events by business date, then `createdAt`, then ID. Eligible events are valid customer sales and supplier purchases.

1. Start with the immutable original opening advance, if the opening type is `CUSTOMER_ADVANCE`.
2. Allocate it FIFO to each eligible obligation event, reducing that event only once.
3. Apply customer payments only to customer-side post-opening obligations; apply supplier payments only to supplier-side post-opening obligations.
4. Apply persisted supplier advances FIFO to later supplier obligations only.
5. Never net customer due against supplier payable.

Result fields:

- `originalOpeningAdvance`, `usedOpeningAdvance`, `remainingOpeningAdvance`
- `customerSales`, `customerPayments`, `customerDue`
- `supplierPurchases`, `supplierPayments`, `supplierAdvance`, `supplierPayable`

All calculations use `Prisma.Decimal`; formatted strings are created only in the UI.

## Acceptance test matrix

- FIFO opening advance: customer sale before supplier purchase.
- FIFO opening advance: supplier purchase before customer sale.
- Supplier payment below payable.
- Supplier overpayment creates a supplier advance.
- Supplier payment with zero payable creates a supplier advance.
- Customer due remains independent when a supplier advance is created.
- Payment create, edit, and delete/reversal reconcile Payment, LedgerEntry, and calculated balances.
- Purchase item edit recalculates purchase, allocation, and payable with no duplicate ledger entries.
- Cross-tenant records are excluded from all party calculations.
- Cancelled/invalid statuses are excluded according to the final status policy.

## Blocking decision

Implementation is intentionally paused. A tenant ownership decision and reviewed mapping for all 35 current Parties are required before a tenant-isolated accounting migration can proceed without guessing.
