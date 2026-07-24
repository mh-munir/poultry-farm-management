'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdatePartyWithToast } from '@/features/parties/actions';
import { createSaleTransactionWithToast } from '@/features/sales/actions';
import { recordSupplierProductPurchase } from '@/features/purchases/actions';
import { useToast } from '@/hooks/use-toast';

type PartyOption = {
  id: number;
  name: string;
};

type ProductOption = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string;
  defaultSellingPrice: number;
  stockQuantity: number;
};

type SalesProductRow = {
  rowId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

type AddPartyDialogProps = {
  partyOptions: PartyOption[];
  productOptions: ProductOption[];
};

function createSalesProductRow(): SalesProductRow {
  return {
    rowId: `${Date.now()}-${Math.random()}`,
    productId: '',
    quantity: '1',
    unitPrice: ''
  };
}

export function AddPartyDialog({ partyOptions, productOptions }: AddPartyDialogProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isSupplierProductsOpen, setIsSupplierProductsOpen] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [isSupplierProductsLoading, setIsSupplierProductsLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [salesError, setSalesError] = useState('');
  const [supplierProductsError, setSupplierProductsError] = useState('');
  const [salesProduct, setSalesProduct] = useState<'feeds' | 'medicin' | 'both'>('feeds');
  const [salesNameError, setSalesNameError] = useState('');
  const [supplierProductsNameError, setSupplierProductsNameError] = useState('');
  const [salesPartyId, setSalesPartyId] = useState<number | null>(null);
  const [supplierProductsPartyId, setSupplierProductsPartyId] = useState<number | null>(null);
  const [salesPaymentAmount, setSalesPaymentAmount] = useState('0');
  const [salesDiscount, setSalesDiscount] = useState('0');
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [showSupplierPartySuggestions, setShowSupplierPartySuggestions] = useState(false);
  const [salesProductRows, setSalesProductRows] = useState<SalesProductRow[]>(() => [createSalesProductRow()]);
  const [addFormValues, setAddFormValues] = useState({
    name: '',
    phone: '',
    address: '',
    partyType: 'BOTH'
  });
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [imageCompressionStatus, setImageCompressionStatus] = useState('');
  const [salesFormValues, setSalesFormValues] = useState({
    name: '',
    mediaName: ''
  });
  const [supplierProductsFormValues, setSupplierProductsFormValues] = useState({
    partyName: '',
    productType: 'Both',
    eggQuantity: '',
    eggPrice: '',
    chickenQuantity: '',
    chickenPrice: ''
  });

  const handleAddChange = (field: string, value: string) => {
    const normalizedValue = field === 'phone'
      ? value.replace(/[^0-9]/g, '').slice(0, 11)
      : value;

    setAddFormValues((current) => ({ ...current, [field]: normalizedValue }));
  };

  const handleImageCompress = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCompressedImageFile(null);
      setImageCompressionStatus('');
      return;
    }

    try {
      setImageCompressionStatus('Compressing image...');
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setCompressedImageFile(compressedFile);
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      setImageCompressionStatus(`Compressed: ${originalSize}MB → ${compressedSize}MB`);
    } catch (err) {
      setImageCompressionStatus('Error compressing image');
      console.error('Image compression error:', err);
    }
  };

  const handleAddFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError('');
    setIsAddLoading(true);
    
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (compressedImageFile) {
      formData.set('image', compressedImageFile, compressedImageFile.name);
    }

    const result = await createOrUpdatePartyWithToast(formData);
    
    if (result.success) {
      success(result.message);
      router.refresh();
      // Auto close dialog after 1 second
      setTimeout(() => {
        setIsAddOpen(false);
        setAddFormValues({ name: '', phone: '', address: '', partyType: 'BOTH' });
        setCompressedImageFile(null);
        setImageCompressionStatus('');
        setIsAddLoading(false);
      }, 500);
    } else {
      setAddError(result.message);
      error(result.message);
      setIsAddLoading(false);
    }
  };

  const handleSalesChange = (field: string, value: string) => {
    setSalesFormValues((current) => ({ ...current, [field]: value }));

    if (field === 'name') {
      const matchedParty = partyOptions.find((option) => option.name === value);
      setSalesPartyId(matchedParty ? matchedParty.id : null);
      setShowPartySuggestions(true);
      if (matchedParty) {
        setSalesNameError('');
      }
    }

    if (field === 'name' && salesNameError) {
      setSalesNameError('');
    }
  };

  const handlePartyNameFocus = () => {
    setShowPartySuggestions(true);
  };

  const handlePartyNameClick = () => {
    setShowPartySuggestions(true);
  };

  const handlePartyNameBlur = () => {
    setTimeout(() => setShowPartySuggestions(false), 150);
  };

  const selectPartySuggestion = (party: PartyOption) => {
    setSalesFormValues((current) => ({ ...current, name: party.name }));
    setSalesPartyId(party.id);
    setSalesNameError('');
    setShowPartySuggestions(false);
  };

  const visibleProductOptions = useMemo(() => {
    return productOptions.filter((product) => {
      if (salesProduct === 'feeds') {
        return product.productType === 'FEED';
      }

      if (salesProduct === 'medicin') {
        return product.productType === 'MEDICINE';
      }

      return ['FEED', 'MEDICINE'].includes(product.productType);
    });
  }, [productOptions, salesProduct]);

  const productsById = useMemo(() => {
    return new Map(productOptions.map((product) => [String(product.id), product]));
  }, [productOptions]);

  const handleSalesProductTypeChange = (value: 'feeds' | 'medicin' | 'both') => {
    setSalesProduct(value);
    setSalesProductRows([createSalesProductRow()]);
  };

  const handleProductRowChange = (rowId: string, field: keyof Omit<SalesProductRow, 'rowId'>, value: string) => {
    setSalesProductRows((currentRows) => currentRows.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const selectedProduct = productsById.get(value);

        return {
          ...row,
          productId: value,
          unitPrice: selectedProduct ? String(selectedProduct.defaultSellingPrice) : ''
        };
      }

      return { ...row, [field]: value };
    }));
  };

  const addSalesProductRow = () => {
    setSalesProductRows((currentRows) => [...currentRows, createSalesProductRow()]);
  };

  const removeSalesProductRow = (rowId: string) => {
    setSalesProductRows((currentRows) => (
      currentRows.length > 1 ? currentRows.filter((row) => row.rowId !== rowId) : currentRows
    ));
  };

  const salesTotal = salesProductRows.reduce((total, row) => {
    return total + Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }, 0);
  const salesNetTotal = Math.max(0, salesTotal - Number(salesDiscount || 0));
  const salesDueAmount = Math.max(0, salesNetTotal - Number(salesPaymentAmount || 0));

  const matchingPartyOptions = useMemo(() => {
    const searchTerm = salesFormValues.name.trim().toLowerCase();

    if (!searchTerm) {
      return partyOptions;
    }

    return partyOptions.filter((party) => party.name.toLowerCase().includes(searchTerm));
  }, [partyOptions, salesFormValues.name]);

  const handleSalesNameBlur = () => {
    if (!salesFormValues.name) {
      setSalesNameError('');
      return;
    }

    const matchedParty = partyOptions.find((option) => option.name === salesFormValues.name);

    if (!matchedParty) {
      setSalesNameError('Please select a valid party name from the list.');
      setSalesFormValues((current) => ({ ...current, name: '' }));
      setSalesPartyId(null);
    } else {
      setSalesNameError('');
      setSalesPartyId(matchedParty.id);
    }
  };

  const handleSupplierProductsChange = (field: string, value: string) => {
    setSupplierProductsFormValues((current) => ({ ...current, [field]: value }));

    if (field === 'partyName') {
      const matchedParty = partyOptions.find((option) => option.name === value);
      setSupplierProductsPartyId(matchedParty ? matchedParty.id : null);
      setShowSupplierPartySuggestions(true);
      if (matchedParty) {
        setSupplierProductsNameError('');
      }
    }

    if (field === 'partyName' && supplierProductsNameError) {
      setSupplierProductsNameError('');
    }
  };

  const handleSupplierPartyNameFocus = () => {
    setShowSupplierPartySuggestions(true);
  };

  const handleSupplierPartyNameClick = () => {
    setShowSupplierPartySuggestions(true);
  };

  const handleSupplierPartyNameBlur = () => {
    setTimeout(() => setShowSupplierPartySuggestions(false), 150);
  };

  const selectSupplierPartySuggestion = (party: PartyOption) => {
    setSupplierProductsFormValues((current) => ({ ...current, partyName: party.name }));
    setSupplierProductsPartyId(party.id);
    setSupplierProductsNameError('');
    setShowSupplierPartySuggestions(false);
  };

  const matchingSupplierPartyOptions = useMemo(() => {
    const searchTerm = supplierProductsFormValues.partyName.trim().toLowerCase();

    if (!searchTerm) {
      return partyOptions;
    }

    return partyOptions.filter((party) => party.name.toLowerCase().includes(searchTerm));
  }, [partyOptions, supplierProductsFormValues.partyName]);

  const handleSupplierProductsNameBlur = () => {
    if (!supplierProductsFormValues.partyName) {
      setSupplierProductsNameError('');
      return;
    }

    const matchedParty = partyOptions.find((option) => option.name === supplierProductsFormValues.partyName);

    if (!matchedParty) {
      setSupplierProductsNameError('Please select a valid party name from the list.');
      setSupplierProductsFormValues((current) => ({ ...current, partyName: '' }));
      setSupplierProductsPartyId(null);
    } else {
      setSupplierProductsNameError('');
      setSupplierProductsPartyId(matchedParty.id);
    }
  };

  const handleSupplierProductsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupplierProductsError('');

    if (!supplierProductsFormValues.partyName) {
      setSupplierProductsNameError('Please select a party name.');
      return;
    }

    if (supplierProductsFormValues.productType === 'Both') {
      if (!supplierProductsFormValues.eggQuantity && !supplierProductsFormValues.chickenQuantity) {
        setSupplierProductsError('Please enter at least one quantity (Egg or Chicken).');
        return;
      }
      if (supplierProductsFormValues.eggQuantity && !supplierProductsFormValues.eggPrice) {
        setSupplierProductsError('Please enter egg price per piece.');
        return;
      }
      if (supplierProductsFormValues.chickenQuantity && !supplierProductsFormValues.chickenPrice) {
        setSupplierProductsError('Please enter chicken price per kg.');
        return;
      }
    } else if (supplierProductsFormValues.productType === 'Egg') {
      if (!supplierProductsFormValues.eggQuantity) {
        setSupplierProductsError('Please enter egg quantity.');
        return;
      }
      if (!supplierProductsFormValues.eggPrice) {
        setSupplierProductsError('Please enter egg price per piece.');
        return;
      }
    } else if (supplierProductsFormValues.productType === 'Chicken') {
      if (!supplierProductsFormValues.chickenQuantity) {
        setSupplierProductsError('Please enter chicken quantity.');
        return;
      }
      if (!supplierProductsFormValues.chickenPrice) {
        setSupplierProductsError('Please enter chicken price per kg.');
        return;
      }
    }

    setIsSupplierProductsLoading(true);

    try {
      const eggTotal = supplierProductsFormValues.eggQuantity && supplierProductsFormValues.eggPrice 
        ? Number(supplierProductsFormValues.eggQuantity) * Number(supplierProductsFormValues.eggPrice)
        : 0;
      const chickenTotal = supplierProductsFormValues.chickenQuantity && supplierProductsFormValues.chickenPrice
        ? Number(supplierProductsFormValues.chickenQuantity) * Number(supplierProductsFormValues.chickenPrice)
        : 0;
      const totalPrice = eggTotal + chickenTotal;

      // Store the supplier products data in localStorage
      const supplierProductData = {
        partyId: supplierProductsPartyId,
        partyName: supplierProductsFormValues.partyName,
        productType: supplierProductsFormValues.productType,
        eggQuantity: supplierProductsFormValues.eggQuantity ? Number(supplierProductsFormValues.eggQuantity) : 0,
        eggPrice: supplierProductsFormValues.eggPrice ? Number(supplierProductsFormValues.eggPrice) : 0,
        eggTotal: eggTotal,
        chickenQuantity: supplierProductsFormValues.chickenQuantity ? Number(supplierProductsFormValues.chickenQuantity) : 0,
        chickenPrice: supplierProductsFormValues.chickenPrice ? Number(supplierProductsFormValues.chickenPrice) : 0,
        chickenTotal: chickenTotal,
        totalPrice: totalPrice,
        timestamp: new Date().toISOString()
      };

      // Get existing data or create new array
      const existingData = localStorage.getItem('supplierProductsHistory');
      const historyData = existingData ? JSON.parse(existingData) : [];
      historyData.push(supplierProductData);
      localStorage.setItem('supplierProductsHistory', JSON.stringify(historyData));

      // Also record in database as PURCHASE transaction for settlement calculation
      if (supplierProductsPartyId) {
        const dbResult = await recordSupplierProductPurchase({
          partyId: supplierProductsPartyId,
          eggQuantity: supplierProductsFormValues.eggQuantity ? Number(supplierProductsFormValues.eggQuantity) : 0,
          eggPrice: supplierProductsFormValues.eggPrice ? Number(supplierProductsFormValues.eggPrice) : 0,
          chickenQuantity: supplierProductsFormValues.chickenQuantity ? Number(supplierProductsFormValues.chickenQuantity) : 0,
          chickenPrice: supplierProductsFormValues.chickenPrice ? Number(supplierProductsFormValues.chickenPrice) : 0,
          totalPrice
        });
        
        if (!dbResult.success) {
          console.warn('Warning: Could not save to database:', dbResult.message);
        }
      }

      console.log('Supplier Products Data:', supplierProductData);
      success(`Supplier products recorded for ${supplierProductsFormValues.partyName}`);
      
      // Reset form
      setTimeout(() => {
        setIsSupplierProductsOpen(false);
        setSupplierProductsFormValues({
          partyName: '',
          productType: 'Both',
          eggQuantity: '',
          eggPrice: '',
          chickenQuantity: '',
          chickenPrice: ''
        });
        setSupplierProductsPartyId(null);
        setIsSupplierProductsLoading(false);
        router.refresh();
      }, 500);
    } catch (err) {
      setSupplierProductsError('Failed to record supplier products.');
      error('Failed to record supplier products.');
      setIsSupplierProductsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" onClick={() => setIsAddOpen(true)} className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          + Add Parties
        </Button>
        <Button type="button" variant="secondary" onClick={() => setIsSalesOpen(true)} className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          📊 Sales Entry
        </Button>
        <Button type="button" variant="outline" onClick={() => setIsSupplierProductsOpen(true)} className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          🏪 Supplier Products
        </Button>
      </div>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open && !isAddLoading) {
            setIsAddOpen(false);
            setAddError('');
          }
        }}
        title="Add Party"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} disabled={isAddLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="add-party-form"
              disabled={isAddLoading}
              className={isAddLoading ? 'opacity-75 cursor-not-allowed' : ''}
            >
              {isAddLoading ? '⏳ Saving...' : '💾 Save Party'}
            </Button>
          </div>
        }
      >
        <form
          id="add-party-form"
          onSubmit={handleAddFormSubmit}
          autoComplete="off"
          encType="multipart/form-data"
          className="grid gap-4 sm:grid-cols-2"
        >
          {addError && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{addError}</p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={addFormValues.name}
              onChange={(event) => handleAddChange('name', event.target.value)}
              required
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors bg-white hover:border-gray-300"
              placeholder="Party name"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Mobile number</label>
            <input
              type="tel"
              name="phone"
              autoComplete="off"
              value={addFormValues.phone}
              onChange={(event) => handleAddChange('phone', event.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="01712345678"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party type</label>
            <select
              name="partyType"
              autoComplete="off"
              value={addFormValues.partyType}
              onChange={(event) => handleAddChange('partyType', event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="BOTH">Both</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Profile Image</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageCompress}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {imageCompressionStatus && (
              <p className="mt-1 text-xs text-muted-foreground">{imageCompressionStatus}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Upload an image to display on the party profile (will be compressed automatically)</p>
          </div>

          <input type="hidden" name="isActive" value="on" readOnly />

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Address</label>
            <textarea
              name="address"
              autoComplete="off"
              value={addFormValues.address}
              onChange={(event) => handleAddChange('address', event.target.value)}
              required
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Address"
            />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={isSalesOpen}
        onOpenChange={(open) => {
          if (!open && !isSalesLoading) {
            setIsSalesOpen(false);
            setSalesError('');
          }
        }}
        title="Sales Entry"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsSalesOpen(false)} disabled={isSalesLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="sales-entry-form"
              disabled={isSalesLoading}
              className={isSalesLoading ? 'opacity-75 cursor-not-allowed' : ''}
            >
              {isSalesLoading ? '⏳ Saving...' : '💾 Save Entry'}
            </Button>
          </div>
        }
      >
        <form
          id="sales-entry-form"
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSalesError('');
            setIsSalesLoading(true);
            const form = e.currentTarget;
            const formData = new FormData(form);
            const result = await createSaleTransactionWithToast(formData);
            
            if (result.success) {
              success(result.message);
              router.refresh();
              setTimeout(() => {
                setIsSalesOpen(false);
                setSalesFormValues({
                  name: '',
                  mediaName: ''
                });
                setSalesProductRows([createSalesProductRow()]);
                setSalesPartyId(null);
                setSalesPaymentAmount('0');
                setIsSalesLoading(false);
              }, 500);
            } else {
              setSalesError(result.message);
              error(result.message);
              setIsSalesLoading(false);
            }
          }}
        >
          {salesError && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{salesError}</p>
            </div>
          )}

          <div className="sm:col-span-2 relative">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={salesFormValues.name}
              onChange={(event) => handleSalesChange('name', event.target.value)}
              onFocus={handlePartyNameFocus}
              onClick={handlePartyNameClick}
              onBlur={handlePartyNameBlur}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Click or type party name"
            />
            <input type="hidden" name="partyId" value={salesPartyId ?? ''} />
            {showPartySuggestions && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-xl">
                {matchingPartyOptions.length > 0 ? matchingPartyOptions.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onMouseDown={() => selectPartySuggestion(party)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                  >
                    {party.name}
                  </button>
                )) : null}
                {matchingPartyOptions.length === 0 && partyOptions.length > 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matching party found.</div>
                ) : null}
                {partyOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No parties available.</div>
                ) : null}
              </div>
            )}
            {salesNameError ? (
              <p className="mt-2 text-sm text-red-600">{salesNameError}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Media name</label>
              <input
                name="mediaName"
                autoComplete="off"
                value={salesFormValues.mediaName}
                onChange={(event) => handleSalesChange('mediaName', event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="Media name"
              />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Select Product</label>
            <select
              name="salesProduct"
              autoComplete="off"
              value={salesProduct}
              onChange={(event) => handleSalesProductTypeChange(event.target.value as 'feeds' | 'medicin' | 'both')}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="feeds">Feeds</option>
              <option value="medicin">Medicin</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-3 rounded-xl border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Sale Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addSalesProductRow}>
                Add Item
              </Button>
            </div>

            {salesProductRows.map((row, index) => {
              const selectedProduct = productsById.get(row.productId);

              return (
                <div key={row.rowId} className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1.4fr_0.55fr_0.65fr_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Product</label>
                    <select
                      name="productId"
                      required={index === 0}
                      value={row.productId}
                      onChange={(event) => handleProductRowChange(row.rowId, 'productId', event.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select stock product</option>
                      {visibleProductOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.productType} - Stock {product.stockQuantity} {product.unit}
                        </option>
                      ))}
                    </select>
                    {selectedProduct ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Stock: {selectedProduct.stockQuantity} {selectedProduct.unit}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</label>
                    <input
                      name="quantity"
                      autoComplete="off"
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(event) => handleProductRowChange(row.rowId, 'quantity', event.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Qty"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Sale Price</label>
                    <input
                      name="unitPrice"
                      autoComplete="off"
                      type="number"
                      min="0"
                      step="any"
                      value={row.unitPrice}
                      onChange={(event) => handleProductRowChange(row.rowId, 'unitPrice', event.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Price"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSalesProductRow(row.rowId)}
                      disabled={salesProductRows.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}

            {visibleProductOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock products found for this selection.</p>
            ) : null}
          </div>

          <div className="sm:col-span-2 grid gap-4 rounded-xl border bg-muted/10 p-4 text-sm sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount</label>
              <input
                name="discount"
                autoComplete="off"
                type="number"
                min="0"
                step="any"
                value={salesDiscount}
                onChange={(event) => setSalesDiscount(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Total Amount</label>
              <input value={salesNetTotal.toFixed(2)} readOnly className="w-full rounded-md border bg-muted px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Paid Amount</label>
              <input
                name="paymentAmount"
                autoComplete="off"
                type="number"
                min="0"
                step="any"
                value={salesPaymentAmount}
                onChange={(event) => setSalesPaymentAmount(event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Due Amount</label>
              <input value={salesDueAmount.toFixed(2)} readOnly className="w-full rounded-md border bg-muted px-3 py-2" />
            </div>
          </div>

          <input type="hidden" name="paymentMethod" value="CASH" readOnly />
          <input type="hidden" name="discount" value={salesDiscount} readOnly />
          <input type="hidden" name="notes" value={salesFormValues.mediaName ? `Media: ${salesFormValues.mediaName}` : ''} readOnly />
        </form>
      </Dialog>

      <Dialog
        open={isSupplierProductsOpen}
        onOpenChange={(open) => {
          if (!open && !isSupplierProductsLoading) {
            setIsSupplierProductsOpen(false);
            setSupplierProductsError('');
          }
        }}
        title="Supplier Products"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsSupplierProductsOpen(false)} disabled={isSupplierProductsLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="supplier-products-form"
              disabled={isSupplierProductsLoading}
              className={isSupplierProductsLoading ? 'opacity-75 cursor-not-allowed' : ''}
            >
              {isSupplierProductsLoading ? '⏳ Saving...' : '💾 Save Products'}
            </Button>
          </div>
        }
      >
        <form
          id="supplier-products-form"
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSupplierProductsSubmit}
        >
          {supplierProductsError && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{supplierProductsError}</p>
            </div>
          )}

          <div className="sm:col-span-2 relative">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              autoComplete="off"
              value={supplierProductsFormValues.partyName}
              onChange={(event) => handleSupplierProductsChange('partyName', event.target.value)}
              onFocus={handleSupplierPartyNameFocus}
              onClick={handleSupplierPartyNameClick}
              onBlur={handleSupplierPartyNameBlur}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Click or type party name"
            />
            {showSupplierPartySuggestions && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-white shadow-xl">
                {matchingSupplierPartyOptions.length > 0 ? matchingSupplierPartyOptions.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onMouseDown={() => selectSupplierPartySuggestion(party)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                  >
                    {party.name}
                  </button>
                )) : null}
                {matchingSupplierPartyOptions.length === 0 && partyOptions.length > 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matching party found.</div>
                ) : null}
                {partyOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No parties available.</div>
                ) : null}
              </div>
            )}
            {supplierProductsNameError ? (
              <p className="mt-2 text-sm text-red-600">{supplierProductsNameError}</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Product Type</label>
            <select
              value={supplierProductsFormValues.productType}
              onChange={(event) => handleSupplierProductsChange('productType', event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="Both">Both (Egg & Chicken)</option>
              <option value="Egg">Egg/Dim (pieces)</option>
              <option value="Chicken">Chicken/Murgi (kg)</option>
            </select>
          </div>

          {(supplierProductsFormValues.productType === 'Both' || supplierProductsFormValues.productType === 'Egg') && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Egg/Dim Quantity (pieces)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplierProductsFormValues.eggQuantity}
                  onChange={(event) => handleSupplierProductsChange('eggQuantity', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter egg quantity in pieces"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Egg/Dim Price Per Piece (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplierProductsFormValues.eggPrice}
                  onChange={(event) => handleSupplierProductsChange('eggPrice', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter price per piece"
                />
              </div>
            </>
          )}

          {(supplierProductsFormValues.productType === 'Both' || supplierProductsFormValues.productType === 'Chicken') && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Chicken/Murgi Quantity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplierProductsFormValues.chickenQuantity}
                  onChange={(event) => handleSupplierProductsChange('chickenQuantity', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter chicken quantity in kg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Chicken/Murgi Price Per Kg (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplierProductsFormValues.chickenPrice}
                  onChange={(event) => handleSupplierProductsChange('chickenPrice', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Enter price per kg"
                />
              </div>
            </>
          )}

          {/* Total Price Display */}
          <div className="sm:col-span-2 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {supplierProductsFormValues.eggQuantity && supplierProductsFormValues.eggPrice && (
                <div>
                  <p className="text-xs text-muted-foreground">Egg Total</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ৳ {(Number(supplierProductsFormValues.eggQuantity) * Number(supplierProductsFormValues.eggPrice)).toFixed(2)}
                  </p>
                </div>
              )}
              {supplierProductsFormValues.chickenQuantity && supplierProductsFormValues.chickenPrice && (
                <div>
                  <p className="text-xs text-muted-foreground">Chicken Total</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ৳ {(Number(supplierProductsFormValues.chickenQuantity) * Number(supplierProductsFormValues.chickenPrice)).toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Total Price</p>
                <p className="text-lg font-semibold text-green-600">
                  ৳ {(
                    (supplierProductsFormValues.eggQuantity && supplierProductsFormValues.eggPrice 
                      ? Number(supplierProductsFormValues.eggQuantity) * Number(supplierProductsFormValues.eggPrice)
                      : 0) +
                    (supplierProductsFormValues.chickenQuantity && supplierProductsFormValues.chickenPrice
                      ? Number(supplierProductsFormValues.chickenQuantity) * Number(supplierProductsFormValues.chickenPrice)
                      : 0)
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
