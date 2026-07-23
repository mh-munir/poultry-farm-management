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

export function SupplierProductsDisplay({ partyId }: { partyId: number }) {
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('supplierProductsHistory');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Find the latest product for this party
        const latestProduct = parsed
          .filter((p: SupplierProduct) => p.partyId === partyId)
          .sort((a: SupplierProduct, b: SupplierProduct) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0];
        
        if (latestProduct) {
          setSupplierProducts(latestProduct);
        }
      } catch (err) {
        console.error('Failed to parse supplier products:', err);
      }
    }
  }, [partyId]);

  if (!supplierProducts) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      {supplierProducts.eggQuantity > 0 && (
        <div className="text-xs">
          <span className="font-medium">Egg:</span> {supplierProducts.eggQuantity.toFixed(2)} × ৳{supplierProducts.eggPrice.toFixed(0)} = <span className="font-semibold text-blue-600">৳{supplierProducts.eggTotal.toFixed(0)}</span>
        </div>
      )}
      {supplierProducts.chickenQuantity > 0 && (
        <div className="text-xs">
          <span className="font-medium">Chicken:</span> {supplierProducts.chickenQuantity.toFixed(2)}kg × ৳{supplierProducts.chickenPrice.toFixed(0)} = <span className="font-semibold text-blue-600">৳{supplierProducts.chickenTotal.toFixed(0)}</span>
        </div>
      )}
      {(supplierProducts.eggQuantity > 0 || supplierProducts.chickenQuantity > 0) && (
        <div className="text-xs border-t pt-1 font-semibold text-green-600">
          Total: ৳{supplierProducts.totalPrice.toFixed(0)}
        </div>
      )}
    </div>
  );
}
