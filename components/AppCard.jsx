export default function AppCard({ app, isSubscribed, onSubscribe }) {
  return (
    <div className="bg-white rounded-2xl p-5 text-center shadow-[0_1px_3px_rgba(0,0,0,.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,.10)] transition-shadow">
      <div
        className="w-15 h-15 rounded-[15px] mx-auto mb-3 flex items-center justify-center text-white text-2xl"
        style={{ width: 60, height: 60, backgroundColor: app.color }}
      >
        <i className={app.icon} />
      </div>
      <p className="font-semibold text-sm text-[#1A1D23] mb-0.5">{app.name}</p>
      <p className="text-xs text-[#6B7280] mb-1">{app.category}</p>
      <p className="text-sm font-bold text-[#0056D2] mb-3">₱{app.price}<span className="text-xs font-normal text-[#6B7280]">/mo</span></p>
      <button
        onClick={() => !isSubscribed && onSubscribe(app)}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isSubscribed
            ? 'bg-[#E7F6EC] text-[#0F9D58] cursor-default'
            : 'bg-[#E8F0FE] text-[#0056D2] hover:bg-[#0056D2] hover:text-white'
        }`}
      >
        {isSubscribed ? '✓ Subscribed' : 'Subscribe'}
      </button>
    </div>
  )
}
