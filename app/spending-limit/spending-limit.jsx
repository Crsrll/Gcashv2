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

  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [totalSpent, setTotalSpent] = useState(0);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [activeScreen, setActiveScreen] = useState("homeScreen");

  // Fetch total spent from ALL transactions (subscriptions + send money + voice pay)
  const fetchTotalSpent = async () => {
    if (!user) return 0;

    try {
      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startDateStr = startOfMonth.toISOString().split("T")[0];

      // Get all transactions from this month
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("transaction_date", startDateStr);

      if (error) throw error;

      const total =
        transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      setTotalSpent(total);
      return total;
    } catch (error) {
      console.error("Error fetching total spent:", error);
      return 0;
    }
  };

  // Fetch ALL transactions for history
  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setRecentTransactions([]);
    }
  };

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("spending_limit, limit_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData) {
        setMonthlyLimit(settingsData.spending_limit || 10000);
        setLimitEnabled(settingsData.limit_enabled ?? true);
      }

      // Fetch all data
      await Promise.all([fetchTotalSpent(), fetchTransactions()]);
    } catch (error) {
      console.error("Error fetching spending data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const remaining = limitEnabled ? Math.max(0, monthlyLimit - totalSpent) : 0;
  const percentage =
    limitEnabled && monthlyLimit > 0
      ? Math.min((totalSpent / monthlyLimit) * 100, 100)
      : 0;

  const saveNewLimit = async () => {
    const limitInput = document.getElementById("limitInput");
    if (limitInput) {
      const rawValue = limitInput.value.replace(/,/g, "");
      const newLimit = parseInt(rawValue) || 10000;
      setMonthlyLimit(newLimit);

      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          spending_limit: newLimit,
          limit_enabled: limitEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("Error saving limit:", error);
        alert("Failed to save limit. Please try again.");
      } else {
        setActiveScreen("homeScreen");
      }
    }
  };

  const toggleLimit = async () => {
    const newState = !limitEnabled;

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        spending_limit: monthlyLimit,
        limit_enabled: newState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Error toggling limit:", error);
    } else {
      setLimitEnabled(newState);
    }
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat().format(value);
  };

  const handleLimitInput = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numberValue = parseInt(rawValue) || 0;
    if (numberValue <= 100000) {
      e.target.value = formatNumber(numberValue);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "subscription":
        return "fa-solid fa-rectangle-list";
      case "send_money":
        return "fa-solid fa-paper-plane";
      case "voice_pay":
        return "fa-solid fa-microphone-lines";
      default:
        return "fa-solid fa-receipt";
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "subscription":
        return "#0056D2";
      case "send_money":
        return "#FF6B35";
      case "voice_pay":
        return "#34C759";
      default:
        return "#6B7280";
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case "subscription":
        return "Subscription";
      case "send_money":
        return "Send Money";
      case "voice_pay":
        return "Voice Pay";
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2] mx-auto"></div>
          <p className="mt-4 text-[#6B7280]">Loading spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Spend Limit" subtitle="Track all your spending" />

      <div className="px-4 py-4">
        {/* Home Screen */}
        {activeScreen === "homeScreen" && (
          <div>
            {/* Main Limit Card */}
            <div
              className={`bg-white rounded-2xl p-5 shadow-sm mb-6 ${
                !limitEnabled
                  ? "opacity-60"
                  : totalSpent > monthlyLimit
                    ? "border-2 border-red-500"
                    : remaining <= 1000
                      ? "border-2 border-orange-500"
                      : "border border-[#E5E7EB]"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    !limitEnabled
                      ? "bg-gray-100 text-gray-500"
                      : totalSpent > monthlyLimit
                        ? "bg-red-50 text-red-600"
                        : remaining <= 1000
                          ? "bg-orange-50 text-orange-600"
                          : "bg-green-50 text-green-600"
                  }`}
                >
                  {!limitEnabled
                    ? "Limit Disabled"
                    : totalSpent > monthlyLimit
                      ? "Limit Reached"
                      : remaining <= 1000
                        ? "Almost Reached"
                        : "Within Limit"}
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
                      ₱ {monthlyLimit.toLocaleString()}
                    </h1>
                  </div>

                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          totalSpent > monthlyLimit
                            ? "bg-red-500"
                            : remaining <= 1000
                              ? "bg-orange-500"
                              : "bg-[#0056D2]"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-[#6B7280]">
                        ₱ {totalSpent.toLocaleString()} spent this month
                      </span>
                      <span className="text-[#6B7280]">
                        ₱ {remaining.toLocaleString()} remaining
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
                  onClick={() => setActiveScreen("editLimitScreen")}
                  className="flex-1 py-2 rounded-xl bg-[#0056D2] text-white text-sm font-semibold"
                >
                  Edit Limit
                </button>
                <button
                  onClick={() => setActiveScreen("historyScreen")}
                  className="flex-1 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold"
                >
                  Transaction History
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-[#1A1D23]">
                  Recent Transactions
                </h3>
                <button
                  onClick={() => setActiveScreen("historyScreen")}
                  className="text-[#0056D2] text-xs"
                >
                  View All
                </button>
              </div>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-receipt text-4xl text-[#6B7280] opacity-30 mb-2 block" />
                  <p className="text-[#6B7280] text-sm">No transactions yet</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Send money or subscribe to see transactions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center py-2 border-b border-[#E5E7EB] last:border-0"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
                          style={{
                            backgroundColor: getCategoryColor(
                              transaction.category,
                            ),
                          }}
                        >
                          <i
                            className={getCategoryIcon(transaction.category)}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-[#1A1D23] text-sm">
                            {transaction.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-[#6B7280]">
                              {new Date(
                                transaction.transaction_date,
                              ).toLocaleDateString()}
                            </p>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">
                              {getCategoryLabel(transaction.category)}
                            </span>
                            {transaction.recipient && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0056D2]">
                                To: {transaction.recipient}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="font-semibold text-[#FF3B30]">
                        -₱{transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Limit Screen */}
        {activeScreen === "editLimitScreen" && (
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveScreen("homeScreen")}
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
              </>
            )}

            <p className="text-xs text-[#6B7280] bg-gray-50 p-3 rounded-xl mb-4">
              <i className="fa-regular fa-circle-info mr-1" />
              {limitEnabled
                ? "This limit helps you control your total monthly spending across all transactions."
                : "Enable the limit to start controlling your spending."}
            </p>

            <button
              onClick={saveNewLimit}
              className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold"
            >
              Save Spending Limit
            </button>
          </div>
        )}

        {/* Transaction History Screen */}
        {activeScreen === "historyScreen" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveScreen("homeScreen")}
                className="w-8 h-8 rounded-lg bg-gray-100"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
              <h2 className="text-lg font-bold text-[#1A1D23]">
                Transaction History
              </h2>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-linear-to-br from-[#0056D2] to-[#0076FF] rounded-2xl p-4 text-white">
                <p className="text-white/70 text-[10px] mb-1">Total Spent</p>
                <p className="text-xl font-bold">
                  ₱{totalSpent.toLocaleString()}
                </p>
                <p className="text-white/60 text-[8px] mt-1">This month</p>
              </div>
              {limitEnabled && (
                <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB]">
                  <p className="text-[#6B7280] text-[10px] mb-1">
                    Limit Remaining
                  </p>
                  <p className="text-xl font-bold text-[#1A1D23]">
                    ₱{remaining.toLocaleString()}
                  </p>
                  <p className="text-[#6B7280] text-[8px] mt-1">
                    {percentage.toFixed(0)}% of limit used
                  </p>
                </div>
              )}
            </div>

            {/* All Transactions List */}
            <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB]">
              <h3 className="font-semibold text-[#1A1D23] mb-3">
                All Transactions
              </h3>
              {recentTransactions.length === 0 ? (
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
                <div className="space-y-3 max-h-125 overflow-y-auto">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center py-3 border-b border-[#E5E7EB] last:border-0"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                          style={{
                            backgroundColor: getCategoryColor(
                              transaction.category,
                            ),
                          }}
                        >
                          <i
                            className={getCategoryIcon(transaction.category)}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#1A1D23] text-sm">
                            {transaction.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-[10px] text-[#6B7280]">
                              {new Date(
                                transaction.transaction_date,
                              ).toLocaleDateString()}
                            </p>
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280]">
                              {getCategoryLabel(transaction.category)}
                            </span>
                            {transaction.recipient && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0056D2]">
                                To: {transaction.recipient}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="font-bold text-[#FF3B30]">
                        -₱{transaction.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
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
