export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl rounded-lg border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Architecture ready
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Poultry Farm Management System
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A scalable Next.js 15 foundation with App Router, Prisma, Auth.js, Tailwind and shadcn-style structure.
        </p>
      </div>
    </main>
  );
}
