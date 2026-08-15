# i18n Translation Dictionary Structure - Suggested Keys and Values

This document provides a structured list of all suggested i18n keys with English and Bangla translations ready to be added to the translation files.

## Structure to Add to `src/i18n/en.ts`

```typescript
export const en = {
  // ... existing translations ...
  
  common: {
    // ... existing common translations ...
    
    // ===== PAYMENT METHODS =====
    paymentMethodCash: 'Cash',
    paymentMethodBank: 'Bank',
    paymentMethodBankTransfer: 'Bank Transfer',
    paymentMethodMobile: 'Mobile Money',
    paymentMethodMobileMoney: 'Mobile Money',
    paymentMethodCheque: 'Cheque',
    paymentMethodOther: 'Other',
    
    // ===== PRODUCT TYPES =====
    productTypeFeed: 'Feed',
    productTypeMedicine: 'Medicine',
    productTypeEgg: 'Egg',
    productTypeChicken: 'Chicken',
    productTypeChick: 'Hatchling / Chick',
    
    // ===== COMPANY TYPES =====
    companyTypeFeed: 'Feeds',
    companyTypeMedicine: 'Medicine',
    companyTypeChick: 'Hatchling / Chick',
    companyTypeFeedChick: 'Feeds + Hatchling / Chick',
    
    // ===== PARTY TYPES =====
    partyTypeCustomer: 'Customer',
    partyTypeSupplier: 'Party Supplier (Eggs & Chicken)',
    partyTypeBoth: 'Customer + Party Supplier',
    
    // ===== UNITS =====
    unitPcs: 'Pcs',
    unitBag: 'Bag',
    unitKg: 'Kg',
    unitGm: 'Gm',
    unitBottle: 'Bottle',
    unitLiter: 'Liter',
    unitBox: 'Box',
    unitPack: 'Pack',
    
    // ===== STATUS LABELS =====
    statusActive: 'Active',
    statusInactive: 'Inactive',
    statusCompleted: 'Completed',
    statusPending: 'Pending',
    statusCancelled: 'Cancelled',
    statusCleared: 'Cleared',
    statusPosted: 'Posted',
    statusOpen: 'Open',
    statusSettled: 'Settled',
    
    // ===== CHECKBOXES & FLAGS =====
    activeCompany: 'Active company',
    activeParty: 'Active party',
    activeProduct: 'Active product',
    
    // ===== FORM LABELS =====
    labelPartyName: 'Party name',
    labelCompanyName: 'Company name',
    labelPhone: 'Phone',
    labelEmail: 'Email',
    labelPartyType: 'Party type',
    labelCompanyType: 'Company type',
    labelTaxNumber: 'Tax number',
    labelCreditLimit: 'Credit limit',
    labelContactPerson: 'Contact person',
    labelOpeningBalance: 'Opening Balance',
    labelOpeningBalanceAmount: 'Opening Balance Amount',
    labelOpeningBalanceDesc: 'Opening Balance Description',
    labelBalanceType: 'Balance Type',
    labelCustomerDue: 'Customer Due',
    labelCustomerAdvance: 'Customer Advance',
    labelDescription: 'Description',
    labelProductName: 'Product Name',
    labelProductCode: 'Product Code',
    labelProductType: 'Product Type',
    labelUnit: 'Unit',
    labelCategory: 'Category',
    labelDefaultPurchasePrice: 'Default Purchase Price',
    labelDefaultSellingPrice: 'Default Selling Price',
    labelAmount: 'Amount',
    labelPaymentMethod: 'Payment Method',
    labelDate: 'Date',
    labelType: 'Type',
    labelCategory: 'Category',
    labelDescription: 'Description',
    labelDebit: 'Debit',
    labelCredit: 'Credit',
    labelRunningBalance: 'Running Balance',
    labelStatus: 'Status',
    labelReference: 'Reference',
    
    // ===== BUTTONS =====
    btnEdit: 'Edit',
    btnDelete: 'Delete',
    btnSave: 'Save',
    btnCancel: 'Cancel',
    btnAddParty: 'Add Parties',
    btnAddParties: 'Add Parties',
    btnCreateParty: 'Create Party',
    btnAddCompany: 'Add Company',
    btnAddProduct: 'Add Product',
    btnCreateProduct: 'Create Product',
    btnUpdateProduct: 'Update Product',
    btnAddItem: 'Add Item',
    
    // ===== BUTTON ARIA LABELS =====
    labelRemoveStockItem: 'Remove stock item',
    labelRemoveItem: 'Remove item',
    
    // ===== DIALOG/MODAL TITLES =====
    titleAddParty: 'Add Party',
    titleAddCompany: 'Add Company',
    titleCreateParty: 'Create Party',
    titleTransactionHistory: 'Transaction History',
    titlePayments: 'Payments',
    
    // ===== DESCRIPTIONS & SUBTITLES =====
    descTransactionHistory: 'Ledger-backed activity with running balance',
    subtitleAddParty: 'Add a new customer or party',
    
    // ===== PLACEHOLDERS =====
    placeholderAmount: 'Enter amount',
    placeholderOptional: 'Optional',
    placeholderOptionalNotes: 'Optional notes',
    placeholderPartyName: 'Party name',
    placeholderCompanyName: 'Company name',
    placeholderPhone: '01712345678',
    placeholderMobileOptional: 'Optional: 01712345678',
    placeholderEmail: 'party@example.com',
    placeholderTaxNumber: 'P0512345678',
    placeholderBalanceNote: 'Opening balance note...',
    placeholderSearchCompany: 'Search company name...',
    placeholderSearchParty: 'Search party name...',
    placeholderCompanyExample: 'Acme Poultry Ltd',
    placeholderProductExample: 'Hatchling / Chick',
    placeholderProductCodeExample: 'CHICK-001',
    
    // ===== FILTER PRESETS =====
    filterToday: 'Today',
    filterYesterday: 'Yesterday',
    filterLast7Days: 'Last 7 Days',
    filterLast30Days: 'Last 30 Days',
    filterThisMonth: 'This Month',
    filterLastMonth: 'Last Month',
    filterCustomRange: 'Custom Range',
    filterAll: 'All',
    
    // ===== SUMMARY LABELS =====
    labelTotalPurchases: 'Total Purchases',
    labelTotalPayments: 'Total Payments',
    labelCurrentDue: 'Current Due',
    statsActiveProducts: 'Active Products',
    
    // ===== STOCK SECTION TITLES =====
    stockFeed: 'Feeds',
    stockMedicine: 'Medicine',
    stockChick: 'Hatchling / Chick',
    
    // ===== EMPTY STATE MESSAGES =====
    msgNoPartiesFound: 'No parties found. Create your first party to get started.',
    msgNoProductsFound: 'No products found. Create your first product to get started.',
    msgNoPaymentHistory: 'No payment history available yet.',
    msgNoResults: 'No results found',
    msgNoCompaniesFound: 'No companies found.',
    
    // ===== VALIDATION ERROR MESSAGES =====
    errAtLeastOneQuantity: 'Please enter at least one quantity (Egg or Chicken).',
    errEggPriceRequired: 'Please enter egg price per piece.',
    errChickenPriceRequired: 'Please enter chicken price per kg.',
    errEggQuantityRequired: 'Please enter egg quantity.',
    errChickenQuantityRequired: 'Please enter chicken quantity.',
    errCompanyRequired: 'Please select a company.',
    errCompanyInvalid: 'Please select a valid company from the list.',
    errProductNameRequired: 'Product name is required.',
    errSupplierRequired: 'Supplier is required.',
    errPurchaseDateRequired: 'Purchase date is required.',
    
    // ===== HELPER/HINT TEXTS =====
    helpMobileOptional: 'Mobile number is optional for companies.',
    helpOpeningBalance: 'Creates an opening ledger entry when the amount is non-zero.',
    
    // ===== OTHER DISPLAY TEXT =====
    labelInactiveStatus: 'Inactive',
  }
}
```

