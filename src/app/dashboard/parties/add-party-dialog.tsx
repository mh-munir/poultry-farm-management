'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdateParty, recordSaleForParty } from '@/features/parties/actions';

type PartyOption = {
  id: number;
  name: string;
};

type AddPartyDialogProps = {
  partyOptions: PartyOption[];
};

export function AddPartyDialog({ partyOptions }: AddPartyDialogProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [salesProduct, setSalesProduct] = useState<'feeds' | 'medicin' | 'both'>('feeds');
  const [salesNameError, setSalesNameError] = useState('');
  const [salesPartyId, setSalesPartyId] = useState<number | null>(null);
  const [showPartySuggestions, setShowPartySuggestions] = useState(false);
  const [addFormValues, setAddFormValues] = useState({
    name: '',
    phone: '',
    farmName: '',
    address: '',
    partyType: 'BOTH'
  });
  const [salesFormValues, setSalesFormValues] = useState({
    name: '',
    feedName: '',
    feedQuantity: '',
    feedPrice: '',
    medicineName: '',
    medicineQuantity: '',
    medicinePrice: '',
    mediaName: ''
  });

  const handleAddChange = (field: string, value: string) => {
    const normalizedValue = field === 'phone'
      ? value.replace(/[^0-9]/g, '').slice(0, 11)
      : value;

    setAddFormValues((current) => ({ ...current, [field]: normalizedValue }));
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

  const handlePartyNameBlur = () => {
    setTimeout(() => setShowPartySuggestions(false), 150);
  };

  const selectPartySuggestion = (party: PartyOption) => {
    setSalesFormValues((current) => ({ ...current, name: party.name }));
    setSalesPartyId(party.id);
    setSalesNameError('');
    setShowPartySuggestions(false);
  };

  const salesFeedTotal = Number(salesFormValues.feedQuantity || 0) * Number(salesFormValues.feedPrice || 0);
  const salesMedTotal = Number(salesFormValues.medicineQuantity || 0) * Number(salesFormValues.medicinePrice || 0);
  const salesTotal = salesFeedTotal + salesMedTotal;

  const matchingPartyOptions = salesFormValues.name.trim().length > 0
    ? partyOptions.filter((party) => party.name.toLowerCase().includes(salesFormValues.name.toLowerCase()))
    : partyOptions;

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

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={() => setIsAddOpen(true)}>
          Add Parties
        </Button>
        <Button type="button" variant="secondary" onClick={() => setIsSalesOpen(true)}>
          Sales Entry
        </Button>
      </div>

      <Dialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add Party"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-party-form">
              Save Party
            </Button>
          </div>
        }
      >
        <form
          id="add-party-form"
          action={createOrUpdateParty}
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={addFormValues.name}
              onChange={(event) => handleAddChange('name', event.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
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
            <label className="mb-2 block text-sm font-medium">Farm name</label>
            <input
              name="farmName"
              autoComplete="off"
              value={addFormValues.farmName}
              onChange={(event) => handleAddChange('farmName', event.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Farm name"
            />
          </div>

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
        onOpenChange={setIsSalesOpen}
        title="Sales Entry"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsSalesOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="sales-entry-form">
              Save Entry
            </Button>
          </div>
        }
      >
        <form
          id="sales-entry-form"
          action={recordSaleForParty}
          autoComplete="off"
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 relative">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={salesFormValues.name}
              onChange={(event) => handleSalesChange('name', event.target.value)}
              onFocus={handlePartyNameFocus}
              onBlur={handlePartyNameBlur}
              required
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Party name"
            />
            <input type="hidden" name="partyId" value={salesPartyId ?? ''} />
            {showPartySuggestions && (
              <div className="absolute left-0 right-0 z-10 max-h-64 overflow-y-auto rounded-b-md border border-border bg-card shadow-lg">
                {(matchingPartyOptions.length > 0 ? matchingPartyOptions : partyOptions).map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onMouseDown={() => selectPartySuggestion(party)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  >
                    {party.name}
                  </button>
                ))}
                {matchingPartyOptions.length === 0 && partyOptions.length === 0 ? (
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
              onChange={(event) => setSalesProduct(event.target.value as 'feeds' | 'medicin' | 'both')}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="feeds">Feeds</option>
              <option value="medicin">Medicin</option>
              <option value="both">Both</option>
            </select>
          </div>

          {(salesProduct === 'feeds' || salesProduct === 'both') && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Feed name</label>
                <input
                  name="feedName"
                  autoComplete="off"
                  value={salesFormValues.feedName}
                  onChange={(event) => handleSalesChange('feedName', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Feed name"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium">Feed quantity</label>
                <input
                  name="feedQuantity"
                  autoComplete="off"
                  type="number"
                  min="0"
                  step="any"
                  value={salesFormValues.feedQuantity}
                  onChange={(event) => handleSalesChange('feedQuantity', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Feed quantity"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium">Feed price</label>
                <input
                  name="feedPrice"
                  autoComplete="off"
                  type="number"
                  min="0"
                  step="any"
                  value={salesFormValues.feedPrice}
                  onChange={(event) => handleSalesChange('feedPrice', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Feed price"
                />
              </div>
            </>
          )}

          {(salesProduct === 'medicin' || salesProduct === 'both') && (
            <>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Medicine name</label>
                <input
                  name="medicineName"
                  autoComplete="off"
                  value={salesFormValues.medicineName}
                  onChange={(event) => handleSalesChange('medicineName', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Medicine name"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium">Medicine quantity</label>
                <input
                  name="medicineQuantity"
                  autoComplete="off"
                  type="number"
                  min="0"
                  step="any"
                  value={salesFormValues.medicineQuantity}
                  onChange={(event) => handleSalesChange('medicineQuantity', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Medicine quantity"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-2 block text-sm font-medium">Medicine price</label>
                <input
                  name="medicinePrice"
                  autoComplete="off"
                  type="number"
                  min="0"
                  step="any"
                  value={salesFormValues.medicinePrice}
                  onChange={(event) => handleSalesChange('medicinePrice', event.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2"
                  placeholder="Medicine price"
                />
              </div>
            </>
          )}

          
          <div className="sm:col-span-2 rounded-xl border bg-muted/10 p-4 text-sm">
            <div className="flex flex-col gap-2">
              {(salesProduct === 'feeds' || salesProduct === 'both') && (
                <div>
                  <span className="font-medium">Feeds total:</span> {salesFeedTotal.toFixed(2)}
                </div>
              )}
              {(salesProduct === 'medicin' || salesProduct === 'both') && (
                <div>
                  <span className="font-medium">Medicin total:</span> {salesMedTotal.toFixed(2)}
                </div>
              )}
              <div>
                <span className="font-semibold">Total price:</span> {salesTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <input type="hidden" name="partyType" value="BOTH" />
        </form>
      </Dialog>
    </>
  );
}
