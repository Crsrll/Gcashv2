"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function SpendingLimitPage() {
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [totalSpent, setTotalSpent] = useState(0);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeScreen, setActiveScreen] = useState("home");

  // Helper: Get start of current month
  const getStartOfMonth = () => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split("T")[0];
  };

  // Fetch total spent this month
  const fetchTotalSpent = useCallback(async () => {
    if (!user) return 0;

    try {
      const startDate = getStartOfMonth();

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("transaction_date", startDate);

      if (fetchError) throw fetchError;

      const total = data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      setTotalSpent(total);
      return total;
    } catch (err) {
      console.error("Error fetching total spent:", err);
      return 0;
    }
  }, [user]);

  // Fetch all transactions
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    }
  }, [user]);

  // Fetch user settings
  const fetchUserSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("spending_limit, limit_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setMonthlyLimit(data.spending_limit || 10000);
        setLimitEnabled(data.limit_enabled ?? true);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError("Failed to load your settings");
    }
  }, [user]);

  // Load all data
  const loadAllData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUserSettings(),
        fetchTotalSpent(),
        fetchTransactions(),
      ]);
    } catch (err) {
      setError("Something went wrong. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserSettings, fetchTotalSpent, fetchTransactions]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Calculations
  const remaining = limitEnabled ? Math.max(0, monthlyLimit - totalSpent) : 0;
  const percentUsed =
    limitEnabled && monthlyLimit > 0
      ? Math.min((totalSpent / monthlyLimit) * 100, 100)
      : 0;

  // Get status color and text
  const getLimitStatus = () => {
    if (!limitEnabled)
      return { text: "Limit Disabled", color: "gray", border: "gray" };
    if (totalSpent > monthlyLimit)
      return { text: "Limit Reached", color: "red", border: "red" };
    if (remaining <= 1000)
      return { text: "Almost Reached", color: "orange", border: "orange" };
    return { text: "Within Limit", color: "green", border: "green" };
  };

  const status = getLimitStatus();

  // Category helpers
  const getCategoryDetails = (category) => {
    const details = {
      subscription: {
        icon: "fa-solid fa-rectangle-list",
        color: "#0056D2",
        label: "Subscription",
      },
      send_money: {
        icon: "fa-solid fa-paper-plane",
        color: "#FF6B35",
        label: "Send Money",
      },
      voice_pay: {
        icon: "fa-solid fa-microphone-lines",
        color: "#34C759",
        label: "Voice Pay",
      },
    };
    return (
      details[category] || {
        icon: "fa-solid fa-receipt",
        color: "#6B7280",
        label: category,
      }
    );
  };

  // Save new limit
  const saveLimit = async () => {
    const input = document.getElementById("limitInput");
    if (!input) return;

    const rawValue = input.value.replace(/,/g, "");
    const newLimit = parseInt(rawValue) || 10000;

    if (newLimit < 1000) {
      alert("Minimum limit is ₱1,000");
      return;
    }

    if (newLimit > 100000) {
      alert("Maximum limit is ₱100,000");
      return;
    }

    setMonthlyLimit(newLimit);

    const { error: saveError } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        spending_limit: newLimit,
        limit_enabled: limitEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (saveError) {
      console.error("Error saving limit:", saveError);
      alert("Failed to save limit. Please try again.");
    } else {
      setActiveScreen("home");
    }
  };

  // Toggle limit on/off
  const toggleLimit = async () => {
    const newState = !limitEnabled;
    setLimitEnabled(newState);

    const { error: toggleError } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        spending_limit: monthlyLimit,
        limit_enabled: newState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (toggleError) {
      console.error("Error toggling limit:", toggleError);
      setLimitEnabled(limitEnabled); // Revert on error
    }
  };

  // Format number with commas
  const formatNumber = (value) => {
    return new Intl.NumberFormat().format(value);
  };

  // Handle limit input
  const handleLimitInput = (e) => {
    let value = e.target.value.replace(/,/g, "");
    value = value.replace(/[^\d]/g, "");
    let num = parseInt(value) || 0;
    if (num > 100000) num = 100000;
    e.target.value = formatNumber(num);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header title="Spend Limit" subtitle="Track all your spending" />
        <div className="px-4 py-4">
          <div className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Spend Limit" subtitle="Track all your spending" />

      <div className="px-4 py-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
            <button
              onClick={loadAllData}
              className="text-red-600 text-xs text-center block w-full mt-2"
            >
              Tap to retry
            </button>
          </div>
        )}

        {/* ========== HOME SCREEN ========== */}
        {activeScreen === "home" && (
          <>
            {/* Limit Card */}
            <div
              className={`bg-white rounded-2xl p-5 shadow-sm mb-6 ${
                !limitEnabled
                  ? "opacity-60"
                  : status.border === "red"
                    ? "border-2 border-red-500"
                    : status.border === "orange"
                      ? "border-2 border-orange-500"
                      : "border border-[#E5E7EB]"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    !limitEnabled
                      ? "bg-gray-100 text-gray-500"
                      : status.color === "red"
                        ? "bg-red-50 text-red-600"
                        : status.color === "orange"
                          ? "bg-orange-50 text-orange-600"
                          : "bg-green-50 text-green-600"
                  }`}
                >
                  {status.text}
                </span>
                <button
                  onClick={toggleLimit}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{
                    backgroundColor: limitEnabled ? "#0056D2" : "#CBD5E1",
                  }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      limitEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {limitEnabled ? (
                <>
                  <div className="mb-4">
                    <p className="text-[#6B7280] text-xs mb-1">Monthly Limit</p>
                    <h1 className="text-3xl font-bold text-[#1A1D23]">
                      ₱ {formatNumber(monthlyLimit)}
                    </h1>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status.color === "red"
                            ? "bg-red-500"
                            : status.color === "orange"
                              ? "bg-orange-500"
                              : "bg-[#0056D2]"
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-[#6B7280]">
                        ₱ {formatNumber(totalSpent)} spent this month
                      </span>
                      <span className="text-[#6B7280]">
                        ₱ {formatNumber(remaining)} remaining
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <p className="text-[#6B7280] text-xs mb-1">
                    Spending limit is off
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    Turn on to control your spending
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveScreen("edit")}
                  className="flex-1 py-2 rounded-xl bg-[#0056D2] text-white text-sm font-semibold"
                >
                  Edit Limit
                </button>
                <button
                  onClick={() => setActiveScreen("history")}
                  className="flex-1 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold"
                >
                  Transaction History
                </button>
              </div>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-[#1A1D23]">
                  Recent Transactions
                </h3>
                <button
                  onClick={() => setActiveScreen("history")}
                  className="text-[#0056D2] text-xs"
                >
                  View All
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-receipt text-4xl text-[#6B7280] opacity-30 mb-2 block" />
                  <p className="text-[#6B7280] text-sm">No transactions yet</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Send money or subscribe to see transactions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => {
                    const details = getCategoryDetails(tx.category);
                    return (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center py-2 border-b border-[#E5E7EB] last:border-0"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: details.color }}
                          >
                            <i className={details.icon} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-[#1A1D23] text-sm">
                              {tx.description}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-[#6B7280]">
                                {new Date(
                                  tx.transaction_date,
                                ).toLocaleDateString()}
                              </p>
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">
                                {details.label}
                              </span>
                              {tx.recipient && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0056D2]">
                                  To: {tx.recipient}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="font-semibold text-[#FF3B30]">
                          -₱{formatNumber(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== EDIT LIMIT SCREEN ========== */}
        {activeScreen === "edit" && (
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveScreen("home")}
                className="w-8 h-8 rounded-lg bg-gray-100"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
              <h2 className="text-lg font-bold text-[#1A1D23]">
                Set Spending Limit
              </h2>
            </div>

            <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-[#1A1D23] text-sm">
                  Enable Spending Limit
                </p>
                <p className="text-[10px] text-[#6B7280]">
                  Turn on to limit your spending
                </p>
              </div>
              <button
                onClick={toggleLimit}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: limitEnabled ? "#0056D2" : "#CBD5E1",
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    limitEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {limitEnabled && (
              <>
                <label className="block text-sm font-medium text-[#6B7280] mb-2">
                  Monthly Limit Amount
                </label>
                <div className="relative mb-6">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-[#1A1D23]">
                    ₱
                  </span>
                  <input
                    id="limitInput"
                    type="text"
                    defaultValue={formatNumber(monthlyLimit)}
                    onChange={handleLimitInput}
                    className="w-full pl-8 pr-4 py-3 text-xl font-bold text-[#1A1D23] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
                <p className="text-xs text-[#6B7280] -mt-4 mb-4">
                  Min: ₱1,000 | Max: ₱100,000
                </p>
              </>
            )}

            <p className="text-xs text-[#6B7280] bg-gray-50 p-3 rounded-xl mb-4">
              <i className="fa-regular fa-circle-info mr-1" />
              {limitEnabled
                ? "This limit helps you control your total monthly spending across all transactions."
                : "Enable the limit to start controlling your spending."}
            </p>

            <button
              onClick={saveLimit}
              className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold"
            >
              Save Spending Limit
            </button>
          </div>
        )}

        {/* ========== HISTORY SCREEN ========== */}
        {activeScreen === "history" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveScreen("home")}
                className="w-8 h-8 rounded-lg bg-gray-100"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
              <h2 className="text-lg font-bold text-[#1A1D23]">
                Transaction History
              </h2>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-[#0056D2] to-[#0076FF] rounded-2xl p-4 text-white">
                <p className="text-white/70 text-[10px] mb-1">Total Spent</p>
                <p className="text-xl font-bold">₱{formatNumber(totalSpent)}</p>
                <p className="text-white/60 text-[8px] mt-1">This month</p>
              </div>
              {limitEnabled && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB]">
                  <p className="text-[#6B7280] text-[10px] mb-1">
                    Limit Remaining
                  </p>
                  <p className="text-xl font-bold text-[#1A1D23]">
                    ₱{formatNumber(remaining)}
                  </p>
                  <p className="text-[#6B7280] text-[8px] mt-1">
                    {percentUsed.toFixed(0)}% of limit used
                  </p>
                </div>
              )}
            </div>

            {/* All Transactions */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
              <h3 className="font-semibold text-[#1A1D23] mb-3">
                All Transactions
              </h3>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-receipt text-5xl text-[#6B7280] opacity-30 mb-3 block" />
                  <p className="text-[#6B7280] font-medium">
                    No transactions found
                  </p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Send money or subscribe to see transactions
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {transactions.map((tx) => {
                    const details = getCategoryDetails(tx.category);
                    return (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center py-3 border-b border-[#E5E7EB] last:border-0"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                            style={{ backgroundColor: details.color }}
                          >
                            <i className={details.icon} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#1A1D23] text-sm">
                              {tx.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[10px] text-[#6B7280]">
                                {new Date(
                                  tx.transaction_date,
                                ).toLocaleDateString()}
                              </p>
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">
                                {details.label}
                              </span>
                              {tx.recipient && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0056D2]">
                                  To: {tx.recipient}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="font-bold text-[#FF3B30]">
                          -₱{formatNumber(tx.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
