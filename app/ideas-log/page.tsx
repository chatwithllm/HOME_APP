import { AppShell, SectionCard } from "@/components/shell";

export default function IdeasLogPage() {
  return (
    <AppShell
      title="Ideas Log"
      eyebrow="Backlog"
      description="A landing zone for product ideas, experiments, and improvements before they evaporate like every other brilliant midnight thought."
    >
      <SectionCard
        title="Backlog staging area"
        description="Eventually this can connect to stored ideas, but Phase 1 only promises a coherent route shell and consistent visual system."
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          Clean structure first, clever features second. That is how we avoid rebuilding the same app three times for sport.
        </p>
      </SectionCard>
    </AppShell>
  );
}
