"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function ScamDetectionPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ========== STATE VARIABLES ==========
  const [currentScreen, setCurrentScreen] = useState(1);
  const [mobileNumber, setMobileNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [checkingTimeout, setCheckingTimeout] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [totalSpent, setTotalSpent] = useState(0);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [sendingMoney, setSendingMoney] = useState(false);
  const [flaggedInfo, setFlaggedInfo] = useState(null);
  const [checkingNumber, setCheckingNumber] = useState(false);

  // ========== FETCH USER DATA ==========
  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user balance
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserBalance(balanceData?.balance || 0);

      // Fetch spending limit settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("spending_limit, limit_enabled, limit_period")
        .eq("user_id", user.id)
        .maybeSingle();

      const limit = settingsData?.spending_limit || 10000;
      const enabled = settingsData?.limit_enabled ?? true;
      setMonthlyLimit(limit);
      setLimitEnabled(enabled);

      // Fetch total spent this month from transactions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("transaction_date", startOfMonth.toISOString().split("T")[0]);

      const total =
        transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      setTotalSpent(total);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  // ========== CHECK IF NUMBER IS FLAGGED ==========
  const checkIfNumberIsFlagged = async (number) => {
    setCheckingNumber(true);

    try {
      // Clean the number (remove spaces, keep only digits)
      const cleanNumber = number.replace(/\s/g, "");

      const { data, error } = await supabase
        .from("flagged_numbers")
        .select("*")
        .eq("mobile_number", cleanNumber)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFlaggedInfo({
          reportCount: data.report_count,
          lastReported: data.last_reported,
          commonIssue: data.common_issue,
        });
        return true; // Number is flagged
      }

      setFlaggedInfo(null);
      return false; // Number is safe
    } catch (error) {
      console.error("Error checking flagged numbers:", error);
      return false;
    } finally {
      setCheckingNumber(false);
    }
  };

  // ========== NAVIGATION ==========
  const goToScreen = async (screenNumber) => {
    // Check limit before proceeding to send
    if (screenNumber === 5 && limitEnabled) {
      const amountValue = parseFloat(amount || 0);
      const newTotalSpent = totalSpent + amountValue;
      if (newTotalSpent > monthlyLimit) {
        setLimitExceeded(true);
        setCurrentScreen(6); // Go to limit exceeded screen
        return;
      }
    }

    // If going to checking screen, perform scam check
    if (screenNumber === 2) {
      setCurrentScreen(2);

      // Check if number is flagged
      const isFlagged = await checkIfNumberIsFlagged(mobileNumber);

      // Wait 2 seconds for demo effect then proceed
      const timeout = setTimeout(() => {
        if (isFlagged) {
          goToScreen(3); // Show scam alert
        } else {
          goToScreen(5); // Safe to send
        }
      }, 2000);
      setCheckingTimeout(timeout);
      return;
    }

    setCurrentScreen(screenNumber);
  };

  // ========== REPORT FLAGGED NUMBER (when user reports) ==========
  const reportNumber = async () => {
    const cleanNumber = mobileNumber.replace(/\s/g, "");

    // Check if number already exists
    const { data: existing } = await supabase
      .from("flagged_numbers")
      .select("report_count")
      .eq("mobile_number", cleanNumber)
      .maybeSingle();

    if (existing) {
      // Update existing report count
      await supabase
        .from("flagged_numbers")
        .update({
          report_count: existing.report_count + 1,
          last_reported: new Date().toISOString(),
        })
        .eq("mobile_number", cleanNumber);
    } else {
      // Insert new flagged number
      await supabase.from("flagged_numbers").insert({
        mobile_number: cleanNumber,
        report_count: 1,
        common_issue: "Reported by user",
        last_reported: new Date().toISOString(),
      });
    }

    alert("Thank you for reporting. This number has been flagged for review.");
  };

  // ========== SEND MONEY FUNCTION ==========
  const sendMoney = async () => {
    if (!user) return;

    const amountValue = parseFloat(amount);
    const cleanNumber = mobileNumber.replace(/\s/g, "");

    // Check if user has enough balance
    if (userBalance < amountValue) {
      setInsufficientBalance(true);
      setTimeout(() => setInsufficientBalance(false), 3000);
      return;
    }

    // Check if sending would exceed limit
    if (limitEnabled) {
      const newTotalSpent = totalSpent + amountValue;
      if (newTotalSpent > monthlyLimit) {
        setLimitExceeded(true);
        setCurrentScreen(6);
        return;
      }
    }

    setSendingMoney(true);

    try {
      // Record the transaction
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: amountValue,
          category: "send_money",
          description: `Sent money to ${cleanNumber}`,
          recipient: cleanNumber,
          transaction_date: new Date().toISOString().split("T")[0],
        });

      if (transactionError) throw transactionError;

      // Deduct from user balance
      const newBalance = userBalance - amountValue;
      const { error: balanceError } = await supabase
        .from("user_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (balanceError) throw balanceError;

      // Update local state
      setUserBalance(newBalance);
      setTotalSpent(totalSpent + amountValue);

      // Show success and go back to dashboard
      alert(
        `Successfully sent ₱${amountValue.toLocaleString()} to ${cleanNumber}`,
      );
      router.push("/dashboard");
    } catch (error) {
      console.error("Error sending money:", error);
      alert("Failed to send money. Please try again.");
    } finally {
      setSendingMoney(false);
    }
  };

  // ========== NUMPAD HANDLERS ==========
  const handleNumpadClick = (value) => {
    let targetInput = "mobile";

    if (mobileNumber.length >= 11 && !amount) {
      targetInput = "amount";
    } else if (mobileNumber.length > 0 && !amount) {
      if (mobileNumber.length >= 11) {
        targetInput = "amount";
      } else {
        targetInput = "mobile";
      }
    } else if (amount) {
      targetInput = "amount";
    }

    if (value === "⌫") {
      if (targetInput === "mobile") {
        setMobileNumber((prev) => prev.slice(0, -1));
      } else {
        setAmount((prev) => prev.slice(0, -1));
      }
    } else if (value === "•") {
      if (targetInput === "amount" && !amount.includes(".")) {
        setAmount((prev) => prev + ".");
      }
    } else {
      if (targetInput === "amount") {
        let newValue = amount + value;
        if (newValue.length <= 10) {
          setAmount(newValue);
        }
      } else {
        let newValue = mobileNumber + value;
        if (newValue.length <= 11) {
          setMobileNumber(newValue);
        }
      }
    }
  };

  const getFormattedMobile = () => {
    const cleanValue = mobileNumber.replace(/\D/g, "");
    if (cleanValue.length <= 4) {
      return cleanValue;
    } else if (cleanValue.length <= 7) {
      return cleanValue.slice(0, 4) + " " + cleanValue.slice(4);
    } else {
      return (
        cleanValue.slice(0, 4) +
        " " +
        cleanValue.slice(4, 7) +
        " " +
        cleanValue.slice(7, 11)
      );
    }
  };

  const getFormattedAmount = () => {
    const cleanValue = amount.replace(/[^\d.]/g, "");
    if (cleanValue === "") return "";
    const num = parseFloat(cleanValue);
    if (isNaN(num)) return "";
    return num.toFixed(2);
  };

  useEffect(() => {
    return () => {
      if (checkingTimeout) clearTimeout(checkingTimeout);
    };
  }, [checkingTimeout]);

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Scam Detection" subtitle="Send money safely" />

      <div className="px-4 py-4">
        {/* Balance and Limit Info */}
        <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wallet text-[#0056D2] text-sm" />
              <span className="text-sm text-[#6B7280]">Your Balance:</span>
            </div>
            <span className="text-sm font-bold text-[#1A1D23]">
              ₱{userBalance.toLocaleString()}
            </span>
          </div>
          {limitEnabled && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-[#0056D2] text-sm" />
                <span className="text-sm text-[#6B7280]">Spending Limit:</span>
              </div>
              <span className="text-sm font-medium text-[#1A1D23]">
                ₱{totalSpent.toLocaleString()} / ₱
                {monthlyLimit.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* SCREEN 1: Send Money */}
        {currentScreen === 1 && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-4">
                Enter Recipient Details
              </label>

              <div className="mb-4">
                <span className="block text-xs text-[#6B7280] mb-2 font-medium">
                  Mobile Number
                </span>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-[#E5E7EB]">
                  <input
                    type="text"
                    placeholder="0917 123 4567"
                    value={getFormattedMobile()}
                    readOnly
                    className="flex-1 border-none bg-transparent text-base outline-none"
                  />
                  <i className="fa-regular fa-user text-[#6B7280]" />
                </div>
              </div>

              <div className="mb-6">
                <span className="block text-xs text-[#6B7280] mb-2 font-medium">
                  Enter Amount
                </span>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2 border border-[#E5E7EB]">
                  <span className="text-xl font-bold text-[#1A1D23]">₱</span>
                  <input
                    type="text"
                    placeholder="0.00"
                    value={getFormattedAmount()}
                    readOnly
                    className="flex-1 border-none bg-transparent text-base outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => goToScreen(2)}
              disabled={!mobileNumber || !amount}
              className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              Next
            </button>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "•", "0", "⌫"].map(
                (btn) => (
                  <button
                    key={btn}
                    onClick={() => handleNumpadClick(btn)}
                    className="py-4 bg-white border border-[#E5E7EB] rounded-xl text-xl font-semibold text-[#1A1D23] active:bg-gray-50 transition-colors"
                  >
                    {btn}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {/* SCREEN 2: Checking */}
        {currentScreen === 2 && (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-20 h-20 bg-[#0056D2] rounded-2xl mx-auto flex items-center justify-center animate-pulse">
                <i className="fa-solid fa-shield-haltered text-white text-3xl" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#1A1D23] mb-2">
              Checking Recipient...
            </h2>
            <p className="text-sm text-[#6B7280] mb-6">
              We're checking our scam database for this number.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-[#0056D2] rounded-full animate-loading-bar"
                style={{ width: "40%" }}
              />
            </div>
          </div>
        )}

        {/* SCREEN 3: Scam Alert */}
        {currentScreen === 3 && flaggedInfo && (
          <div className="text-center">
            <div className="mb-4">
              <span className="text-6xl">🦹‍♂️</span>
            </div>
            <h2 className="text-lg font-bold text-red-600 mb-2">
              Potential Scam Alert!
            </h2>
            <p className="text-sm text-[#6B7280] mb-6">
              This number has received complaints from other GCash users.
            </p>

            <div className="bg-red-50 rounded-xl p-4 mb-4 text-left">
              <p className="text-sm text-red-600 font-medium mb-2">
                🚨 {flaggedInfo.reportCount} Users Reported
              </p>
              <p className="text-sm text-red-600 font-medium mb-2">
                🚨 Last Report:{" "}
                {new Date(flaggedInfo.last_reported).toLocaleDateString()}
              </p>
              <p className="text-sm text-red-600 font-medium">
                📍 Issue: {flaggedInfo.commonIssue}
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6 flex gap-3">
              <div className="w-6 h-6 bg-[#0056D2] rounded-full flex items-center justify-center text-white text-xs font-bold">
                ✓
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#0056D2] text-sm">
                  Stay Safe Tip
                </p>
                <p className="text-xs text-[#1565C0]">
                  Only send money to people you trust. Scammers often ask for
                  advance payments.
                </p>
              </div>
            </div>

            <button
              onClick={reportNumber}
              className="w-full py-3 rounded-xl bg-yellow-500 text-white font-semibold mb-3"
            >
              Report This Number
            </button>
            <button
              onClick={() => goToScreen(1)}
              className="w-full py-3 rounded-xl border-2 border-[#0056D2] text-[#0056D2] font-semibold mb-3"
            >
              Go Back
            </button>
            <button
              onClick={() => goToScreen(4)}
              className="w-full py-3 text-[#0056D2] text-sm font-semibold"
            >
              Proceed Anyway
            </button>
          </div>
        )}

        {/* SCREEN 4: Proceed Anyway Confirmation */}
        {currentScreen === 4 && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">!</span>
              </div>
              <h3 className="text-lg font-bold text-[#1A1D23] mb-2">
                Are you sure?
              </h3>
              <p className="text-sm text-[#6B7280] mb-6">
                You're about to send money to a number with reported issues.
              </p>
              <button
                onClick={sendMoney}
                disabled={sendingMoney}
                className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold mb-3 disabled:opacity-50"
              >
                {sendingMoney ? "Processing..." : "Yes, Proceed"}
              </button>
              <button
                onClick={() => goToScreen(3)}
                className="w-full py-3 text-[#6B7280] text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: Safe to Send */}
        {currentScreen === 5 && (
          <div className="text-center">
            <div className="mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-check text-green-600 text-3xl" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-green-600 mb-2">
              Looks Safe!
            </h2>
            <p className="text-sm text-[#6B7280] mb-6">
              No scam reports found. You can send with confidence.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-xl">
                👤
              </div>
              <div className="text-left flex-1">
                <p className="text-xs text-[#6B7280] mb-1">Recipient</p>
                <p className="font-semibold text-[#1A1D23]">Recipient Name</p>
                <p className="text-xs text-[#6B7280]">{getFormattedMobile()}</p>
              </div>
            </div>

            <button
              onClick={sendMoney}
              disabled={sendingMoney}
              className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50"
            >
              {sendingMoney ? "Processing..." : `Send ₱${getFormattedAmount()}`}
            </button>
          </div>
        )}

        {/* SCREEN 6: Limit Exceeded */}
        {currentScreen === 6 && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-chart-line text-red-600 text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1D23] mb-2">
                Spending Limit Reached!
              </h3>
              <p className="text-sm text-[#6B7280] mb-2">
                You've reached your monthly spending limit of ₱
                {monthlyLimit.toLocaleString()}.
              </p>
              <p className="text-sm text-[#6B7280] mb-6">
                Current spend: ₱{totalSpent.toLocaleString()}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/spending-limit")}
                  className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold"
                >
                  Edit Limit
                </button>
                <button
                  onClick={() => goToScreen(1)}
                  className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Insufficient Balance Warning */}
        {insufficientBalance && (
          <div className="fixed bottom-24 left-4 right-4 bg-red-500 text-white rounded-xl p-3 text-center text-sm animate-slide-up">
            <i className="fa-solid fa-exclamation-circle mr-2" />
            Insufficient balance! You need ₱
            {(parseFloat(amount) || 0).toLocaleString()}
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 20%;
          }
          50% {
            width: 80%;
          }
          100% {
            width: 20%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
