"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

// ─── Helpers ────────────────────────────────────────────────────────────────

function isPhoneNumber(str) {
  // Accepts 09XXXXXXXXX, +639XXXXXXXXX, or any 7–15 digit string
  return /^[+]?\d{7,15}$/.test(str.replace(/[\s\-().]/g, ""));
}

function normalizePhone(str) {
  return str.replace(/[\s\-().]/g, "");
}

function parseVoiceTranscript(transcript) {
  const normalized = transcript
    .toLowerCase()
    .replace(/^(please\s+)?(send|pay|transfer|give)\s+/i, "")
    .replace(/\b(pesos?|php|peso)\b/gi, "")
    .trim();

  // Matches: "100 to 09171234567" / "100 to Maria" / "100 Maria"
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s+(?:(?:to|for)\s+)?(.*)/);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  const recipient = match[2].replace(/^(to|for)\s+/i, "").trim();

  if (!amount || amount <= 0 || !recipient) return null;
  return { amount, recipient };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VoicePaymentPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ── Screen & UI state
  const [screen, setScreen] = useState("home"); // home | listening | confirm | success | pick
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // ── Voice state
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");

  // ── User / financial state
  const [userBalance, setUserBalance] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [totalSpent, setTotalSpent] = useState(0);
  const [limitEnabled, setLimitEnabled] = useState(true);

  // ── Contact state
  const [contacts, setContacts] = useState([]);
  const [matchedContacts, setMatchedContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  // ── Manual input state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualRecipient, setManualRecipient] = useState(""); // name OR phone number
  const [manualAmount, setManualAmount] = useState("");

  // ── Payment details for confirm / success screens
  const [paymentDetails, setPaymentDetails] = useState(null);

  // ── Refs (avoid stale closures in async / speech callbacks)
  const recognitionRef = useRef(null);
  const contactsRef = useRef([]);
  const limitEnabledRef = useRef(limitEnabled);
  const monthlyLimitRef = useRef(monthlyLimit);
  const totalSpentRef = useRef(totalSpent);

  useEffect(() => {
    limitEnabledRef.current = limitEnabled;
  }, [limitEnabled]);
  useEffect(() => {
    monthlyLimitRef.current = monthlyLimit;
  }, [monthlyLimit]);
  useEffect(() => {
    totalSpentRef.current = totalSpent;
  }, [totalSpent]);

  // ── Network monitoring
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const syncContacts = useCallback((data) => {
    setContacts(data);
    contactsRef.current = data;
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (fetchError) {
      console.error("Error fetching contacts:", fetchError);
      return;
    }

    if (data && data.length > 0) {
      syncContacts(data);
      return;
    }

    // Seed defaults on first load
    const defaults = [
      { name: "Maria Santos", phone_number: "09171234567", avatar: "👩" },
      { name: "John Doe", phone_number: "09189876543", avatar: "👨" },
      { name: "Juan Dela Cruz", phone_number: "09091234567", avatar: "🧑" },
    ];
    await supabase
      .from("contacts")
      .insert(defaults.map((c) => ({ ...c, user_id: user.id })));
    const { data: seeded } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    syncContacts(seeded || []);
  }, [user, syncContacts]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: balanceData }, { data: settingsData }] = await Promise.all(
        [
          supabase
            .from("user_balances")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_settings")
            .select("spending_limit, limit_enabled")
            .eq("user_id", user.id)
            .maybeSingle(),
        ],
      );

      setUserBalance(Number(balanceData?.balance || 0));

      if (settingsData) {
        setMonthlyLimit(settingsData.spending_limit || 10000);
        setLimitEnabled(settingsData.limit_enabled ?? true);
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: txns } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("transaction_date", startOfMonth.toISOString().split("T")[0]);

      const total = txns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      setTotalSpent(total);

      await fetchContacts();
    } catch (err) {
      console.error("fetchUserData error:", err);
    }
  }, [user, fetchContacts]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // ─── Recipient resolution ──────────────────────────────────────────────────
  //
  // Returns one of:
  //   { type: "phone",  phone, displayName, avatar, contactId }
  //   { type: "single", contact }
  //   { type: "multi",  matches }
  //   { type: "none",   term }

  const resolveRecipient = (recipientStr) => {
    const trimmed = recipientStr.trim();

    if (isPhoneNumber(trimmed)) {
      const phone = normalizePhone(trimmed);
      // Check if number belongs to a known contact for a nicer display
      const known = contactsRef.current.find(
        (c) => normalizePhone(c.phone_number) === phone,
      );
      return {
        type: "phone",
        phone,
        displayName: known ? known.name : phone,
        avatar: known?.avatar ?? "📱",
        contactId: known?.id ?? null,
      };
    }

    const term = trimmed.toLowerCase();
    const matches = contactsRef.current.filter((c) =>
      c.name.toLowerCase().includes(term),
    );

    if (matches.length === 0) return { type: "none", term: trimmed };
    if (matches.length === 1) return { type: "single", contact: matches[0] };
    return { type: "multi", matches };
  };

  // ─── Contact CRUD ──────────────────────────────────────────────────────────

  const addContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError("Please enter both name and phone number");
      return;
    }
    const avatars = ["👩", "👨", "🧑", "👩‍🦱", "👨‍🦰", "👵", "👴", "👧", "👦"];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const { error: insertError } = await supabase.from("contacts").insert({
      user_id: user.id,
      name: newContactName.trim(),
      phone_number: newContactPhone.trim(),
      avatar,
    });

    if (insertError) {
      setError("Failed to add contact");
      return;
    }
    await fetchContacts();
    setNewContactName("");
    setNewContactPhone("");
    setShowAddContact(false);
    setError(null);
  };

  const deleteContact = async (id) => {
    await supabase.from("contacts").delete().eq("id", id);
    await fetchContacts();
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const getFreshBalance = async () => {
    const { data } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = Number(data?.balance || 0);
    setUserBalance(balance);
    return balance;
  };

  const validatePayment = async (amount) => {
    const balance = await getFreshBalance();
    if (balance < amount)
      return `Insufficient balance. You have ₱${balance.toLocaleString()}, tried to send ₱${amount.toLocaleString()}`;
    if (
      limitEnabledRef.current &&
      totalSpentRef.current + amount > monthlyLimitRef.current
    )
      return `This would exceed your spending limit of ₱${monthlyLimitRef.current.toLocaleString()}`;
    return null;
  };

  // ─── Shared: build paymentDetails and navigate to confirm ─────────────────

  const buildAndConfirm = (resolved, amount) => {
    if (resolved.type === "phone") {
      setPaymentDetails({
        id: resolved.contactId,
        recipient: resolved.displayName,
        recipientNumber: resolved.phone,
        amount,
        avatar: resolved.avatar,
      });
      setScreen("confirm");
      return;
    }
    if (resolved.type === "single") {
      const c = resolved.contact;
      setPaymentDetails({
        id: c.id,
        recipient: c.name,
        recipientNumber: c.phone_number,
        amount,
        avatar: c.avatar,
      });
      setScreen("confirm");
      return;
    }
    if (resolved.type === "multi") {
      setMatchedContacts(resolved.matches.map((m) => ({ ...m, amount })));
      setScreen("pick");
      return;
    }
    // type === "none"
    setError(
      `No contact matching "${resolved.term}". Add them as a contact or enter a phone number directly.`,
    );
    setScreen("home");
  };

  // ─── Voice ─────────────────────────────────────────────────────────────────

  const handleTranscript = useCallback(async (transcript) => {
    const parsed = parseVoiceTranscript(transcript);
    if (!parsed) {
      setError(
        'Could not understand. Try: "Send 100 to Maria" or "100 to 09171234567"',
      );
      setScreen("home");
      return;
    }

    const { amount, recipient } = parsed;
    const validationError = await validatePayment(amount);
    if (validationError) {
      setError(validationError);
      setScreen("home");
      return;
    }

    buildAndConfirm(resolveRecipient(recipient), amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTranscriptRef = useRef(handleTranscript);
  useEffect(() => {
    handleTranscriptRef.current = handleTranscript;
  }, [handleTranscript]);

  const startVoicePayment = () => {
    if (!isOnline) {
      setError("No internet connection. Please use manual input.");
      return;
    }
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setRecognizedText("");
    };
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(transcript);
      if (event.results[0].isFinal) handleTranscriptRef.current(transcript);
    };
    recognition.onerror = (event) => {
      const msgs = {
        network: "Network error. Check your internet connection.",
        "not-allowed": "Microphone access denied.",
        "no-speech": "No speech detected. Please try again.",
      };
      setError(msgs[event.error] || `Recognition error: ${event.error}`);
      setIsListening(false);
      setScreen("home");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setScreen("listening");
  };

  // ─── Manual payment ────────────────────────────────────────────────────────

  const processManualPayment = async () => {
    const amount = parseFloat(manualAmount);
    if (!manualRecipient.trim() || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid recipient and amount.");
      return;
    }

    const validationError = await validatePayment(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    const resolved = resolveRecipient(manualRecipient);
    if (resolved.type === "none") {
      setError(
        `No contact matching "${resolved.term}". You can also enter a phone number directly.`,
      );
      return;
    }

    setShowManualInput(false);
    setManualRecipient("");
    setManualAmount("");
    setError(null);
    buildAndConfirm(resolved, amount);
  };

  // ─── Process payment ───────────────────────────────────────────────────────

  const processPayment = async () => {
    if (!paymentDetails || !user) return;
    setProcessing(true);
    try {
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: paymentDetails.amount,
        category: "voice_pay",
        description: `Voice payment to ${paymentDetails.recipient}`,
        recipient: paymentDetails.recipientNumber,
        transaction_date: new Date().toISOString().split("T")[0],
      });
      if (txError) throw txError;

      const { data: currentBal } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const newBalance =
        Number(currentBal?.balance || 0) - paymentDetails.amount;
      const { error: balError } = await supabase
        .from("user_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);
      if (balError) throw balError;

      setUserBalance(newBalance);
      setTotalSpent((prev) => prev + paymentDetails.amount);
      setScreen("success");
    } catch (err) {
      console.error("Payment error:", err);
      setError("Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const selectContact = (contact) => {
    setPaymentDetails({
      id: contact.id,
      recipient: contact.name,
      recipientNumber: contact.phone_number,
      amount: contact.amount,
      avatar: contact.avatar,
    });
    setScreen("confirm");
  };

  const goHome = () => {
    setScreen("home");
    setError(null);
    setPaymentDetails(null);
    setRecognizedText("");
    setMatchedContacts([]);
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  const limitRemaining = limitEnabled
    ? Math.max(0, monthlyLimit - totalSpent)
    : null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Voice Pay" subtitle="Pay by speaking" />

      <div className="px-4 py-4">
        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-yellow-700 text-sm text-center">
              ⚠️ You are offline. Voice payment unavailable — use manual input.
            </p>
          </div>
        )}

        {/* Balance card */}
        <div className="bg-gradient-to-br from-[#0056D2] to-[#0076FF] rounded-2xl p-4 mb-6 text-white">
          <p className="text-white/70 text-xs mb-1">Your Balance</p>
          <p className="text-2xl font-bold">₱{userBalance.toLocaleString()}</p>
          {limitEnabled && limitRemaining !== null && (
            <p className="text-white/60 text-[10px] mt-1">
              Monthly limit remaining: ₱{limitRemaining.toLocaleString()}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm text-center mb-2">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowManualInput(true);
                  setError(null);
                }}
                className="flex-1 py-2 rounded-lg bg-[#0056D2] text-white text-sm font-semibold"
              >
                Manual Input
              </button>
              <button
                onClick={() => setError(null)}
                className="flex-1 py-2 rounded-lg border border-[#0056D2] text-[#0056D2] text-sm font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Voice tips */}
        {(screen === "home" || screen === "listening") && (
          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-[#0056D2] font-semibold mb-2">
              Try saying:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-[#6B7280]">✓ "100 to Maria"</p>
              <p className="text-xs text-[#6B7280]">✓ "Send 500 to John"</p>
              <p className="text-xs text-[#6B7280]">
                ✓ "Pay 50 to 09171234567"
              </p>
            </div>
          </div>
        )}

        {/* ── HOME ── */}
        {screen === "home" && (
          <div>
            <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] mb-6 text-center">
              <div className="w-24 h-24 bg-[#0056D2] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-microphone-lines text-white text-4xl" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1D23] mb-2">
                Voice Payment
              </h2>
              <p className="text-sm text-[#6B7280] mb-6">
                Say a contact name or phone number to pay.
              </p>
              <button
                onClick={startVoicePayment}
                disabled={!isOnline}
                className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                Start Voice Payment
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
              >
                Manual Input
              </button>
            </div>

            {/* Contacts list */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-[#E5E7EB]">
                <h3 className="font-semibold text-[#1A1D23]">My Contacts</h3>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="text-[#0056D2] text-sm font-semibold"
                >
                  + Add New
                </button>
              </div>
              <div className="divide-y divide-[#E5E7EB]">
                {contacts.length === 0 ? (
                  <div className="p-8 text-center text-[#6B7280]">
                    <p>No contacts yet</p>
                    <p className="text-xs mt-1">
                      You can also send directly to a phone number
                    </p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                          {contact.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1D23]">
                            {contact.name}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            {contact.phone_number}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContact(contact.id)}
                        className="text-red-500 text-sm p-2"
                      >
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── LISTENING ── */}
        {screen === "listening" && (
          <div className="text-center py-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-[#0056D2]/20 rounded-full animate-ping" />
              </div>
              <div className="relative w-24 h-24 bg-[#0056D2] rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-microphone text-white text-3xl animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-[#1A1D23] mb-2">
              Listening…
            </h3>
            <p className="text-sm text-[#6B7280] mb-1">
              Say the amount and a contact name or phone number
            </p>
            <p className="text-xs text-[#6B7280]">
              e.g. "100 to Maria" or "Send 500 to 09171234567"
            </p>

            <div className="flex justify-center gap-1 py-6">
              {[1, 2, 3, 2, 1].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#0056D2] rounded-full animate-wave"
                  style={{
                    height: `${h * 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            {recognizedText && (
              <div className="bg-gray-100 rounded-xl p-3 mt-2">
                <p className="text-sm text-[#6B7280]">I heard:</p>
                <p className="font-medium text-[#1A1D23]">"{recognizedText}"</p>
              </div>
            )}

            <button
              onClick={goHome}
              className="mt-8 py-2 text-[#6B7280] text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── CONFIRM ── */}
        {screen === "confirm" && paymentDetails && (
          <div>
            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] mb-6">
              <div className="text-center mb-4">
                <i className="fa-solid fa-robot text-4xl text-[#0056D2] mb-2 block" />
                <p className="text-sm text-[#6B7280]">
                  Please confirm your payment:
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 py-2 border-b border-[#E5E7EB]">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                    {paymentDetails.avatar}
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Recipient</p>
                    <p className="font-semibold text-[#1A1D23]">
                      {paymentDetails.recipient}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {paymentDetails.recipientNumber}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#E5E7EB]">
                  <span className="text-sm text-[#6B7280]">Amount</span>
                  <span className="font-bold text-xl text-[#0056D2]">
                    ₱{paymentDetails.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-[#6B7280]">New Balance</span>
                  <span className="font-semibold text-[#1A1D23]">
                    ₱{(userBalance - paymentDetails.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={goHome}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processing}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50"
              >
                {processing ? "Processing…" : "Confirm Payment"}
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {screen === "success" && paymentDetails && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-green-600 text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-[#1A1D23] mb-2">
              Payment Successful!
            </h2>
            <p className="text-sm text-[#6B7280] mb-6">
              Your voice payment has been processed.
            </p>

            <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] mb-6">
              <div className="flex items-center gap-3 justify-center mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                  {paymentDetails.avatar}
                </div>
                <div className="text-left">
                  <p className="text-xs text-[#6B7280]">Sent to</p>
                  <p className="font-semibold text-[#1A1D23]">
                    {paymentDetails.recipient}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {paymentDetails.recipientNumber}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-[#1A1D23] mb-2">
                ₱{paymentDetails.amount.toLocaleString()}
              </p>
              <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                <p className="text-xs text-[#6B7280]">
                  Ref:{" "}
                  {Math.random().toString(36).substring(2, 10).toUpperCase()}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
              >
                Done
              </button>
              <button
                onClick={goHome}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold"
              >
                New Payment
              </button>
            </div>
          </div>
        )}

        {/* ── PICK CONTACT ── */}
        {screen === "pick" && (
          <div>
            <h2 className="text-lg font-bold text-[#1A1D23] mb-2">
              Select Recipient
            </h2>
            <p className="text-sm text-[#6B7280] mb-4">
              Multiple contacts match your voice command:
            </p>
            <div className="space-y-2 mb-6">
              {matchedContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className="w-full bg-white rounded-xl p-4 border border-[#E5E7EB] flex items-center gap-3 hover:border-[#0056D2] transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[#1A1D23]">
                      {contact.name}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {contact.phone_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#6B7280]">Amount</p>
                    <p className="font-bold text-[#0056D2]">
                      ₱{contact.amount.toLocaleString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={goHome}
              className="w-full py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── MANUAL INPUT MODAL ── */}
        {showManualInput && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-[#1A1D23] mb-1">
                Manual Payment
              </h3>
              <p className="text-xs text-[#6B7280] mb-4">
                Enter a contact name or phone number
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#6B7280] mb-1">
                  Recipient (name or phone number)
                </label>
                <input
                  type="text"
                  value={manualRecipient}
                  onChange={(e) => setManualRecipient(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0056D2]"
                  placeholder="e.g., Maria or 09171234567"
                  list="contact-names"
                />
                <datalist id="contact-names">
                  {contacts.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#6B7280] mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0056D2]"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setManualRecipient("");
                    setManualAmount("");
                  }}
                  className="flex-1 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={processManualPayment}
                  disabled={!manualRecipient || !manualAmount}
                  className="flex-1 py-2 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD CONTACT MODAL ── */}
        {showAddContact && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-[#1A1D23] mb-4">
                Add New Contact
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#6B7280] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0056D2]"
                  placeholder="e.g., Maria Santos"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-[#6B7280] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0056D2]"
                  placeholder="09171234567"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddContact(false);
                    setNewContactName("");
                    setNewContactPhone("");
                  }}
                  className="flex-1 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={addContact}
                  className="flex-1 py-2 rounded-xl bg-[#0056D2] text-white font-semibold"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1);
          }
        }
        .animate-wave {
          animation: wave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
