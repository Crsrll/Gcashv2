import GLogo from './GLogo'

export default function LoginAside({ tagline, sub }) {
  return (
    <aside className="hidden md:flex md:w-[45%] bg-gradient-to-br from-[#0056D2] to-[#0076FF] text-white p-[60px_48px] relative overflow-hidden flex-col">
      <div className="flex items-center gap-3 mb-auto">
        <GLogo />
        <span className="font-bold text-2xl">GCash</span>
      </div>
      <div className="mt-auto">
        <h2 className="text-[2.4rem] font-bold leading-tight mb-4">{tagline}</h2>
        {sub && <p className="text-white/70 text-base">{sub}</p>}
      </div>
      {/* Decorative blobs */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-white opacity-[0.18] -bottom-20 -right-20" />
      <div className="absolute w-[180px] h-[180px] rounded-full bg-white opacity-[0.10] top-10 right-20" />
    </aside>
  )
}
