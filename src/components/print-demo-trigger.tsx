'use client';

export function PrintDemoTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed right-4 top-4 z-50 bg-white border px-3 py-2 rounded shadow"
    >
      Print
    </button>
  );
}
