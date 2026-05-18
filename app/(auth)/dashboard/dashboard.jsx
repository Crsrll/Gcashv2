"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
// import Header from '@/components/Header';
import BottomNav from "@/components/BottomNav";

function getGreeting(name) {
  const h = new Date().getHours();
  const time =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${time}, ${name} 👋`;
}

function calculateTotalMonthlySpend(subs) {
  const activeSubs = subs.filter(
    (s) => s.status === "active" || s.status === "due soon",
  );
  return activeSubs.reduce((acc, s) => acc + Number(s.price || 0), 0);
}

function applyDueSoon(subs) {
  const now = new Date();
  return subs.map((s) => {
    if (s.status === "active") {
      const days = (new Date(s.renew_date) - now) / (1000 * 60 * 60 * 24);
      if (days <= 7 && days >= 0) return { ...s, status: "due soon" };
    }
    return s;
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userBalance, setUserBalance] = useState(0);
  const [totalMonthlySpend, setTotalMonthlySpend] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // First, try to fetch existing balance
        let currentBalance = 5000; // Default fallback

        const { data: balanceData, error: balanceError } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406

        if (balanceError) {
          console.error("Error fetching balance:", balanceError);
        }

        if (balanceData) {
          // Balance exists, use it
          currentBalance = balanceData.balance;
        } else {
          // No balance record found, create one
          console.log("No balance found, creating new record...");
          const { data: newBalance, error: insertError } = await supabase
            .from("user_balances")
            .insert([{ user_id: user.id, balance: 5000 }])
            .select()
            .maybeSingle();

          if (insertError) {
            console.error("Error creating balance:", insertError);
            // Keep default balance
          } else if (newBalance) {
            currentBalance = newBalance.balance;
          }
        }

        // Fetch subscriptions
        const { data: subsData, error: subsError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id);

        if (subsError) {
          console.error("Error fetching subscriptions:", subsError);
        }

        const subsWithStatus = applyDueSoon(subsData || []);

        const totalSpend = calculateTotalMonthlySpend(subsWithStatus);
        const active = subsWithStatus.filter(
          (s) => s.status === "active",
        ).length;
        const dueSoon = subsWithStatus.filter(
          (s) => s.status === "due soon",
        ).length;

        setUserBalance(currentBalance);
        setTotalMonthlySpend(totalSpend);
        setActiveCount(active);
        setDueSoonCount(dueSoon);
        setError(null);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Failed to load dashboard data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const displayName = user?.user_metadata?.display_name || user?.name || "User";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2] mx-auto"></div>
          <p className="mt-4 text-[#6B7280]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-exclamation-triangle text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1D23] mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-sm text-[#6B7280] mb-4">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 bg-[#0056D2] text-white rounded-xl text-sm font-semibold"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header - Same as before */}
      <header className="bg-white border-b border-[#E5E7EB] px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6B7280]">{getGreeting(displayName)}</p>
            <h1 className="text-lg font-bold text-[#1A1D23]">GCash</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-xl bg-[#0056D2] text-white flex items-center justify-center"
          >
            <i className="fa-solid fa-bars text-lg" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer - Same as before */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-20"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl z-30 p-4 animate-slide-in">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#0056D2] rounded-xl flex items-center justify-center text-white text-xs font-bold">
                  G
                </div>
                <span className="font-bold text-[#1A1D23]">GCash</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 text-[#6B7280]"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => {
                  router.push("/dashboard");
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#E8F0FE] text-[#0056D2] font-semibold text-sm"
              >
                <i className="fa-solid fa-chart-line w-5" />
                <span>Overview</span>
              </button>

              <div className="mt-2">
                <p className="text-xs text-[#6B7280] px-3 mb-2">FEATURES</p>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      router.push("/subscriptions");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                  >
                    <i className="fa-solid fa-rectangle-list w-5" />
                    <span>Subscription Manager</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/spending-limit");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                  >
                    <i className="fa-solid fa-coins w-5" />
                    <span>Spend Limit</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/scam-detection");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                  >
                    <i className="fa-solid fa-shield-virus w-5" />
                    <span>Scam Check</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push("/voice-payment");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
                  >
                    <i className="fa-solid fa-microphone-lines w-5" />
                    <span>Voice Pay</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main Content - Updated Hero Card showing Balance */}
      <div className="px-4 py-4">
        {/* Hero Card - User Balance */}
        <div className="bg-linear-to-br from-[#0056D2] to-[#0076FF] rounded-2xl p-5 text-white shadow-lg mb-6">
          <p className="text-white/70 text-xs mb-1">Your Balance</p>
          <h1 className="text-3xl font-bold">
            ₱ {userBalance.toLocaleString()}
          </h1>
          <p className="text-white/60 text-[10px] mt-1">Available balance</p>
        </div>

        {/* Monthly Spend Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#6B7280] text-xs mb-1">
                Monthly Subscription Spend
              </p>
              <p className="text-2xl font-bold text-[#1A1D23]">
                ₱{totalMonthlySpend.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#6B7280] text-xs">Active: {activeCount}</p>
              <p className="text-[#FF6B35] text-xs">Due Soon: {dueSoonCount}</p>
            </div>
          </div>
          {userBalance > 0 && (
            <>
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-[#0056D2] h-1.5 rounded-full"
                    style={{
                      width: `${Math.min((totalMonthlySpend / userBalance) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1">
                  {((totalMonthlySpend / userBalance) * 100).toFixed(1)}% of
                  balance goes to subscriptions
                </p>
              </div>
            </>
          )}
        </div>

        {/* QUICK ACTIONS - Same as before */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">⚡</span>
            <h3 className="text-xs font-semibold text-[#1A1D23] uppercase tracking-wide">
              QUICK ACTIONS
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Subscription Manager Button */}
            <button
              onClick={() => router.push("/subscriptions")}
              className="bg-white rounded-xl p-3 text-center border border-[#E5E7EB] active:bg-gray-50 transition-all"
            >
              <div className="mb-1 flex justify-center">
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <rect
                    x="10"
                    y="14"
                    width="28"
                    height="22"
                    rx="3"
                    stroke="#0056D2"
                    strokeWidth="1.8"
                    fill="white"
                  />
                  <line
                    x1="16"
                    y1="22"
                    x2="32"
                    y2="22"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="16"
                    y1="28"
                    x2="28"
                    y2="28"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="34"
                    cy="34"
                    r="3"
                    fill="#0056D2"
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
              </div>
              <p className="text-[#1A1D23] font-semibold text-xs">
                Subscriptions
              </p>
              <p className="text-[#6B7280] text-[9px] mt-0.5">
                Manage & track bills
              </p>
            </button>

            {/* Spending Limit Button */}
            <button
              onClick={() => router.push("/spending-limit")}
              className="bg-white rounded-xl p-3 text-center border border-[#E5E7EB] active:bg-gray-50 transition-all"
            >
              <div className="mb-1 flex justify-center">
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M 24 6 L 40 12 L 40 24 C 40 35 24 42 24 42 C 24 42 8 35 8 24 L 8 12 L 24 6 Z"
                    stroke="#0056D2"
                    strokeWidth="1.8"
                    fill="white"
                  />
                  <text
                    x="24"
                    y="30"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#0056D2"
                    textAnchor="middle"
                  >
                    ₱
                  </text>
                </svg>
              </div>
              <p className="text-[#1A1D23] font-semibold text-xs">
                Spend Limit
              </p>
              <p className="text-[#6B7280] text-[9px] mt-0.5">
                Track & control
              </p>
            </button>

            {/* Scam Detection Button */}
            <button
              onClick={() => router.push("/scam-detection")}
              className="bg-white rounded-xl p-3 text-center border border-[#E5E7EB] active:bg-gray-50 transition-all"
            >
              <div className="mb-1 flex justify-center">
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <circle
                    cx="24"
                    cy="20"
                    r="6"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    fill="white"
                  />
                  <path
                    d="M 14 34 C 14 28 18 25 24 25 C 30 25 34 28 34 34"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle
                    cx="35"
                    cy="14"
                    r="5"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    fill="white"
                  />
                  <line
                    x1="38"
                    y1="17"
                    x2="42"
                    y2="21"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[#1A1D23] font-semibold text-xs">Scam Check</p>
              <p className="text-[#6B7280] text-[9px] mt-0.5">
                Verify before pay
              </p>
            </button>

            {/* Voice Payment Button */}
            <button
              onClick={() => router.push("/voice-payment")}
              className="bg-white rounded-xl p-3 text-center border border-[#E5E7EB] active:bg-gray-50 transition-all"
            >
              <div className="mb-1 flex justify-center">
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <rect
                    x="20"
                    y="12"
                    width="8"
                    height="16"
                    rx="4"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    fill="white"
                  />
                  <path
                    d="M 16 22 C 16 18 20 16 24 16 C 28 16 32 18 32 22"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M 24 28 L 24 34"
                    stroke="#0056D2"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[#1A1D23] font-semibold text-xs">Voice Pay</p>
              <p className="text-[#6B7280] text-[9px] mt-0.5">
                Pay by speaking
              </p>
            </button>
          </div>
        </div>

        {/* AT A GLANCE Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📊</span>
            <h3 className="text-xs font-semibold text-[#1A1D23] uppercase tracking-wide">
              AT A GLANCE
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-base font-bold text-[#1A1D23]">
                ₱{totalMonthlySpend.toLocaleString()}
              </p>
              <p className="text-[9px] text-[#6B7280] mt-0.5">Monthly Subs</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-base font-bold text-[#1A1D23]">
                {activeCount}
              </p>
              <p className="text-[9px] text-[#6B7280] mt-0.5">Active Subs</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-[#E5E7EB] text-center">
              <p className="text-base font-bold text-[#FF6B35]">
                {dueSoonCount}
              </p>
              <p className="text-[9px] text-[#6B7280] mt-0.5">Due Within 7d</p>
            </div>
          </div>
        </div>

        {/* Pro Tip Section */}
        <div className="bg-linear-to-r from-[#E8F0FE] to-[#D4E4FC] rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">💡</span>
            <div className="flex-1">
              <h4 className="font-semibold text-[#1A1D23] text-xs mb-0.5">
                Pro Tip
              </h4>
              <p className="text-[11px] text-[#4A5568] leading-relaxed">
                You're spending ₱{totalMonthlySpend.toLocaleString()} monthly on
                subscriptions
                {userBalance > 0 &&
                  ` (${((totalMonthlySpend / userBalance) * 100).toFixed(1)}% of your balance)`}
                .
                {dueSoonCount > 0 &&
                  ` ${dueSoonCount} subscription${dueSoonCount > 1 ? "s are" : " is"} renewing soon.`}
                Use Scam Check to verify merchants before paying!
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
