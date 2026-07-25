import type { Metadata } from 'next'
import './globals.css'
import ConditionalNav from './components/ConditionalNav'

export const metadata: Metadata = {
  title: 'Event Management - Jain University',
  description: 'Department Events Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=Plus+Jakarta+Sans:wght@600;700;800;900&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
      </head>
      <body>
        <ConditionalNav />
        {children}
      </body>
    </html>
  )
}
