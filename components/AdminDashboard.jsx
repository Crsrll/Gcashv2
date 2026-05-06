'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [checking, setChecking] = useState(true)
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState('')
  const [deleting, setDeleting] = useState(null)

  const { user, loading: authLoading } = useAuth()  // ✅ grab authLoading
  const router = useRouter()

  // ── Admin guard ───────────────────────────
  useEffect(() => {
    if (authLoading) return              // ✅ wait — auth not ready yet
    if (!user) { router.push('/login'); return }

    async function checkAdmin() {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!data?.is_admin) {
        router.push('/dashboard')
        return
      }
      setChecking(false)
      fetchUsers()
    }
    checkAdmin()
  }, [user, authLoading])              // ✅ depend on both

  // ── Fetch users ───────────────────────────
  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setUsers(data)
    setLoading(false)
  }

  // ── Delete user ───────────────────────────
  async function handleDelete(userId, userName) {
    const confirmed = confirm(`Delete account of "${userName}"?\n\nThis cannot be undone.`)
    if (!confirmed) return

    setDeleting(userId)

    const { error: profileErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileErr) {
      alert('Failed to delete: ' + profileErr.message)
      setDeleting(null)
      return
    }

    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleting(null)
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  )

  const thisMonth = users.filter(u => {
    const d = new Date(u.created_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const today = users.filter(u =>
    new Date(u.created_at).toDateString() === new Date().toDateString()
  ).length

  // ── Loading / checking screens ────────────
  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6B7280] text-sm">
          <svg className="w-5 h-5 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Verifying access...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-6">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-[10px] bg-[#0056D2] flex items-center justify-center text-white font-bold text-lg">G</div>
          <span className="text-[#0056D2] font-bold text-lg">GCash Admin</span>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1D23] mt-4">User Accounts</h1>
        <p className="text-[#6B7280] text-sm mt-1">Manage all registered users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide font-semibold mb-1">Total Users</p>
          <p className="text-3xl font-bold text-[#1A1D23]">{users.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide font-semibold mb-1">This Month</p>
          <p className="text-3xl font-bold text-[#0056D2]">{thisMonth}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide font-semibold mb-1">Today</p>
          <p className="text-3xl font-bold text-[#0F9D58]">{today}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 flex items-center gap-3 px-4 py-3">
        <svg className="w-4 h-4 text-[#6B7280] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent text-[#1A1D23] placeholder:text-[#6B7280]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-[#6B7280] hover:text-[#1A1D23] text-xs">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#E5E7EB] bg-[#F4F7FB]">
          <span className="col-span-1 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">#</span>
          <span className="col-span-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Name</span>
          <span className="col-span-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Phone</span>
          <span className="col-span-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Joined</span>
          <span className="col-span-2 text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-right">Action</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-[#6B7280] text-sm">
            <svg className="w-5 h-5 animate-spin text-[#0056D2]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading users...
          </div>
        )}

        {error && (
          <div className="py-16 text-center text-red-500 text-sm">
            Failed to load users: {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-[#6B7280] text-sm">
            {search ? 'No users match your search.' : 'No users yet.'}
          </div>
        )}

        {!loading && !error && filtered.map((u, i) => {
          const formatted = new Date(u.created_at).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric'
          })
          const initials = u.name
            ? u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            : '?'
          const isCurrentUser = u.id === user?.id
          const isDeleting    = deleting === u.id

          return (
            <div
              key={u.id}
              className={`grid grid-cols-12 px-5 py-4 border-b border-[#E5E7EB] last:border-0 items-center transition-colors ${isDeleting ? 'opacity-40' : 'hover:bg-[#F4F7FB]'}`}
            >
              <span className="col-span-1 text-sm text-[#6B7280]">{i + 1}</span>

              <div className="col-span-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center text-[#0056D2] text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1D23] truncate">{u.name || '—'}</p>
                  {u.is_admin && (
                    <span className="text-[10px] font-semibold text-[#0056D2] bg-[#E8F0FE] px-1.5 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
              </div>

              <div className="col-span-3">
                <span className="text-sm text-[#1A1D23] font-mono">+63 {u.phone || '—'}</span>
              </div>

              <div className="col-span-3">
                <span className="text-xs text-[#6B7280]">{formatted}</span>
              </div>

              <div className="col-span-2 flex justify-end">
                {isCurrentUser ? (
                  <span className="text-xs text-[#6B7280] italic">You</span>
                ) : (
                  <button
                    onClick={() => handleDelete(u.id, u.name)}
                    disabled={isDeleting}
                    className="text-xs font-semibold text-[#D32F2F] border border-[#D32F2F] rounded-full px-3 py-1 hover:bg-[#D32F2F] hover:text-white transition-colors disabled:opacity-40"
                  >
                    {isDeleting ? '...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#6B7280] mt-3 text-right">
          Showing {filtered.length} of {users.length} users
        </p>
      )}
    </div>
  )
}