## Structure to Add to `src/i18n/bn.ts`

```typescript
export const bn = {
  // ... existing translations ...
  
  common: {
    // ... existing common translations ...
    
    // ===== PAYMENT METHODS =====
    paymentMethodCash: 'নগদ',
    paymentMethodBank: 'ব্যাংক',
    paymentMethodBankTransfer: 'ব্যাংক ট্রান্সফার',
    paymentMethodMobile: 'মোবাইল মানি',
    paymentMethodMobileMoney: 'মোবাইল মানি',
    paymentMethodCheque: 'চেক',
    paymentMethodOther: 'অন্যান্য',
    
    // ===== PRODUCT TYPES =====
    productTypeFeed: 'খাবার',
    productTypeMedicine: 'ওষুধ',
    productTypeEgg: 'ডিম',
    productTypeChicken: 'মুরগি',
    productTypeChick: 'বাচ্চা',
    
    // ===== COMPANY TYPES =====
    companyTypeFeed: 'খাবার কোম্পানি',
    companyTypeMedicine: 'ওষুধ কোম্পানি',
    companyTypeChick: 'বাচ্চা কোম্পানি',
    companyTypeFeedChick: 'খাবার + বাচ্চা কোম্পানি',
    
    // ===== PARTY TYPES =====
    partyTypeCustomer: 'গ্রাহক',
    partyTypeSupplier: 'পার্টি সরবরাহকারী (ডিম ও মুরগি)',
    partyTypeBoth: 'গ্রাহক + পার্টি সরবরাহকারী',
    
    // ===== UNITS =====
    unitPcs: 'পিস',
    unitBag: 'ব্যাগ',
    unitKg: 'কেজি',
    unitGm: 'গ্রাম',
    unitBottle: 'বোতল',
    unitLiter: 'লিটার',
    unitBox: 'বাক্স',
    unitPack: 'প্যাক',
    
    // ===== STATUS LABELS =====
    statusActive: 'সক্রিয়',
    statusInactive: 'নিষ্ক্রিয়',
    statusCompleted: 'সম্পন্ন',
    statusPending: 'অপেক্ষমাণ',
    statusCancelled: 'বাতিল',
    statusCleared: 'নিষ্পত্তি হয়েছে',
    statusPosted: 'পোস্ট করা হয়েছে',
    statusOpen: 'খোলা',
    statusSettled: 'নিষ্পত্তি করা',
    
    // ===== CHECKBOXES & FLAGS =====
    activeCompany: 'সক্রিয় কোম্পানি',
    activeParty: 'সক্রিয় পার্টি',
    activeProduct: 'সক্রিয় পণ্য',
    
    // ===== FORM LABELS =====
    labelPartyName: 'পার্টির নাম',
    labelCompanyName: 'কোম্পানির নাম',
    labelPhone: 'ফোন',
    labelEmail: 'ইমেল',
    labelPartyType: 'পার্টির ধরন',
    labelCompanyType: 'কোম্পানির ধরন',
    labelTaxNumber: 'ট্যাক্স নম্বর',
    labelCreditLimit: 'ক্রেডিট সীমা',
    labelContactPerson: 'যোগাযোগ ব্যক্তি',
    labelOpeningBalance: 'খোলার ব্যালেন্স',
    labelOpeningBalanceAmount: 'খোলার ব্যালেন্স পরিমাণ',
    labelOpeningBalanceDesc: 'খোলার ব্যালেন্সের বিবরণ',
    labelBalanceType: 'ব্যালেন্সের ধরন',
    labelCustomerDue: 'গ্রাহক বকেয়া',
    labelCustomerAdvance: 'গ্রাহক অগ্রিম',
    labelDescription: 'বিবরণ',
    labelProductName: 'পণ্যের নাম',
    labelProductCode: 'পণ্য কোড',
    labelProductType: 'পণ্যের ধরন',
    labelUnit: 'ইউনিট',
    labelCategory: 'বিভাগ',
    labelDefaultPurchasePrice: 'ডিফল্ট ক্রয় মূল্য',
    labelDefaultSellingPrice: 'ডিফল্ট বিক্রয় মূল্য',
    labelAmount: 'পরিমাণ',
    labelPaymentMethod: 'পেমেন্ট পদ্ধতি',
    labelDate: 'তারিখ',
    labelType: 'ধরন',
    labelCategory: 'বিভাগ',
    labelDescription: 'বিবরণ',
    labelDebit: 'ডেবিট',
    labelCredit: 'ক্রেডিট',
    labelRunningBalance: 'চলমান ব্যালেন্স',
    labelStatus: 'অবস্থা',
    labelReference: 'রেফারেন্স',
    
    // ===== BUTTONS =====
    btnEdit: 'সম্পাদনা করুন',
    btnDelete: 'মুছুন',
    btnSave: 'সংরক্ষণ করুন',
    btnCancel: 'বাতিল করুন',
    btnAddParty: 'পার্টি যোগ করুন',
    btnAddParties: 'পার্টি যোগ করুন',
    btnCreateParty: 'পার্টি তৈরি করুন',
    btnAddCompany: 'কোম্পানি যোগ করুন',
    btnAddProduct: 'পণ্য যোগ করুন',
    btnCreateProduct: 'পণ্য তৈরি করুন',
    btnUpdateProduct: 'পণ্য আপডেট করুন',
    btnAddItem: 'আইটেম যোগ করুন',
    
    // ===== BUTTON ARIA LABELS =====
    labelRemoveStockItem: 'স্টক আইটেম সরান',
    labelRemoveItem: 'আইটেম সরান',
    
    // ===== DIALOG/MODAL TITLES =====
    titleAddParty: 'পার্টি যোগ করুন',
    titleAddCompany: 'কোম্পানি যোগ করুন',
    titleCreateParty: 'পার্টি তৈরি করুন',
    titleTransactionHistory: 'লেনদেনের ইতিহাস',
    titlePayments: 'পেমেন্ট',
    
    // ===== DESCRIPTIONS & SUBTITLES =====
    descTransactionHistory: 'চলমান ব্যালেন্স সহ লেজার-ভিত্তিক কার্যকলাপ',
    subtitleAddParty: 'নতুন গ্রাহক বা পার্টি যোগ করুন',
    
    // ===== PLACEHOLDERS =====
    placeholderAmount: 'পরিমাণ লিখুন',
    placeholderOptional: 'ঐচ্ছিক',
    placeholderOptionalNotes: 'ঐচ্ছিক নোট',
    placeholderPartyName: 'পার্টির নাম',
    placeholderCompanyName: 'কোম্পানির নাম',
    placeholderPhone: '০১৭১২৩৪৫৬৭৮',
    placeholderMobileOptional: 'ঐচ্ছিক: ০১৭१२३४५६७८',
    placeholderEmail: 'party@example.com',
    placeholderTaxNumber: 'P0512345678',
    placeholderBalanceNote: 'খোলার ব্যালেন্স নোট...',
    placeholderSearchCompany: 'কোম্পানির নাম খুঁজুন...',
    placeholderSearchParty: 'পার্টির নাম খুঁজুন...',
    placeholderCompanyExample: 'এসমে পোল্ট্রি লিমিটেড',
    placeholderProductExample: 'বাচ্চা',
    placeholderProductCodeExample: 'CHICK-001',
    
    // ===== FILTER PRESETS =====
    filterToday: 'আজ',
    filterYesterday: 'গতকাল',
    filterLast7Days: 'গত ৭ দিন',
    filterLast30Days: 'গত ৩০ দিন',
    filterThisMonth: 'এই মাস',
    filterLastMonth: 'গত মাস',
    filterCustomRange: 'কাস্টম রেঞ্জ',
    filterAll: 'সব',
    
    // ===== SUMMARY LABELS =====
    labelTotalPurchases: 'মোট ক্রয়',
    labelTotalPayments: 'মোট পেমেন্ট',
    labelCurrentDue: 'বর্তমান বকেয়া',
    statsActiveProducts: 'সক্রিয় পণ্য',
    
    // ===== STOCK SECTION TITLES =====
    stockFeed: 'খাবার',
    stockMedicine: 'ওষুধ',
    stockChick: 'বাচ্চা',
    
    // ===== EMPTY STATE MESSAGES =====
    msgNoPartiesFound: 'কোন পার্টি পাওয়া যায়নি। শুরু করতে আপনার প্রথম পার্টি তৈরি করুন।',
    msgNoProductsFound: 'কোন পণ্য পাওয়া যায়নি। শুরু করতে আপনার প্রথম পণ্য তৈরি করুন।',
    msgNoPaymentHistory: 'এখনও কোন পেমেন্ট ইতিহাস পাওয়া যায়নি।',
    msgNoResults: 'কোন ফলাফল পাওয়া যায়নি',
    msgNoCompaniesFound: 'কোন কোম্পানি পাওয়া যায়নি।',
    
    // ===== VALIDATION ERROR MESSAGES =====
    errAtLeastOneQuantity: 'অনুগ্রহ করে কমপক্ষে একটি পরিমাণ লিখুন (ডিম বা মুরগি)।',
    errEggPriceRequired: 'অনুগ্রহ করে প্রতিটি ডিমের মূল্য লিখুন।',
    errChickenPriceRequired: 'অনুগ্রহ করে প্রতি কেজি মুরগির মূল্য লিখুন।',
    errEggQuantityRequired: 'অনুগ্রহ করে ডিমের পরিমাণ লিখুন।',
    errChickenQuantityRequired: 'অনুগ্রহ করে মুরগির পরিমাণ লিখুন।',
    errCompanyRequired: 'অনুগ্রহ করে একটি কোম্পানি নির্বাচন করুন।',
    errCompanyInvalid: 'অনুগ্রহ করে তালিকা থেকে একটি বৈধ কোম্পানি নির্বাচন করুন।',
    errProductNameRequired: 'পণ্যের নাম প্রয়োজন।',
    errSupplierRequired: 'সরবরাহকারী প্রয়োজন।',
    errPurchaseDateRequired: 'ক্রয়ের তারিখ প্রয়োজন।',
    
    // ===== HELPER/HINT TEXTS =====
    helpMobileOptional: 'কোম্পানির জন্য মোবাইল নম্বর ঐচ্ছিক।',
    helpOpeningBalance: 'পরিমাণ শূন্য না হলে একটি খোলার লেজার এন্ট্রি তৈরি করে।',
    
    // ===== OTHER DISPLAY TEXT =====
    labelInactiveStatus: 'নিষ্ক্রিয়',
  }
}
```

