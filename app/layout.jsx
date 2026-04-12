import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: 'GCash — Subscription Manager',
  description: 'Track and manage your subscriptions',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
