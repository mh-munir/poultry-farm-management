'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';

interface MedicineItem {
  id?: number;
  name: string;
  quantity: number;
  buyRate: number;
  salesRate: number;
}

export default function MedicinePage() {
  const [medicineItems, setMedicineItems] = useState<MedicineItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', quantity: '', buyRate: '', salesRate: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadItems = async () => {
      const response = await fetch('/api/stock/medicine');
      const data = await response.json();
      setMedicineItems(data);
    };

    loadItems();
  }, []);

  const totalMedicineStockValue = medicineItems.reduce((total, item) => total + item.quantity * item.buyRate, 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(formData.quantity);
    const buyRate = Number(formData.buyRate);
    const salesRate = Number(formData.salesRate);

    if (!formData.name || Number.isNaN(quantity) || Number.isNaN(buyRate) || Number.isNaN(salesRate)) {
      return;
    }

    setIsSaving(true);
    const response = await fetch('/api/stock/medicine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formData.name, quantity, buyRate, salesRate })
    });

    if (response.ok) {
      const newItem = await response.json();
      setMedicineItems((prev) => [...prev, newItem]);
      setFormData({ name: '', quantity: '', buyRate: '', salesRate: '' });
      setIsFormOpen(false);
    }

    setIsSaving(false);
  };

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Medicine Stock</h1>
            <p className="mt-2 text-sm text-muted-foreground">Track medicine inventory, quantity, and pricing in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <div className="font-medium">Total Stock Value</div>
              <div className="text-primary">{totalMedicineStockValue.toLocaleString()} TK</div>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Add Stock Medicine
            </button>
          </div>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} title="Add Stock Medicine">
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Medicine Name</label>
              <input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Medicine name"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Quantity"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Buy Rate</label>
              <input
                type="number"
                value={formData.buyRate}
                onChange={(event) => setFormData((prev) => ({ ...prev, buyRate: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Buy rate"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sales Rate</label>
              <input
                type="number"
                value={formData.salesRate}
                onChange={(event) => setFormData((prev) => ({ ...prev, salesRate: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Sales rate"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={isSaving} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Save Medicine Stock'}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>

        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Medicine Name</th>
                <th className="px-4 py-3 text-left font-medium">Quantity</th>
                <th className="px-4 py-3 text-left font-medium">Buy Rate</th>
                <th className="px-4 py-3 text-left font-medium">Sales Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {medicineItems.map((item) => (
                <tr key={`${item.id ?? item.name}-${item.buyRate}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.buyRate}</td>
                  <td className="px-4 py-3">{item.salesRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
