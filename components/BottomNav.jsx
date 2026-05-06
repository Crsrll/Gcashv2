"use client";

import { useRouter, usePathname } from "next/navigation";

const NAV_ITEMS = [
  { path: "/dashboard", icon: "fa-solid fa-house", label: "Home" },
  {
    path: "/subscriptions",
    icon: "fa-solid fa-rectangle-list",
    label: "Subscriptions",
  },
  {
    path: "/scam-detection",
    icon: "fa-solid fa-shield-haltered",
    label: "Scam Check",
  },
  { path: "/spending-limit", icon: "fa-solid fa-coins", label: "Spend Limit" },
  {
    path: "/voice-payment",
    icon: "fa-solid fa-microphone-lines",
    label: "Voice Pay",
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-2 z-20">
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <i
                className={`${item.icon} text-xl ${
                  isActive ? "text-[#0056D2]" : "text-[#6B7280]"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isActive ? "text-[#0056D2] font-medium" : "text-[#6B7280]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
