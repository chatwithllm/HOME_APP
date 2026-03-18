import { CurrencyPreferencesProvider } from "@/components/currency-preferences";
import { TopNav } from "@/components/top-nav";

export function AppShell({
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <CurrencyPreferencesProvider>
      <main className="min-h-screen px-5 py-6 text-[var(--text)] sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
          <TopNav />
          {children}
        </div>
      </main>
    </CurrencyPreferencesProvider>
  );
}

export function InsightCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.05em]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </section>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || description);

  return (
    <section
      className={`rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-7 ${className}`}
    >
      {hasHeader ? (
        <div className="mb-6">
          {title ? <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2> : null}
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
