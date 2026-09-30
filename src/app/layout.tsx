import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kabbure | Información de movilidad',
  description: 'Rutas, vehículos activos e información de movilidad en tiempo real.',
  icons: { icon: '/assets/brand/logo.ico' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
