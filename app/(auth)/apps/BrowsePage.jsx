"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AppCard from "@/components/AppCard";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function BrowsePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [subscribedIds, setSubscribedIds] = useState(new Set());
  const [modalApp, setModalApp] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Fetch user's current balance
  const fetchUserBalance = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching balance:", error);
      return 0;
    }

    if (data) {
      setUserBalance(data.balance);
      return data.balance;
    } else {
      // Create balance record if doesn't exist
      const { data: newBalance, error: insertError } = await supabase
        .from("user_balances")
        .insert([{ user_id: user.id, balance: 5000 }])
        .select()
        .maybeSingle();

      if (!insertError && newBalance) {
        setUserBalance(newBalance.balance);
        return newBalance.balance;
      }
      return 5000; // Default fallback
    }
  }, [user]);

  // Fetch available apps from Supabase
  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("available_apps")
      .select("*")
      .order("name", { ascending: true });
    setApps(data || []);
    setLoadingApps(false);
  }, []);

  // Fetch user's active subscriptions for duplicate prevention
  const fetchSubscribed = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("app_id")
      .eq("user_id", user.id)
      .neq("status", "cancelled");
    setSubscribedIds(new Set((data || []).map((s) => s.app_id)));
  }, [user]);

  useEffect(() => {
    fetchApps();
    fetchSubscribed();
    fetchUserBalance();
  }, [fetchApps, fetchSubscribed, fetchUserBalance]);

  const handleSubscribe = async () => {
    if (!modalApp || !user) return;

    // Check if user has sufficient balance
    const currentBalance = await fetchUserBalance();
    const price = Number(modalApp.price);

    if (currentBalance < price) {
      setInsufficientBalance(true);
      setTimeout(() => setInsufficientBalance(false), 3000);
      return;
    }

    setSubscribing(true);

    const renewDate = new Date();
    renewDate.setMonth(renewDate.getMonth() + 1);

    try {
      // First, create the subscription
      const { error: subError } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        app_id: modalApp.id,
        name: modalApp.name,
        icon: modalApp.icon,
        color: modalApp.color,
        price: modalApp.price,
        status: "active",
        renew_date: renewDate.toISOString().split("T")[0],
      });

      if (subError) throw subError;

      // Record the transaction in transactions table
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: price,
          category: "subscription",
          description: `${modalApp.name} subscription`,
          transaction_date: new Date().toISOString().split("T")[0],
        });

      if (transactionError) {
        console.error("Error recording transaction:", transactionError);
      }

      // Then, deduct the amount from user's balance
      const newBalance = currentBalance - price;
      const { error: balanceError } = await supabase
        .from("user_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (balanceError) throw balanceError;

      // Update local state
      setUserBalance(newBalance);
      setSubscribedIds((prev) => new Set([...prev, modalApp.id]));
      setModalApp(null);

      // Show success message
      alert(
        `Successfully subscribed to ${modalApp.name}! Remaining balance: ₱${newBalance.toLocaleString()}`,
      );
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to subscribe. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  // Derive categories from fetched apps
  const categories = [
    "All",
    ...new Set(apps.map((a) => a.category).filter(Boolean)),
  ];

  const filtered = apps.filter((app) => {
    const matchCat = category === "All" || app.category === category;
    const matchSearch = app.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <Header title="Browse Apps" subtitle="Subscribe to a service" />

      {/* Balance Indicator */}
      <div className="px-4 mb-3">
        <div className="bg-[#E8F0FE] rounded-xl px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-wallet text-[#0056D2] text-sm" />
            <span className="text-sm font-medium text-[#6B7280]">
              Your Balance:
            </span>
          </div>
          <span className="text-sm font-bold text-[#1A1D23]">
            ₱{userBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 mb-6 flex flex-col gap-3">
        <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 flex items-center gap-3">
          <i className="fa-solid fa-magnifying-glass text-[#6B7280] text-sm" />
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-none outline-none text-sm bg-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-all ${
                category === cat
                  ? "bg-[#0056D2] text-white border-[#0056D2]"
                  : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#0056D2] hover:text-[#0056D2]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Apps grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 pb-8">
        {loadingApps ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 h-48 animate-pulse"
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-[#6B7280]">
            <i className="fa-solid fa-magnifying-glass text-4xl mb-3 block opacity-30" />
            <p className="font-medium">No apps found</p>
          </div>
        ) : (
          filtered.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              isSubscribed={subscribedIds.has(app.id)}
              onSubscribe={setModalApp}
            />
          ))
        )}
      </div>

      {/* Subscribe modal */}
      {modalApp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-[0_12px_40px_rgba(0,0,0,.2)] text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl"
              style={{ backgroundColor: modalApp.color }}
            >
              <i className={`fa-brands ${modalApp.icon}`} />
            </div>
            <h3 className="text-xl font-bold mb-1">{modalApp.name}</h3>
            <p className="text-[#6B7280] text-sm mb-4">{modalApp.category}</p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-3xl font-bold text-[#0056D2]">
                ₱{Number(modalApp.price).toLocaleString()}
              </span>
              <span className="text-[#6B7280] text-sm">/ month</span>
            </div>

            {/* Show balance after deduction */}
            <p className="text-xs text-[#6B7280] mb-6">
              After subscription: ₱
              {(userBalance - Number(modalApp.price)).toLocaleString()}
            </p>

            {/* Insufficient balance warning */}
            {insufficientBalance && (
              <div className="mb-4 p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">
                  Insufficient balance! You need ₱
                  {Number(modalApp.price).toLocaleString()} to subscribe.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalApp(null)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubscribe}
                disabled={subscribing || userBalance < Number(modalApp.price)}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold hover:bg-[#003E9C] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {subscribing ? "Subscribing..." : "Subscribe"}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </>
  );
}
