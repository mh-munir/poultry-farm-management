-- Add targeted indexes for frequently filtered dashboard, report, table, and ledger queries.
CREATE INDEX "Party_isActive_partyType_name_idx" ON "Party"("isActive", "partyType", "name");
CREATE INDEX "Company_isActive_companyType_name_idx" ON "Company"("isActive", "companyType", "name");
CREATE INDEX "ProductCategory_isActive_name_idx" ON "ProductCategory"("isActive", "name");
CREATE INDEX "Product_isActive_productType_name_idx" ON "Product"("isActive", "productType", "name");
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");
CREATE INDEX "Transaction_transactionType_transactionDate_idx" ON "Transaction"("transactionType", "transactionDate");
CREATE INDEX "Transaction_transactionType_status_idx" ON "Transaction"("transactionType", "status");
CREATE INDEX "TransactionItem_productId_idx" ON "TransactionItem"("productId");
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");
CREATE INDEX "LedgerEntry_partyId_entryDate_id_idx" ON "LedgerEntry"("partyId", "entryDate", "id");
CREATE INDEX "LedgerEntry_companyId_entryDate_id_idx" ON "LedgerEntry"("companyId", "entryDate", "id");
