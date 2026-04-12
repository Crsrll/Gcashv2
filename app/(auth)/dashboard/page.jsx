'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import SubscriptionCard from '@/components/SubscriptionCard'
import { supabase } from '@/lib/supabase'

const FILTERS = ['All', 'Active', 'Due Soon', 'Cancelled']

function getGreeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${time}, ${name} 👋`
}

// Mirror of main.js: mark active subs renewing within 7 days as 'due soon'
function applyDueSoon(subs) {
  const now = new Date()
  return subs.map(s => {
    if (s.status === 'active') {
      const days = (new Date(s.renew_date) - now) / (1000 * 60 * 60 * 24)
      if (days <= 7 && days >= 0) return { ...s, status: 'due soon' }
    }
    return s
  })
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [subs, setSubs] = useState([])
  const [filter, setFilter] = useState('All')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSubs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('renew_date', { ascending: true })

    setSubs(applyDueSoon(data || []))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const handleLogout = () => { logout(); router.push('/login') }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', cancelTarget.id)
    setCancelTarget(null)
    fetchSubs()
  }

  const filtered = filter === 'All'
    ? subs
    : subs.filter(s => s.status?.toLowerCase() === filter.toLowerCase())

  const activeSubs  = subs.filter(s => s.status === 'active')
  const dueSoonSubs = subs.filter(s => s.status === 'due soon')
  const totalMonthly = [...activeSubs, ...dueSoonSubs].reduce((acc, s) => acc + Number(s.price || 0), 0)

  // Get display name from user metadata (matching main.js behaviour)
  const displayName = user?.user_metadata?.display_name || user?.name || 'User'

  return (
    <>
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-sm text-[#6B7280]">{getGreeting(displayName)}</p>
          <h2 className="text-xl font-bold text-[#1A1D23]">My Subscriptions</h2>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/apps"
            className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] shadow-sm"
          >
            <i className="fa-solid fa-border-all text-sm" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] shadow-sm"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-sm" />
          </button>
        </div>
      </header>

      {/* Hero card */}
      <div className="mx-4 md:mx-7 bg-gradient-to-br from-[#0056D2] to-[#0076FF] rounded-3xl p-6 text-white shadow-[0_8px_24px_rgba(0,86,210,.35)]">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">Total monthly spend</p>
            <h1 className="text-4xl font-bold">₱ {totalMonthly.toLocaleString()}</h1>
            <span className="text-white/60 text-xs mt-1 block">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex gap-2.5">
            <div className="bg-white/20 rounded-xl px-4 py-2.5 text-center min-w-[64px]">
              <strong className="text-lg font-bold block">{activeSubs.length}</strong>
              <span className="text-white/70 text-xs">Active</span>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2.5 text-center min-w-[64px]">
              <strong className="text-lg font-bold block">{dueSoonSubs.length}</strong>
              <span className="text-white/70 text-xs">Due Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 md:px-7 py-5 overflow-x-auto scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-[#0056D2] text-white border-[#0056D2]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#0056D2] hover:text-[#0056D2]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Subscription list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 px-4 md:px-7 pb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 h-16 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#6B7280]">
            <i className="fa-solid fa-layer-group text-4xl mb-3 block opacity-30" />
            <p className="font-medium">No subscriptions here</p>
            {filter === 'All' && (
              <Link href="/apps" className="inline-block mt-3 text-[#0056D2] text-sm font-semibold hover:underline">
                Browse Apps →
              </Link>
            )}
          </div>
        ) : (
          filtered.map(sub => (
            <SubscriptionCard key={sub.id} sub={sub} onCancel={setCancelTarget} />
          ))
        )}
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-[0_12px_40px_rgba(0,0,0,.2)] text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl"
              style={{ backgroundColor: cancelTarget.color || '#0056D2' }}
            >
              <i className={cancelTarget.icon} />
            </div>
            <h3 className="text-xl font-bold mb-2">Cancel {cancelTarget.name}?</h3>
            <p className="text-[#6B7280] text-sm mb-6">
              Your subscription will be cancelled and won&apos;t renew next month.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold hover:bg-gray-50 transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
