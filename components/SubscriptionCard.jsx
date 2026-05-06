"use client";

const STATUS_STYLES = {
  active: { badge: "bg-[#E7F6EC] text-[#0F9D58]", label: "Active" },
  "due soon": { badge: "bg-[#FFF4E5] text-[#F57C00]", label: "Due Soon" },
  cancelled: { badge: "bg-[#FDECEC] text-[#D32F2F]", label: "Cancelled" },
};

export default function SubscriptionCard({ sub, onCancel }) {
  const status = sub.status?.toLowerCase() || "active";
  const style = STATUS_STYLES[status] || STATUS_STYLES.active;
  const isCancelled = status === "cancelled";

  const renewLabel = sub.renew_date
    ? new Date(sub.renew_date).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_1px_3px_rgba(0,0,0,.08)]">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl shrink-0"
        style={{ backgroundColor: sub.color || "#0056D2" }}
      >
        <i className={`fa-brands ${sub.icon}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[#1A1D23] text-sm truncate">
            {sub.name}
          </p>
          <span
            className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full uppercase ${style.badge}`}
          >
            {style.label}
          </span>
        </div>
        <p className="text-xs text-[#6B7280] mt-0.5">Renews {renewLabel}</p>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="font-bold text-sm text-[#1A1D23]">
          ₱{Number(sub.price).toLocaleString()}
        </p>
        {!isCancelled && (
          <button
            onClick={() => onCancel(sub)}
            className="text-xs text-[#6B7280] hover:text-red-500 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
