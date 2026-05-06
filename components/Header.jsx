"use client";

import MobileMenu from "./MobileMenu";

export default function Header({ title, subtitle, showBack = false, onBack }) {
  return (
    <header className="bg-white border-b border-[#E5E7EB] px-4 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div>
          {subtitle && <p className="text-xs text-[#6B7280]">{subtitle}</p>}
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg bg-gray-100"
              >
                <i className="fa-solid fa-arrow-left text-[#1A1D23]" />
              </button>
            )}
            <h1 className="text-lg font-bold text-[#1A1D23]">{title}</h1>
          </div>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
