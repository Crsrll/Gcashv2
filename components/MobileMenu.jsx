"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MobileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { path: "/dashboard", icon: "fa-solid fa-chart-line", label: "Dashboard" },
    {
      title: "FEATURES",
      items: [
        {
          path: "/subscriptions",
          icon: "fa-solid fa-rectangle-list",
          label: "Subscription Manager",
        },
        {
          path: "/spending-limit",
          icon: "fa-solid fa-coins",
          label: "Spend Limit",
        },
        {
          path: "/scam-detection",
          icon: "fa-solid fa-shield-virus",
          label: "Scam Check",
        },
        {
          path: "/voice-payment",
          icon: "fa-solid fa-microphone-lines",
          label: "Voice Pay",
        },
      ],
    },
  ];

  const handleNavigate = (path) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-[#0056D2] text-white flex items-center justify-center"
      >
        <i className="fa-solid fa-bars text-lg" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-30 p-4 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0056D2] rounded-xl flex items-center justify-center text-white text-xs font-bold">
              G
            </div>
            <span className="font-bold text-[#1A1D23]">GCash</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg bg-gray-100 text-[#6B7280]"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-4">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.title ? (
                <>
                  <p className="text-xs text-[#6B7280] px-3 mb-2">
                    {item.title}
                  </p>
                  <div className="space-y-1">
                    {item.items.map((subItem) => (
                      <button
                        key={subItem.path}
                        onClick={() => handleNavigate(subItem.path)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                      >
                        <i className={`${subItem.icon} w-5`} />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => handleNavigate(item.path)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                >
                  <i className={`${item.icon} w-5`} />
                  <span>{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
