import { AppShell, SectionCard } from "@/components/shell";

export default function HomeAssistantPage() {
  return (
    <AppShell
      title="HomeAssistant"
      eyebrow="Automation"
      description="Reserved route for integrating home telemetry, automations, and any overlap between household state and shopping or receipt workflows."
    >
      <SectionCard
        title="Reserved surface"
        description="Phase 1 keeps this route available in the shell so future Home Assistant work plugs into a stable navigation model."
      >
        <p className="text-sm leading-6 text-[var(--muted)]">
          No fake dashboards here. Just a clean placeholder with enough dignity to survive until real functionality shows up.
        </p>
      </SectionCard>
    </AppShell>
  );
}
