# Comprehensive Audit of Untranslated User-Facing English Strings

**Last Updated:** 2024-12-13  
**Scope:** src/ directory  
**Total Issues Found:** 100+ hardcoded strings

---

## 1. PAYMENT METHOD DROPDOWN OPTIONS

### Cash, Bank, Mobile, Cheque

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 93-96, 169-172 | "Cash", "Bank", "Mobile", "Cheque" | Dropdown options in payment form | `common.paymentMethodCash` | Cash | নগদ |
| | | | | `common.paymentMethodBank` | Bank | ব্যাংক |
| | | | | `common.paymentMethodMobile` | Mobile Money | মোবাইল মানি |
| | | | | `common.paymentMethodCheque` | Cheque | চেক |
| `src/app/dashboard/companies/[id]/page.tsx` | 487-490 | "Cash", "Bank transfer", "Cheque", "Mobile money" | Payment method select options | `common.paymentMethodCash` | Cash | নগদ |
| | | | | `common.paymentMethodBankTransfer` | Bank Transfer | ব্যাংক ট্রান্সফার |
| | | | | `common.paymentMethodCheque` | Cheque | চেক |
| | | | | `common.paymentMethodMobileMoney` | Mobile Money | মোবাইল মানি |
| `src/app/dashboard/companies/page.tsx` | 223-226 | "Cash", "Bank transfer", "Cheque", "Mobile money" | Payment method options | Same as above | | |
| `src/app/dashboard/sales/sale-form.tsx` | 216-219 | "CASH", "BANK_TRANSFER", "CHEQUE", "MOBILE_MONEY" | Select options with labels | Same as above | | |

---

## 2. PRODUCT TYPE DROPDOWN OPTIONS

### Feed, Medicine, Egg, Chicken, Hatchling/Chick

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/products/new/page.tsx` | 9-14 | "Feed", "Medicine", "Egg", "Chicken", "Hatchling / Chick" | Product type select options | `common.productTypeFeed` | Feed | খাবার |
| | | | | `common.productTypeMedicine` | Medicine | ওষুধ |
| | | | | `common.productTypeEgg` | Egg | ডিম |
| | | | | `common.productTypeChicken` | Chicken | মুরগি |
| | | | | `common.productTypeChick` | Hatchling / Chick | বাচ্চা |
| `src/app/dashboard/products/[id]/edit/page.tsx` | 10-15 | Same as above | Product type options | Same as above | | |
| `src/app/dashboard/companies/[id]/company-profile-filter.tsx` | 39-40 | "EGG", "CHICKEN", etc. | Dropdown filter for product types | | | |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 56-59 | "Feeds", "Medicine", "Hatchling / Chick", "Feeds + Hatchling / Chick" | Company type select | `common.companyTypeFeed` | Feeds | খাবার |
| | | | | `common.companyTypeMedicine` | Medicine | ওষুধ |
| | | | | `common.companyTypeChick` | Hatchling / Chick | বাচ্চা |
| | | | | `common.companyTypeFeedChick` | Feeds + Hatchling / Chick | খাবার + বাচ্চা |
| `src/app/dashboard/parties/add-party-dialog.tsx` | 223 | "Party Supplier (Eggs & Chicken)" | Party type option | `common.partyTypeSupplier` | Party Supplier (Eggs & Chicken) | পার্টি সরবরাহকারী (ডিম ও মুরগি) |
| `src/app/dashboard/parties/new/page.tsx` | 56 | "Party Supplier (Eggs & Chicken)" | Party type option | Same as above | | |

---

## 3. UNIT DROPDOWN OPTIONS

### Pcs, Bag, Kg, Gm, Bottle, Liter, Box, Pack

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/products/new/page.tsx` | 17-24 | "Pcs", "Bag", "Kg", "Gm", "Bottle", "Liter", "Box", "Pack" | Unit select dropdown | `common.unitPcs` | Pcs | পিস |
| | | | | `common.unitBag` | Bag | ব্যাগ |
| | | | | `common.unitKg` | Kg | কেজি |
| | | | | `common.unitGm` | Gm | গ্রাম |
| | | | | `common.unitBottle` | Bottle | বোতল |
| | | | | `common.unitLiter` | Liter | লিটার |
| | | | | `common.unitBox` | Box | বাক্স |
| | | | | `common.unitPack` | Pack | প্যাক |
| `src/app/dashboard/products/[id]/edit/page.tsx` | 18-25 | Same as above | Unit options | Same as above | | |

