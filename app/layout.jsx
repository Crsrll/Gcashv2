import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: {
    default: 'GCash — Subscription Manager',
    template: '%s — GCash',   // pages just set the prefix
  },
  description: 'Track and manage your subscriptions',
  icons: {
    icon: '/gcash.png',        // put favicon.png in /public folder
  }
}

export const viewport = {
  themeColor: '#0056D2',
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
