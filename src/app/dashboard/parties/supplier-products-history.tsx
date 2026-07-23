'use client';

import { useEffect, useState } from 'react';

type SupplierProduct = {
  partyId: number | null;
  partyName: string;
  productType: string;
  eggQuantity: number;
  eggPrice: number;
  eggTotal: number;
  chickenQuantity: number;
  chickenPrice: number;
  chickenTotal: number;
  totalPrice: number;
  timestamp: string;
};

export function SupplierProductsHistory() {
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('supplierProductsHistory');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setSupplierProducts(parsed.reverse()); // Show latest first
      } catch (err) {
        console.error('Failed to parse supplier products history:', err);
      }
    }
  }, []);

  if (supplierProducts.length === 0) {
    return (
      <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-4 py-4 bg-muted/20">
          <h2 className="text-lg font-semibold">Supplier Products History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Party Name</th>
                <th className="px-4 py-3 font-medium">Product Type</th>
                <th className="px-4 py-3 font-medium">Egg/Dim Qty (pieces)</th>
                <th className="px-4 py-3 font-medium">Egg/Dim Price (Per piece)</th>
                <th className="px-4 py-3 font-medium">Egg Total</th>
                <th className="px-4 py-3 font-medium">Chicken/Murgi Qty (kg)</th>
                <th className="px-4 py-3 font-medium">Chicken/Murgi Price</th>
                <th className="px-4 py-3 font-medium">Chicken Total</th>
                <th className="px-4 py-3 font-medium">Total Price</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                  No supplier products recorded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-4 bg-muted/20">
        <h2 className="text-lg font-semibold">Supplier Products History</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Party Name</th>
              <th className="px-4 py-3 font-medium">Product Type</th>
              <th className="px-4 py-3 font-medium">Egg/Dim Qty (pieces)</th>
              <th className="px-4 py-3 font-medium">Egg/Dim Price (Per piece)</th>
              <th className="px-4 py-3 font-medium">Egg Total</th>
              <th className="px-4 py-3 font-medium">Chicken/Murgi Qty (kg)</th>
              <th className="px-4 py-3 font-medium">Chicken/Murgi Price (Per kg)</th>
              <th className="px-4 py-3 font-medium">Chicken Total</th>
              <th className="px-4 py-3 font-medium">Total Price</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {supplierProducts.map((product, index) => {
              const date = new Date(product.timestamp);
              const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <tr key={index} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{product.partyName}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      {product.productType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.eggQuantity > 0 ? product.eggQuantity.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {product.eggPrice > 0 ? `৳ ${product.eggPrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">
                    {product.eggTotal > 0 ? `৳ ${product.eggTotal.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {product.chickenQuantity > 0 ? product.chickenQuantity.toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {product.chickenPrice > 0 ? `৳ ${product.chickenPrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">
                    {product.chickenTotal > 0 ? `৳ ${product.chickenTotal.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600 text-base">
                    ৳ {product.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formattedDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-4 bg-muted/10">
        <p className="text-sm text-muted-foreground">
          Total Records: {supplierProducts.length}
        </p>
      </div>
    </div>
  );
}