---

## 4. TRANSACTION STATUS LABELS

### Active, Inactive, Completed, Pending, Cancelled

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/companies/page.tsx` | 311 | "Active", "Inactive" | Company status badge | `common.statusActive` | Active | সক্রিয় |
| | | | | `common.statusInactive` | Inactive | নিষ্ক্রিয় |
| `src/app/dashboard/companies/[id]/page.tsx` | 457 | "Active", "Inactive" | Company status display | Same as above | | |
| `src/app/dashboard/parties/[id]/page.tsx` | 411 | "Active", "Inactive" | Party status badge | Same as above | | |
| `src/app/dashboard/parties/[id]/page.tsx` | 189 | "Active", "Inactive" | In print page | Same as above | | |
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 106-107 | "Completed", "Pending" | Payment status dropdown | `common.statusCompleted` | Completed | সম্পন্ন |
| | | | | `common.statusPending` | Pending | অপেক্ষমাণ |
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 192-193 | "Completed", "Pending", "Cancelled" | Payment status select | `common.statusCancelled` | Cancelled | বাতিল |
| `src/app/dashboard/products/page.tsx` | 193 | "Active", "Inactive" | Product status badge | Same as above | | |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 88 | "Active company" | Checkbox label | `common.activeCompany` | Active company | সক্রিয় কোম্পানি |
| `src/app/dashboard/parties/new/page.tsx` | 101 | "Active party" | Checkbox label | `common.activeParty` | Active party | সক্রিয় পার্টি |
| `src/app/dashboard/products/new/page.tsx` | 118 | "Active product" | Checkbox label | `common.activeProduct` | Active product | সক্রিয় পণ্য |

---

## 5. PAYMENT FORM LABELS AND PLACEHOLDERS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 88 | "Enter amount" | Amount input placeholder | `common.placeholderAmount` | Enter amount | পরিমাণ লিখুন |
| | | 101 | "Optional" | Reference number placeholder | `common.placeholderOptional` | Optional | ঐচ্ছিক |
| | | 127 | "Optional notes" | Notes textarea placeholder | `common.placeholderOptionalNotes` | Optional notes | ঐচ্ছিক নোট |
| `src/app/dashboard/companies/pay-company-modal.tsx` | 137 | "Enter amount" | Amount placeholder | Same as above | | |
| `src/app/dashboard/parties/add-party-dialog.tsx` | 177 | "Party name" | Party name placeholder | `common.placeholderPartyName` | Party name | পার্টির নাম |
| | | 194 | "01712345678" | Phone placeholder | `common.placeholderPhone` | 01712345678 | ০১৭১২৩৪৫৬৭৮ |
| `src/app/dashboard/parties/new/page.tsx` | 34 | "Acme Poultry Ltd" | Party name placeholder | `common.placeholderCompanyExample` | Acme Poultry Ltd | এসমে পোল্ট্রি লিমিটেড |
| | | 45 | "01712345678" | Phone placeholder | Same as above | | |
| | | 50 | "party@example.com" | Email placeholder | `common.placeholderEmail` | party@example.com | party@example.com |
| | | 62 | "P0512345678" | Tax number placeholder | `common.placeholderTaxNumber` | P0512345678 | P0512345678 |
| | | 95 | "Opening balance note..." | Notes placeholder | `common.placeholderBalanceNote` | Opening balance note... | খোলার ব্যালেন্স নোট... |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 55 | "Optional: 01712345678" | Mobile placeholder | `common.placeholderMobileOptional` | Optional: 01712345678 | ঐচ্ছিক: ০১৭१२३४५६७८ |
| | | 82 | "Optional" | Opening balance description placeholder | Same as above | | |
| `src/app/dashboard/parties/company-search-form.tsx` | 65 | "Search company name..." | Search placeholder | `common.placeholderSearchCompany` | Search company name... | কোম্পানির নাম খুঁজুন... |
| `src/app/dashboard/parties/search-form.tsx` | 65 | "Search party name..." | Search placeholder | `common.placeholderSearchParty` | Search party name... | পার্টির নাম খুঁজুন... |

---

## 6. DIALOG AND MODAL TITLES

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/add-party-dialog.tsx` | 130 | "Add Party" | Dialog title | `common.titleAddParty` | Add Party | পার্টি যোগ করুন |
| | | 114 | "+ Add Parties" | Button text | `common.btnAddParties` | Add Parties | পার্টি যোগ করুন |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 38 | "Add Company" | Dialog title | `common.titleAddCompany` | Add Company | কোম্পানি যোগ করুন |
| `src/app/dashboard/parties/[id]/transaction-tabs.tsx` | 180 | "Transaction History" | Section title | `common.titleTransactionHistory` | Transaction History | লেনদেনের ইতিহাস |
| | | 181 | "Ledger-backed activity with running balance" | Description | `common.descTransactionHistory` | Ledger-backed activity with running balance | চলমান ব্যালেন্স সহ লেজার-ভিত্তিক কার্যকলাপ |
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 126 | "Payments" | Table header/section title | `common.titlePayments` | Payments | পেমেন্ট |
| `src/app/dashboard/parties/new/page.tsx` | 19-20 | "Create Party", "Add a new customer or party" | Page titles | `common.titleCreateParty` | Create Party | পার্টি তৈরি করুন |
| | | | | `common.subtitleAddParty` | Add a new customer or party | নতুন গ্রাহক বা পার্টি যোগ করুন |

