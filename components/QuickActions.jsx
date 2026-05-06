"use client";

import { useRouter } from "next/navigation";

export default function QuickActions() {
  const router = useRouter();

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚡</span>
        <h3 className="text-sm font-semibold text-[#1A1D23] uppercase tracking-wide">
          Quick Actions
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Spending Limit Button */}
        <button
          onClick={() => router.push("/spending-limit")}
          className="group bg-white rounded-2xl p-4 text-center border border-[#E5E7EB] hover:border-[#0056D2] hover:shadow-md transition-all duration-200"
        >
          <div className="mb-2 flex justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 24 6 L 40 12 L 40 24 C 40 35 24 42 24 42 C 24 42 8 35 8 24 L 8 12 L 24 6 Z"
                stroke="#0056D2"
                strokeWidth="1.5"
                fill="white"
              />
              <text
                x="24"
                y="30"
                fontSize="20"
                fontWeight="bold"
                fill="#0056D2"
                textAnchor="middle"
              >
                ₱
              </text>
              <path
                d="M 17 35 Q 24 40 31 35"
                stroke="#0056D2"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="24" cy="37" r="2" fill="#0056D2" />
            </svg>
          </div>
          <p className="text-[#1A1D23] font-semibold text-sm">Spend Limit</p>
          <p className="text-[#6B7280] text-[10px] mt-0.5">
            Track & control spending
          </p>
        </button>

        {/* Scam Detection Button */}
        <button
          onClick={() => router.push("/scam-detection")}
          className="group bg-white rounded-2xl p-4 text-center border border-[#E5E7EB] hover:border-[#0056D2] hover:shadow-md transition-all duration-200"
        >
          <div className="mb-2 flex justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="24"
                cy="16"
                r="6"
                fill="#E8F0FE"
                stroke="#0056D2"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
              <path
                d="M 12 32 C 12 25 17 22 24 22 C 31 22 36 25 36 32"
                fill="#E8F0FE"
                stroke="#0056D2"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
              <path
                d="M 20 28 C 17 28 16 31 16 34 L 16 38"
                stroke="#0056D2"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 24 26 C 20 26 18 29 18 33 L 18 39"
                stroke="#0056D2"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 28 27 C 25 27 23 29 23 32 L 23 37"
                stroke="#0056D2"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 32 28 C 30 28 28 31 28 35 L 28 39"
                stroke="#0056D2"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 20 32 C 19 34 19 36 20 38"
                stroke="#0056D2"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 24 30 C 22 32 22 35 24 38"
                stroke="#0056D2"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 28 31 C 26 33 27 36 28 38"
                stroke="#0056D2"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
              <circle
                cx="35"
                cy="13"
                r="6"
                stroke="#0056D2"
                strokeWidth="1.8"
                fill="white"
              />
              <line
                x1="39"
                y1="17"
                x2="44"
                y2="22"
                stroke="#0056D2"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-[#1A1D23] font-semibold text-sm">Scam Check</p>
          <p className="text-[#6B7280] text-[10px] mt-0.5">
            Verify before you pay
          </p>
        </button>

        {/* Voice Payment Button */}
        <button
          onClick={() => router.push("/voice-payment")}
          className="group bg-white rounded-2xl p-4 text-center border border-[#E5E7EB] hover:border-[#0056D2] hover:shadow-md transition-all duration-200"
        >
          <div className="mb-2 flex justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="21"
                y="12"
                width="6"
                height="16"
                rx="3"
                stroke="#0056D2"
                strokeWidth="1.8"
                fill="white"
              />
              <path
                d="M 17 22 C 17 16 20 14 24 14 C 28 14 31 16 31 22"
                stroke="#0056D2"
                strokeWidth="1.8"
                fill="none"
              />
              <path
                d="M 24 28 L 24 34"
                stroke="#0056D2"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M 19 34 L 29 34"
                stroke="#0056D2"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M 10 18 L 10 30"
                stroke="#0056D2"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 6 14 L 6 34"
                stroke="#0056D2"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M 3 10 L 3 38"
                stroke="#0056D2"
                strokeWidth="1"
                strokeLinecap="round"
                strokeOpacity="0.6"
              />
              <path
                d="M 38 18 L 38 30"
                stroke="#0056D2"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 42 14 L 42 34"
                stroke="#0056D2"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M 45 10 L 45 38"
                stroke="#0056D2"
                strokeWidth="1"
                strokeLinecap="round"
                strokeOpacity="0.6"
              />
            </svg>
          </div>
          <p className="text-[#1A1D23] font-semibold text-sm">Voice Pay</p>
          <p className="text-[#6B7280] text-[10px] mt-0.5">Pay by speaking</p>
        </button>
      </div>
    </div>
  );
}
