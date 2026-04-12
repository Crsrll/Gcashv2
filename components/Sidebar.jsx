'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import GLogo from './GLogo'

const NAV = [
  { href: '/dashboard', icon: 'fa-solid fa-layer-group', label: 'Subscriptions' },
  { href: '/apps',      icon: 'fa-solid fa-table-cells-large', label: 'Browse Apps' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <nav className="hidden md:flex flex-col w-[220px] bg-white border-r border-[#E5E7EB] px-4 py-7 sticky top-0 h-screen flex-shrink-0">
      <div className="flex items-center gap-3 mb-8">
        <GLogo small />
        <span className="font-bold text-lg text-[#1A1D23]">GCash</span>
      </div>

      <ul className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#E8F0FE] text-[#0056D2] font-semibold'
                    : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1D23]'
                }`}
              >
                <i className={icon} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-all w-full"
      >
        <i className="fa-solid fa-arrow-right-from-bracket" />
        <span>Logout</span>
      </button>
    </nav>
  )
}