---

## 7. BUTTON LABELS AND ACTION TEXT

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 210 | "Edit" | Edit button (icon button label) | `common.btnEdit` | Edit | সম্পাদনা করুন |
| | | 214 | "Delete" | Delete button (icon button label) | `common.btnDelete` | Delete | মুছুন |
| | | 235 | "Save", "Cancel" | Form action buttons | `common.btnSave` | Save | সংরক্ষণ করুন |
| | | | | `common.btnCancel` | Cancel | বাতিল করুন |
| `src/app/dashboard/parties/new/page.tsx` | 122 | "Create Party" | Submit button | `common.btnCreateParty` | Create Party | পার্টি তৈরি করুন |
| `src/app/dashboard/products/new/page.tsx` | 123 | "Create Product" | Submit button | `common.btnCreateProduct` | Create Product | পণ্য তৈরি করুন |
| `src/app/dashboard/products/[id]/edit/page.tsx` | 158 | "Update Product" | Submit button | `common.btnUpdateProduct` | Update Product | পণ্য আপডেট করুন |
| `src/app/dashboard/parties/add-party-dialog.tsx` | 135 | "Save Party" | Submit button | Same as above | | |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 35 | "Add Company" | Button text | `common.btnAddCompany` | Add Company | কোম্পানি যোগ করুন |
| `src/components/dashboard/stock/add-stock-modal.tsx` | 385 | "Remove stock item" | Aria label for delete button | `common.labelRemoveStockItem` | Remove stock item | স্টক আইটেম সরান |
| `src/components/dashboard/sales-entry-popup.tsx` | 372 | "Add Item" | Button text | `common.btnAddItem` | Add Item | আইটেম যোগ করুন |
| | | 452 | "Remove item" | Aria label for button | `common.labelRemoveItem` | Remove item | আইটেম সরান |

---

