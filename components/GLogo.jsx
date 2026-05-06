export default function GLogo({ small = false }) {
  const size = small
    ? 'w-9 h-9 text-xl rounded-[10px]'
    : 'w-[52px] h-[52px] text-[28px] rounded-[14px]'
  return (
    <div
      className={`bg-[#0056D2] text-white flex items-center justify-center font-bold flex-shrink-0 shadow-[0_4px_12px_rgba(0,86,210,.35)] ${size}`}
    >
      G
    </div>
  )
}
