'use client';

import { useEffect, useState } from 'react';

type PartyProduct = {
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

export function PartyProductsDisplay({ partyId }: { partyId: number }) {
  const [partyProducts, setPartyProducts] = useState<PartyProduct | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('supplierProductsHistory');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Find the latest product for this party
        const latestProduct = parsed
          .filter((p: PartyProduct) => p.partyId === partyId)
          .sort((a: PartyProduct, b: PartyProduct) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0];
        
        if (latestProduct) {
          setPartyProducts(latestProduct);
        }
      } catch (err) {
        console.error('Failed to parse party products:', err);
      }
    }
  }, [partyId]);

  if (!partyProducts) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      {partyProducts.eggQuantity > 0 && (
        <div className="text-xs">
          <span className="font-medium">Egg:</span> {partyProducts.eggQuantity.toFixed(2)} × ৳{partyProducts.eggPrice.toFixed(0)} = <span className="font-semibold text-blue-600">৳{partyProducts.eggTotal.toFixed(0)}</span>
        </div>
      )}
      {partyProducts.chickenQuantity > 0 && (
        <div className="text-xs">
          <span className="font-medium">Chicken:</span> {partyProducts.chickenQuantity.toFixed(2)}kg × ৳{partyProducts.chickenPrice.toFixed(0)} = <span className="font-semibold text-blue-600">৳{partyProducts.chickenTotal.toFixed(0)}</span>
        </div>
      )}
      {(partyProducts.eggQuantity > 0 || partyProducts.chickenQuantity > 0) && (
        <div className="text-xs border-t pt-1 font-semibold text-green-600">
          Total: ৳{partyProducts.totalPrice.toFixed(0)}
        </div>
      )}
    </div>
  );
}