## 8. FORM LABELS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/new/page.tsx` | 32 | "Party name" | Form label | `common.labelPartyName` | Party name | পার্টির নাম |
| | | 39 | "Phone" | Form label | `common.labelPhone` | Phone | ফোন |
| | | 49 | "Email" | Form label | `common.labelEmail` | Email | ইমেল |
| | | 53 | "Party type" | Form label | `common.labelPartyType` | Party type | পার্টির ধরন |
| | | 59 | "Tax number" | Form label | `common.labelTaxNumber` | Tax number | ট্যাক্স নম্বর |
| | | 65 | "Credit limit" | Form label | `common.labelCreditLimit` | Credit limit | ক্রেডিট সীমা |
| | | 71 | "Opening Balance" | Form section title | `common.labelOpeningBalance` | Opening Balance | খোলার ব্যালেন্স |
| | | 75 | "Opening Balance Amount" | Form label | `common.labelOpeningBalanceAmount` | Opening Balance Amount | খোলার ব্যালেন্স পরিমাণ |
| | | 81 | "Balance Type" | Form label | `common.labelBalanceType` | Balance Type | ব্যালেন্স ধরন |
| | | 83-84 | "Customer Due", "Customer Advance" | Radio button labels | `common.labelCustomerDue` | Customer Due | গ্রাহক বকেয়া |
| | | | | `common.labelCustomerAdvance` | Customer Advance | গ্রাহক অগ্রিম |
| | | 92 | "Description" | Form label | `common.labelDescription` | Description | বিবরণ |
| | | 100-101 | "Active party" | Checkbox label | Same as above | | |
| `src/app/dashboard/parties/add-company-dialog.tsx` | 41 | "Company name" | Form label | `common.labelCompanyName` | Company name | কোম্পানির নাম |
| | | 45 | "Contact person" | Form label | `common.labelContactPerson` | Contact person | যোগাযোগ ব্যক্তি |
| | | 49 | "Phone" | Form label | Same as above | | |
| | | 53 | "Email" | Form label | Same as above | | |
| | | 58 | "Company type" | Form label | `common.labelCompanyType` | Company type | কোম্পানির ধরন |
| | | 66 | "Opening Balance" | Section title | Same as above | | |
| | | 72 | "Opening Balance Amount" | Form label | Same as above | | |
| | | 80 | "Opening Balance Description" | Form label | `common.labelOpeningBalanceDesc` | Opening Balance Description | খোলার ব্যালেন্সের বিবরণ |
| | | 86 | "Active company" | Checkbox label | `common.labelActiveCompany` | Active company | সক্রিয় কোম্পানি |
| `src/app/dashboard/products/new/page.tsx` | 54 | "Product Name" | Form label | `common.labelProductName` | Product Name | পণ্যের নাম |
| | | 58 | "Product Code" | Form label | `common.labelProductCode` | Product Code | পণ্য কোড |
| | | 63 | "Product Type" | Form label | `common.labelProductType` | Product Type | পণ্যের ধরন |
| | | 68 | "Unit" | Form label | `common.labelUnit` | Unit | ইউনিট |
| | | 73 | "Category" | Form label | `common.labelCategory` | Category | বিভাগ |
| | | 80 | "Default Purchase Price" | Form label | `common.labelDefaultPurchasePrice` | Default Purchase Price | ডিফল্ট ক্রয় মূল্য |
| | | 86 | "Default Selling Price" | Form label | `common.labelDefaultSellingPrice` | Default Selling Price | ডিফল্ট বিক্রয় মূল্য |
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 155-161 | "Amount", "Method", "Reference", "Status", "Notes" | Table headers | Various | | |

---

