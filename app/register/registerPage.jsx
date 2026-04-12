'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import LoginAside from '@/components/LoginAside'
import GLogo from '@/components/GLogo'
import PinInput from '@/components/PinInput'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const [name, setName]             = useState('')
  const [phone, setPhone]           = useState('')
  const [pin, setPin]               = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const { login }                   = useAuth()
  const router                      = useRouter()

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '')
    if (val.startsWith('0')) val = val.slice(1)
    setPhone(val.slice(0, 10))
  }

  const handleRegister = async () => {
    setError('')
    if (!name.trim())      return setError('Please enter your display name.')
    if (phone.length < 10) return setError('Enter a valid mobile number (9xxxxxxxxx).')
    if (pin.length < 6)    return setError('MPIN must be 6 digits.')
    if (pin !== confirmPin) return setError('MPINs do not match.')
    setLoading(true)

    const email = `${phone}@gcash.local`

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: pin,
      options: { data: { display_name: name.trim(), phone_number: phone } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Insert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:    data.user.id,
        name:  name.trim(),
        phone: phone,
      })

    if (profileError) {
      console.warn('Profile insert failed:', profileError.message)
    }

    login({
      id:            data.user.id,
      phone:         phone,
      name:          name.trim(),
      user_metadata: { display_name: name.trim() },
    })
    router.push('/login')
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <LoginAside tagline={"Join millions\nmoving money."} />

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-3 mb-8 md:hidden">
          <GLogo />
          <span className="font-bold text-2xl">GCash</span>
        </div>

        <div className="bg-white rounded-3xl p-8 w-full max-w-[420px] shadow-[0_12px_40px_rgba(0,0,0,.14)]">
          <h3 className="text-2xl font-bold mb-6">Create account</h3>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Display Name</label>
            <div className="flex items-center border border-[#E5E7EB] rounded-[10px] px-3.5 py-3">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 border-none outline-none text-base bg-transparent"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Mobile Number</label>
            <div className="flex items-center border border-[#E5E7EB] rounded-[10px] px-3.5 py-3 gap-2.5">
              <span className="text-sm text-[#6B7280] whitespace-nowrap">🇵🇭 +63</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="9xxxxxxxxx"
                value={phone}
                onChange={handlePhoneChange}
                className="flex-1 border-none outline-none text-base bg-transparent"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Create MPIN</label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Confirm MPIN</label>
            <PinInput value={confirmPin} onChange={setConfirmPin} />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="block w-full bg-[#0056D2] text-white border-none rounded-2xl py-4 text-base font-semibold shadow-[0_4px_14px_rgba(0,86,210,.35)] hover:bg-[#003E9C] transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-[#6B7280] mt-5">
            <Link href="/login" className="text-[#0056D2] font-semibold hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
