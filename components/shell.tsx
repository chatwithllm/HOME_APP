import Link from "next/link";

const navItems = [
  { href: "/service-dashboard/receipts", label: "Dashboard" },
  { href: "/service-dashboard/receipt-query", label: "Receipt Query" },
  { href: "/service-dashboard/shopping-plan", label: "Shopping Plan" },
  { href: "/homeassistant", label: "HomeAssistant" },
  { href: "/ideas-log", label: "Ideas Log" },
];

export function AppShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-5 py-6 text-[var(--text)] sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
        <header className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-[var(--shadow)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted)]">
                Smart Receipts · Personal spending intelligence
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
                <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {eyebrow}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--accent)] shadow-[0_1px_3px_rgba(67,40,24,0.08)] hover:border-[var(--accent)] hover:bg-[var(--surface-soft)] hover:text-[var(--accent-dark)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}

export function InsightCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
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
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-7">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}