## 9. EMPTY STATE MESSAGES

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/page.tsx` | 186 | "No parties found. Create your first party to get started." | Empty state message | `common.msgNoPartiesFound` | No parties found. Create your first party to get started. | কোন পার্টি পাওয়া যায়নি। শুরু করতে আপনার প্রথম পার্টি তৈরি করুন। |
| `src/app/dashboard/products/page.tsx` | 168 | "No products found. Create your first product to get started." | Empty state message | `common.msgNoProductsFound` | No products found. Create your first product to get started. | কোন পণ্য পাওয়া যায়নি। শুরু করতে আপনার প্রথম পণ্য তৈরি করুন। |
| `src/app/dashboard/parties/[id]/party-payments-section.tsx` | 240 | "No payment history available yet." | Empty state in table | `common.msgNoPaymentHistory` | No payment history available yet. | এখনও কোন পেমেন্ট ইতিহাস পাওয়া যায়নি। |
| `src/components/ui/combobox.tsx` | 29 | "No results found" | Combobox empty state | `common.msgNoResults` | No results found | কোন ফলাফল পাওয়া যায়নি |

---

## 10. ANALYTICS AND DATE FILTER PRESETS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/components/dashboard/analytics/analytics-filter-bar.tsx` | 8-13 | "Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month", "Custom Range" | Date preset buttons | `common.filterToday` | Today | আজ |
| | | | | `common.filterYesterday` | Yesterday | গতকাল |
| | | | | `common.filterLast7Days` | Last 7 Days | গত ৭ দিন |
| | | | | `common.filterLast30Days` | Last 30 Days | গত ৩০ দিন |
| | | | | `common.filterThisMonth` | This Month | এই মাস |
| | | | | `common.filterLastMonth` | Last Month | গত মাস |
| | | | | `common.filterCustomRange` | Custom Range | কাস্টম রেঞ্জ |

---

## 11. SUMMARY CARD LABELS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/companies/[id]/page.tsx` | 508-510 | "Total Purchases", "Total Payments", "Current Due" | KPI card labels | `common.labelTotalPurchases` | Total Purchases | মোট ক্রয় |
| | | | | `common.labelTotalPayments` | Total Payments | মোট পেমেন্ট |
| | | | | `common.labelCurrentDue` | Current Due | বর্তমান বকেয়া |

---

## 12. VALIDATION AND ERROR MESSAGES

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/components/dashboard/party-products-dialog.tsx` | 61 | "Please enter at least one quantity (Egg or Chicken)." | Validation error | `common.errAtLeastOneQuantity` | Please enter at least one quantity (Egg or Chicken). | অনুগ্রহ করে কমপক্ষে একটি পরিমাণ লিখুন (ডিম বা মুরগি)। |
| | | 66 | "Please enter egg price per piece." | Validation error | `common.errEggPriceRequired` | Please enter egg price per piece. | অনুগ্রহ করে প্রতিটি ডিমের মূল্য লিখুন। |
| | | 71 | "Please enter chicken price per kg." | Validation error | `common.errChickenPriceRequired` | Please enter chicken price per kg. | অনুগ্রহ করে প্রতি কেজি মুরগির মূল্য লিখুন। |
| | | 77 | "Please enter egg quantity." | Validation error | `common.errEggQuantityRequired` | Please enter egg quantity. | অনুগ্রহ করে ডিমের পরিমাণ লিখুন। |
| | | 93 | "Please enter chicken quantity." | Validation error | `common.errChickenQuantityRequired` | Please enter chicken quantity. | অনুগ্রহ করে মুরগির পরিমাণ লিখুন। |
| `src/components/dashboard/stock/add-stock-modal.tsx` | 160 | "Please select a company." | Validation error | `common.errCompanyRequired` | Please select a company. | অনুগ্রহ করে একটি কোম্পানি নির্বাচন করুন। |
| | | 168 | "Please select a valid company from the list." | Validation error | `common.errCompanyInvalid` | Please select a valid company from the list. | অনুগ্রহ করে তালিকা থেকে একটি বৈধ কোম্পানি নির্বাচন করুন। |
| `src/components/dashboard/stock/stock-management.tsx` | 181 | "Product name is required." | Validation error | `common.errProductNameRequired` | Product name is required. | পণ্যের নাম প্রয়োজন। |
| | | 186 | "Company is required." | Validation error | `common.errCompanyRequired` | Company is required. | কোম্পানি প্রয়োজন। |
| | | 192 | "Please select a valid company from the list." | Validation error | Same as above | | |

---

## 13. PAYMENT STATUS AND CATEGORY LABELS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/[id]/transaction-tabs.tsx` | 108 | "Date", "Type", "Category", "Description", "Debit", "Credit", "Running Balance", "Status", "Reference" | CSV header row | `common.labelDate` | Date | তারিখ |
| | | | | `common.labelType` | Type | ধরন |
| | | | | `common.labelCategory` | Category | বিভাগ |
| | | | | `common.labelDescription` | Description | বিবরণ |
| | | | | `common.labelDebit` | Debit | ডেবিট |
| | | | | `common.labelCredit` | Credit | ক্রেডিট |
| | | | | `common.labelRunningBalance` | Running Balance | চলমান ব্যালেন্স |
| | | | | `common.labelStatus` | Status | অবস্থা |
| | | | | `common.labelReference` | Reference | রেফারেন্স |

