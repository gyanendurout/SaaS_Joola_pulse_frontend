import type { Metadata } from 'next'
import './globals.css'
import DashboardShell from '@/components/DashboardShell'

export const metadata: Metadata = {
  title: 'JOOLA Pulse',
  description: 'Own-brand digital intelligence platform for JOOLA',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="v2-root">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  )
}
