-- RenameTable
ALTER TABLE "Cost" RENAME TO "Expense";

-- RenameIndex
ALTER INDEX "Cost_costDate_idx" RENAME TO "Expense_expenseDate_idx";

-- RenameColumn
ALTER TABLE "Expense" RENAME COLUMN "costDate" TO "expenseDate";

-- RenamePrimaryKey
ALTER TABLE "Expense" DROP CONSTRAINT "Cost_pkey", ADD CONSTRAINT "Expense_pkey" PRIMARY KEY ("id");

-- RenameForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Cost_createdById_fkey", ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
