'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import AppCard from '@/components/AppCard'
import { supabase } from '@/lib/supabase'

export default function AppsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [apps, setApps] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [subscribedIds, setSubscribedIds] = useState(new Set())
  const [modalApp, setModalApp] = useState(null)
  const [subscribing, setSubscribing] = useState(false)
  const [loadingApps, setLoadingApps] = useState(true)

  // Fetch available apps from Supabase (mirrors apps.js)
  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from('available_apps')
      .select('*')
      .order('name', { ascending: true })
    setApps(data || [])
    setLoadingApps(false)
  }, [])

  // Fetch user's active subscriptions for duplicate prevention
  const fetchSubscribed = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('subscriptions')
      .select('app_id')
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
    setSubscribedIds(new Set((data || []).map(s => s.app_id)))
  }, [user])

  useEffect(() => { fetchApps(); fetchSubscribed() }, [fetchApps, fetchSubscribed])

  const handleLogout = () => { logout(); router.push('/login') }

  const handleSubscribe = async () => {
    if (!modalApp || !user) return
    setSubscribing(true)

    const renewDate = new Date()
    renewDate.setMonth(renewDate.getMonth() + 1)

    await supabase.from('subscriptions').insert({
      user_id:    user.id,
      app_id:     modalApp.id,
      name:       modalApp.name,
      icon:       modalApp.icon,
      color:      modalApp.color,
      price:      modalApp.price,
      status:     'active',
      renew_date: renewDate.toISOString().split('T')[0],
    })

    setSubscribedIds(prev => new Set([...prev, modalApp.id]))
    setModalApp(null)
    setSubscribing(false)
  }

  // Derive categories from fetched apps
  const categories = ['All', ...new Set(apps.map(a => a.category).filter(Boolean))]

  const filtered = apps.filter(app => {
    const matchCat    = category === 'All' || app.category === category
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <>
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-sm text-[#6B7280]">Subscribe to a service</p>
          <h2 className="text-xl font-bold text-[#1A1D23]">Browse Apps</h2>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] shadow-sm"
          >
            <i className="fa-solid fa-layer-group text-sm" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] shadow-sm"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-sm" />
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="px-4 md:px-7 mb-6 flex flex-col gap-3">
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 flex items-center gap-3">
          <i className="fa-solid fa-magnifying-glass text-[#6B7280] text-sm" />
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border-none outline-none text-sm bg-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-[#0056D2] text-white border-[#0056D2]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#0056D2] hover:text-[#0056D2]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Apps grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 md:px-7 pb-8">
        {loadingApps ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 h-48 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#6B7280]">
            <i className="fa-solid fa-magnifying-glass text-4xl mb-3 block opacity-30" />
            <p className="font-medium">No apps found</p>
          </div>
        ) : (
          filtered.map(app => (
            <AppCard
              key={app.id}
              app={app}
              isSubscribed={subscribedIds.has(app.id)}
              onSubscribe={setModalApp}
            />
          ))
        )}
      </div>

      {/* Subscribe modal */}
      {modalApp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-[0_12px_40px_rgba(0,0,0,.2)] text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl"
              style={{ backgroundColor: modalApp.color }}
            >
              <i className={`fa-brands ${modalApp.icon}`} />
            </div>
            <h3 className="text-xl font-bold mb-1">{modalApp.name}</h3>
            <p className="text-[#6B7280] text-sm mb-4">{modalApp.category}</p>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-3xl font-bold text-[#0056D2]">₱{Number(modalApp.price).toLocaleString()}</span>
              <span className="text-[#6B7280] text-sm">/ month</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalApp(null)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold hover:bg-[#003E9C] transition-colors disabled:opacity-60"
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
