'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login')
    }
  }, [user, loading, router])

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F4F7FB]">
      <div className="w-10 h-10 rounded-xl bg-[#0056D2] animate-pulse flex items-center justify-center text-white font-bold text-lg">G</div>
    </div>
  )
}
