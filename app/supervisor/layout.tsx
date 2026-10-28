import { AppShell } from '@/components/layout/app-shell';

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell role="SUPERVISOR">{children}</AppShell>;
}
