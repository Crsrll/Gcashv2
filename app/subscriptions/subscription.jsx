"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SubscriptionCard from "@/components/SubscriptionCard";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const FILTERS = ["All", "Active", "Due Soon", "Cancelled"];

// Apply due soon logic to subscriptions
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

export default function SubscriptionManagerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState("All");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchSubs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("renew_date", { ascending: true });

    setSubs(applyDueSoon(data || []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.id);
    setCancelTarget(null);
    fetchSubs();
  };

  const filtered =
    filter === "All"
      ? subs
      : subs.filter((s) => s.status?.toLowerCase() === filter.toLowerCase());

  const activeSubs = subs.filter((s) => s.status === "active");
  const dueSoonSubs = subs.filter((s) => s.status === "due soon");
  const totalMonthly = [...activeSubs, ...dueSoonSubs].reduce(
    (acc, s) => acc + Number(s.price || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <Header title="Subscription" subtitle="Manager" />

      {/* Mobile Menu Drawer */}
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
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#6B7280] hover:bg-gray-50 text-sm w-full"
              >
                <i className="fa-solid fa-chart-line w-5" />
                <span>Dashboard</span>
              </button>

              <div className="mt-2">
                <p className="text-xs text-[#6B7280] px-3 mb-2">FEATURES</p>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      router.push("/subscriptions");
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#E8F0FE] text-[#0056D2] font-semibold text-sm w-full"
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

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-linear-to-br from-[#0056D2] to-[#0076FF] rounded-xl p-3 text-white">
            <p className="text-white/70 text-[9px] mb-0.5">Total Monthly</p>
            <p className="text-base font-bold">
              ₱{totalMonthly.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#E5E7EB]">
            <p className="text-[#6B7280] text-[9px] mb-0.5">Active</p>
            <p className="text-base font-bold text-[#1A1D23]">
              {activeSubs.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-[#E5E7EB]">
            <p className="text-[#6B7280] text-[9px] mb-0.5">Due Soon</p>
            <p className="text-base font-bold text-[#FF6B35]">
              {dueSoonSubs.length}
            </p>
          </div>
        </div>

        {/* Add Subscription Button */}
        <Link
          href="/apps"
          className="flex items-center justify-center gap-2 w-full bg-[#0056D2] text-white rounded-xl py-3 mb-4 font-semibold text-sm active:bg-[#0045B0] transition-colors"
        >
          <i className="fa-solid fa-plus" />
          <span>Add New Subscription</span>
        </Link>

        {/* Filter tabs - Horizontal Scroll */}
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-none border-b border-[#E5E7EB] mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-[#0056D2] text-white"
                  : "bg-white text-[#6B7280] border border-[#E5E7EB]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Subscription list */}
        <div className="space-y-2 pb-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 h-20 animate-pulse"
              />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <i className="fa-solid fa-rectangle-list text-4xl mb-3 block opacity-30" />
              <p className="font-medium text-sm">No subscriptions found</p>
              {filter === "All" && (
                <Link
                  href="/apps"
                  className="inline-block mt-3 text-[#0056D2] text-sm font-semibold hover:underline"
                >
                  Add your first subscription →
                </Link>
              )}
            </div>
          ) : (
            filtered.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </div>
      </div>

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center text-white text-xl"
                style={{ backgroundColor: cancelTarget.color || "#0056D2" }}
              >
                <i className={cancelTarget.icon} />
              </div>
              <h3 className="text-lg font-bold mb-1">
                Cancel {cancelTarget.name}?
              </h3>
              <p className="text-[#6B7280] text-xs mb-5">
                Your subscription will be cancelled and won't renew next month.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCancelTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold text-sm"
                >
                  Keep it
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
