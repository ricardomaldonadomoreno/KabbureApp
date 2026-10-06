import AdminGate from '@/components/admin-gate'

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminGate>{children}</AdminGate>
}
