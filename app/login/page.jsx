'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import LoginAside from '@/components/LoginAside'
import GLogo from '@/components/GLogo'
import PinInput from '@/components/PinInput'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async () => {
    setError('')
    if (phone.length < 10) return setError('Enter a valid 10-digit mobile number.')
    if (pin.length < 6)   return setError('Enter your 6-digit MPIN.')
    setLoading(true)

    const email = `${phone}@gcash.local`
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pin })

    if (authError) {
      setError('Incorrect number or MPIN.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    login({ id: data.user.id, name: profile?.name || 'User', phone })
    router.push('/dashboard')
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <LoginAside
        tagline={"Your money,\nalways moving."}
        sub="Track subscriptions and stay in control."
      />

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile brand */}
        <div className="flex items-center gap-3 mb-8 md:hidden">
          <GLogo />
          <span className="font-bold text-2xl">GCash</span>
        </div>

        <div className="bg-white rounded-3xl p-8 w-full max-w-[420px] shadow-[0_12px_40px_rgba(0,0,0,.14)]">
          <h3 className="text-2xl font-bold mb-1">Welcome back</h3>
          <p className="text-[#6B7280] text-sm mb-6">Enter your registered mobile number</p>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
              Mobile Number
            </label>
            <div className="flex items-center border border-[#E5E7EB] rounded-[10px] px-3.5 py-3 gap-2.5">
              <span className="text-sm text-[#6B7280] whitespace-nowrap">🇵🇭 +63</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="9xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 border-none outline-none text-base bg-transparent"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
              MPIN
            </label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="block w-full bg-[#0056D2] text-white border-none rounded-2xl py-4 text-base font-semibold shadow-[0_4px_14px_rgba(0,86,210,.35)] hover:bg-[#003E9C] transition-colors disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <p className="text-center text-sm text-[#6B7280] mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#0056D2] font-semibold hover:underline">
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