## Implementation Checklist

### Phase 1: Add Dictionary Keys
- [ ] Add all keys to `src/i18n/en.ts`
- [ ] Add all Bangla translations to `src/i18n/bn.ts`
- [ ] Verify no duplicate keys
- [ ] Test that dictionary loads without errors

### Phase 2: Update Components (Priority 1 - Critical)
- [ ] Replace payment method hardcoded strings with `dict.common.paymentMethod*`
- [ ] Replace product type hardcoded strings with `dict.common.productType*`
- [ ] Replace unit hardcoded strings with `dict.common.unit*`
- [ ] Replace status hardcoded strings with `dict.common.status*`
- [ ] Replace button labels with `dict.common.btn*`
- [ ] Replace validation error messages with `dict.common.err*`

### Phase 3: Update Components (Priority 2 - Important)
- [ ] Replace form labels with `dict.common.label*`
- [ ] Replace dialog/modal titles with `dict.common.title*`
- [ ] Replace placeholder texts with `dict.common.placeholder*`
- [ ] Replace helper texts with `dict.common.help*`
- [ ] Replace checkbox labels with `dict.common.active*`

### Phase 4: Update Components (Priority 3 - Display)
- [ ] Replace empty state messages with `dict.common.msg*`
- [ ] Replace summary card labels with `dict.common.label*`
- [ ] Replace filter presets with `dict.common.filter*`
- [ ] Replace section titles with `dict.common.stock*`

