'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Show nothing while session is being resolved
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F4F7FB]">
        <div className="w-10 h-10 rounded-xl bg-[#0056D2] animate-pulse flex items-center justify-center text-white font-bold text-lg">G</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-dvh bg-[#F4F7FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
