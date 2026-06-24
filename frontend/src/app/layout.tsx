import type { Metadata } from 'next'
import { Inter }         from 'next/font/google'
import { AuthProvider }  from '@/store/authStore'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'Reclaim — Lost & Found',
  description: 'Find your lost items or help others find theirs'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