### Phase 5: Testing
- [ ] Test all forms in English
- [ ] Test all forms in Bangla
- [ ] Verify all dropdowns show correct labels
- [ ] Verify all validation messages appear correctly
- [ ] Test all dialogs and modals
- [ ] Check all empty states

## Files Requiring Updates

**High Priority:**
- `src/app/dashboard/parties/[id]/party-payments-section.tsx`
- `src/app/dashboard/companies/[id]/page.tsx`
- `src/app/dashboard/parties/add-party-dialog.tsx`
- `src/app/dashboard/parties/add-company-dialog.tsx`
- `src/app/dashboard/products/new/page.tsx`
- `src/components/dashboard/party-products-dialog.tsx`
- `src/components/dashboard/stock/add-stock-modal.tsx`

**Medium Priority:**
- `src/app/dashboard/parties/new/page.tsx`
- `src/app/dashboard/products/[id]/edit/page.tsx`
- `src/app/dashboard/parties/[id]/transaction-tabs.tsx`
- `src/components/dashboard/analytics/analytics-filter-bar.tsx`

**Lower Priority:**
- `src/app/dashboard/companies/page.tsx`
- `src/app/dashboard/parties/page.tsx`
- `src/app/dashboard/products/page.tsx`
- All payment/transaction related modals
