"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GLogo from "./GLogo";

const NAV = [
  { href: "/dashboard", icon: "fa-solid fa-chart-line", label: "Overview" },
  {
    label: "Features",
    icon: "fa-solid fa-crown",
    isParent: true,
    children: [
      {
        href: "/subscriptions",
        icon: "fa-solid fa-rectangle-list",
        label: "Subscription Manager",
      },
      {
        href: "/spending-limit",
        icon: "fa-solid fa-coins",
        label: "Spend Limit",
      },
      {
        href: "/scam-detection",
        icon: "fa-solid fa-shield-haltered",
        label: "Scam Check",
      },
      {
        href: "/voice-payment",
        icon: "fa-solid fa-microphone-lines",
        label: "Voice Pay",
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({ Features: true });

  const toggleMenu = (label) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (href) => pathname === href;

  return (
    <nav className="hidden md:flex flex-col w-65 white border-r border-[#E5E7EB] px-4 py-7 sticky top-0 h-screen shrink-0">
      <div className="flex items-center gap-3 mb-8 px-2">
        <GLogo small />
        <span className="font-bold text-xl text-[#1A1D23]">GCash</span>
      </div>

      <ul className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          if (item.isParent) {
            const isExpanded = expandedMenus[item.label];
            const hasActiveChild = item.children?.some((child) =>
              isActive(child.href),
            );

            return (
              <li key={item.label} className="mb-1">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                    hasActiveChild
                      ? "bg-[#E8F0FE] text-[#0056D2] font-semibold"
                      : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1D23]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </div>
                  <i
                    className={`fa-solid fa-chevron-${isExpanded ? "down" : "right"} text-xs transition-transform`}
                  />
                </button>

                {isExpanded && (
                  <ul className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const active = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`flex items-center gap-3 px-3.5 py-2 rounded-[10px] text-sm transition-all ${
                              active
                                ? "bg-[#E8F0FE] text-[#0056D2] font-semibold"
                                : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1D23]"
                            }`}
                          >
                            <i className={`${child.icon} w-4`} />
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          }

          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
                  active
                    ? "bg-[#E8F0FE] text-[#0056D2] font-semibold"
                    : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1A1D23]"
                }`}
              >
                <i className={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-all w-full mt-auto"
      >
        <i className="fa-solid fa-arrow-right-from-bracket" />
        <span>Logout</span>
      </button>
    </nav>
  );
}