---

## 14. MISCELLANEOUS UI STRINGS

| File | Line(s) | Hardcoded Strings | Context | i18n Key | EN Translation | BN Translation |
|------|---------|-------------------|---------|----------|-----------------|-----------------|
| `src/app/dashboard/parties/add-company-dialog.tsx` | 58 | "Mobile number is optional for companies." | Helper text | `common.helpMobileOptional` | Mobile number is optional for companies. | কোম্পানির জন্য মোবাইল নম্বর ঐচ্ছিক। |
| `src/app/dashboard/parties/new/page.tsx` | 74 | "Creates an opening ledger entry when the amount is non-zero." | Helper text | `common.helpOpeningBalance` | Creates an opening ledger entry when the amount is non-zero. | পরিমাণ শূন্য না হলে একটি খোলার লেজার এন্ট্রি তৈরি করে। |
| `src/app/dashboard/parties/[id]/page.tsx` | 411 | "(Empty display state from print page)" | Display text | `common.labelInactiveStatus` | Inactive | নিষ্ক্রিয় |
| `src/app/dashboard/companies/page.tsx` | 93-94 | "Active Products", "Active" (in stats) | Stats display | `common.statsActiveProducts` | Active Products | সক্রিয় পণ্য |
| `src/app/dashboard/companies/[id]/page.tsx` | 475-477 | "Feeds", "Medicine", "Hatchling / Chick" | Section titles for stock management | `common.stockFeed` | Feeds | খাবার |
| | | | | `common.stockMedicine` | Medicine | ওষুধ |
| | | | | `common.stockChick` | Hatchling / Chick | বাচ্চা |

---

## RECOMMENDATIONS

### Priority 1: Critical User-Facing Strings (Do First)
1. Payment method labels (Cash, Bank, Mobile, Cheque)
2. Product type labels (Feed, Medicine, Egg, Chicken, Chick)
3. Unit labels (Pcs, Bag, Kg, Gm, etc.)
4. Status labels (Active, Inactive, Completed, Pending)
5. Button labels (Edit, Delete, Save, Cancel, Create, Update)
6. Validation error messages

### Priority 2: Important Form Labels (Do Second)
1. Form field labels (Party name, Phone, Email, etc.)
2. Dialog/Modal titles
3. Form placeholder texts
4. Helper/hint texts
5. Section titles

### Priority 3: Display Labels (Do Third)
1. Empty state messages
2. Summary card labels
3. Table headers
4. Date filter presets
5. Status and category labels

### Implementation Steps:
1. Add all i18n keys to `src/i18n/en.ts`
2. Add Bangla translations to `src/i18n/bn.ts`
3. Update component code to use `dict.*` pattern instead of hardcoded strings
4. Test all pages with both English and Bangla languages
5. Verify form validation messages display correctly
6. Test all dropdown selections and status displays

### Notes:
- All hardcoded strings in JSX should follow the pattern: `{dict.category.key}`
- Form validation messages should be stored in i18n dictionary
- Error messages and success toasts should use i18n
- Keep database field names and enum values separate from user-facing strings
- API response labels should be mapped to user-facing i18n strings

---

**Total Hardcoded Strings Identified:** 140+  
**Estimated Translation Effort:** Medium (2-3 hours per developer)  
**Impact:** High (Better user experience for Bangla-speaking users)
