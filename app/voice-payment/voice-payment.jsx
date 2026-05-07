"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function VoicePaymentPage() {
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [isClient, setIsClient] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [userBalance, setUserBalance] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10000);
  const [totalSpent, setTotalSpent] = useState(0);
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [matchedContacts, setMatchedContacts] = useState([]);
  const [showContactSelection, setShowContactSelection] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  const recognitionRef = useRef(null);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Network status monitoring
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Safe navigation
  useEffect(() => {
    if (pendingNavigation !== null) {
      setCurrentScreen(pendingNavigation);
      if (pendingNavigation === 1) {
        setError(null);
        setPaymentDetails(null);
        setRecognizedText("");
        setShowContactSelection(false);
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const navigateTo = useCallback((screenNumber) => {
    setPendingNavigation(screenNumber);
  }, []);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: balanceData } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserBalance(balanceData?.balance || 0);

      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("spending_limit, limit_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsData) {
        setMonthlyLimit(settingsData.spending_limit || 10000);
        setLimitEnabled(settingsData.limit_enabled ?? true);
      }

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

      await fetchContacts();
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching contacts:", error);
    } else if (data && data.length > 0) {
      setContacts(data);
    } else {
      const defaultContacts = [
        { name: "Maria Santos", phone_number: "09171234567", avatar: "👩" },
        { name: "John Doe", phone_number: "09189876543", avatar: "👨" },
        { name: "Juan Dela Cruz", phone_number: "09091234567", avatar: "🧑" },
      ];

      for (const contact of defaultContacts) {
        await supabase.from("contacts").insert({
          user_id: user.id,
          name: contact.name,
          phone_number: contact.phone_number,
          avatar: contact.avatar,
        });
      }

      const { data: newContacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      setContacts(newContacts || []);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Search for contact by name
  const searchContactByName = (name) => {
    const searchTerm = name.toLowerCase();
    const matches = contacts.filter((contact) =>
      contact.name.toLowerCase().includes(searchTerm),
    );
    return matches;
  };

  // Initialize speech recognition with better error handling
  const initSpeechRecognition = useCallback(() => {
    // Check if browser supports speech recognition
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
      );
      return false;
    }

    // Check internet connection
    if (!navigator.onLine) {
      setError(
        "No internet connection. Please check your network and try again.",
      );
      return false;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(transcript);
      processVoiceCommand(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);

      // User-friendly error messages
      switch (event.error) {
        case "network":
          setError("Network error. Please check your internet connection.");
          break;
        case "not-allowed":
          setError(
            "Microphone access denied. Please allow microphone permission and refresh the page.",
          );
          break;
        case "no-speech":
          setError("No speech detected. Please try again.");
          break;
        case "audio-capture":
          setError("No microphone found. Please check your microphone.");
          break;
        case "aborted":
          setError("Speech recognition was cancelled. Please try again.");
          break;
        default:
          setError(`Something went wrong. Please refresh and try again.`);
      }

      setIsListening(false);
      // Go back to home after error
      setTimeout(() => {
        navigateTo(1);
      }, 2000);
    };

    recognitionRef.current = recognition;
    return true;
  }, [navigateTo]);

  // Process voice command
  const processVoiceCommand = useCallback(
    (transcript) => {
      const lowerText = transcript.toLowerCase();

      const amountMatch = transcript.match(/\d+(?:\.\d+)?/);
      const amount = amountMatch ? parseFloat(amountMatch[0]) : null;

      let recipientName = "";
      const toMatch = lowerText.match(/to\s+([\w\s]+)$/);
      if (toMatch) {
        recipientName = toMatch[1].trim();
      } else {
        const words = transcript.split(" ");
        const amountIndex = words.findIndex((w) => /^\d+/.test(w));
        if (amountIndex !== -1) {
          recipientName = words.slice(amountIndex + 1).join(" ");
        }
      }

      if (!amount || amount <= 0) {
        setError('Could not detect amount. Try: "Send 500 to Maria"');
        navigateTo(1);
        return;
      }

      if (!recipientName) {
        setError('Could not detect recipient. Try: "Send 500 to Maria"');
        navigateTo(1);
        return;
      }

      const matches = searchContactByName(recipientName);

      if (matches.length === 0) {
        setError(
          `No contact found matching "${recipientName}". Please add them to contacts first.`,
        );
        navigateTo(1);
        return;
      }

      if (matches.length === 1) {
        const contact = matches[0];

        if (userBalance < amount) {
          setError(
            `Insufficient balance. You have ₱${userBalance.toLocaleString()}`,
          );
          navigateTo(1);
          return;
        }

        if (limitEnabled && totalSpent + amount > monthlyLimit) {
          setError(
            `This would exceed your spending limit of ₱${monthlyLimit.toLocaleString()}`,
          );
          navigateTo(1);
          return;
        }

        setPaymentDetails({
          id: contact.id,
          recipient: contact.name,
          recipientNumber: contact.phone_number,
          amount: amount,
          avatar: contact.avatar,
        });
        navigateTo(3);
      } else {
        setMatchedContacts(matches.map((m) => ({ ...m, amount })));
        setShowContactSelection(true);
        setPendingNavigation(5);
      }
    },
    [userBalance, limitEnabled, totalSpent, monthlyLimit, contacts, navigateTo],
  );

  // Request microphone permission and start voice payment
  const startVoicePayment = useCallback(async () => {
    // Check internet first
    if (!navigator.onLine) {
      setError("No internet connection. Please check your network.");
      return;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      // Permission granted, initialize speech recognition
      if (!initSpeechRecognition()) return;
      recognitionRef.current?.start();
      navigateTo(2);
    } catch (err) {
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError") {
        setError(
          "Microphone access denied. Please click the lock icon and allow microphone access.",
        );
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.");
      } else {
        setError("Could not access microphone. Please check your permissions.");
      }
    }
  }, [initSpeechRecognition, navigateTo]);

  const processPayment = async () => {
    if (!paymentDetails || !user) return;

    setProcessing(true);

    try {
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: paymentDetails.amount,
          category: "voice_pay",
          description: `Voice payment to ${paymentDetails.recipient}`,
          recipient: paymentDetails.recipientNumber,
          transaction_date: new Date().toISOString().split("T")[0],
        });

      if (transactionError) throw transactionError;

      const newBalance = userBalance - paymentDetails.amount;
      const { error: balanceError } = await supabase
        .from("user_balances")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

      if (balanceError) throw balanceError;

      setUserBalance(newBalance);
      setTotalSpent(totalSpent + paymentDetails.amount);

      navigateTo(4);
    } catch (error) {
      console.error("Payment error:", error);
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
    setShowContactSelection(false);
    navigateTo(3);
  };

  const addContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      setError("Please enter both name and phone number");
      return;
    }

    const avatars = ["👩", "👨", "🧑", "👩‍🦱", "👨‍🦰"];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      name: newContactName,
      phone_number: newContactPhone,
      avatar: randomAvatar,
    });

    if (error) {
      console.error("Error adding contact:", error);
      setError("Failed to add contact");
    } else {
      await fetchContacts();
      setNewContactName("");
      setNewContactPhone("");
      setShowAddContact(false);
      setError(null);
    }
  };

  const deleteContact = async (contactId) => {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId);

    if (error) {
      console.error("Error deleting contact:", error);
    } else {
      await fetchContacts();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!user) {
    router.push("/login");
    return null;
  }

  // Server-side loading state
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0056D2] mx-auto"></div>
          <p className="mt-4 text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  const limitRemaining = limitEnabled
    ? Math.max(0, monthlyLimit - totalSpent)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Voice Pay" subtitle="Pay by speaking" />

      <div className="px-4 py-4">
        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <p className="text-yellow-700 text-sm text-center">
              ⚠️ You are offline. Speech recognition requires an internet
              connection.
            </p>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#0056D2] to-[#0076FF] rounded-2xl p-4 mb-6 text-white">
          <p className="text-white/70 text-xs mb-1">Your Balance</p>
          <p className="text-2xl font-bold">₱{userBalance.toLocaleString()}</p>
          {limitEnabled && (
            <p className="text-white/60 text-[10px] mt-1">
              Limit remaining: ₱{limitRemaining.toLocaleString()}
            </p>
          )}
        </div>

        {/* Error Message with Retry Button */}
        {error && (
          <div
            className={`rounded-xl p-3 mb-4 ${error.includes("network") || error.includes("internet") ? "bg-yellow-50 border border-yellow-200" : "bg-red-50 border border-red-200"}`}
          >
            <p
              className={`text-sm text-center ${error.includes("network") || error.includes("internet") ? "text-yellow-700" : "text-red-600"} mb-2`}
            >
              {error}
            </p>
            {(error.includes("network") ||
              error.includes("internet") ||
              error.includes("microphone")) && (
              <button
                onClick={startVoicePayment}
                className="w-full py-2 rounded-lg bg-[#0056D2] text-white text-sm font-semibold"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* SCREEN 1: Dashboard */}
        {currentScreen === 1 && (
          <div>
            <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] mb-6 text-center">
              <div className="w-24 h-24 bg-[#0056D2] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-microphone-lines text-white text-4xl" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1D23] mb-2">
                Voice Payment
              </h2>
              <p className="text-sm text-[#6B7280] mb-6">
                Just speak to pay. It's that easy!
              </p>
              <button
                onClick={startVoicePayment}
                disabled={!isOnline}
                className="w-full py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Voice Payment
              </button>
            </div>

            {/* Contacts List */}
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
                      Add contacts to send money via voice
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
                        className="text-red-500 text-sm"
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

        {/* SCREEN 2: Listening */}
        {currentScreen === 2 && (
          <div className="text-center py-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-[#0056D2]/20 rounded-full animate-ping"></div>
              </div>
              <div className="relative w-24 h-24 bg-[#0056D2] rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-microphone text-white text-3xl animate-pulse" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[#1A1D23] mb-2">
              Listening...
            </h3>
            <p className="text-sm text-[#6B7280] mb-4">
              Say "Send [amount] to [contact name]"
            </p>
            <p className="text-xs text-[#6B7280]">
              Example: "Send 500 to Maria"
            </p>

            <div className="flex justify-center gap-1 py-4">
              {[1, 2, 3, 2, 1].map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#0056D2] rounded-full animate-wave"
                  style={{
                    height: `${height * 8}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            {recognizedText && (
              <div className="bg-gray-100 rounded-xl p-3 mt-4">
                <p className="text-sm text-[#6B7280]">I heard:</p>
                <p className="font-medium text-[#1A1D23]">"{recognizedText}"</p>
              </div>
            )}

            <button
              onClick={() => navigateTo(1)}
              className="mt-8 py-2 text-[#6B7280] text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {/* SCREEN 3: Confirmation */}
        {currentScreen === 3 && paymentDetails && (
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
                onClick={() => navigateTo(1)}
                className="flex-1 py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processing}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold disabled:opacity-50"
              >
                {processing ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 4: Success */}
        {currentScreen === 4 && paymentDetails && (
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
                onClick={() => navigateTo(1)}
                className="flex-1 py-3 rounded-xl bg-[#0056D2] text-white font-semibold"
              >
                New Payment
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: Contact Selection */}
        {currentScreen === 5 && (
          <div>
            <h2 className="text-lg font-bold text-[#1A1D23] mb-4">
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
              onClick={() => navigateTo(1)}
              className="w-full py-3 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Add Contact Modal */}
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
                  onClick={() => setShowAddContact(false)}
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
