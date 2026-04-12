'use client'
import { useRef } from 'react'

export default function PinInput({ value = '', onChange, length = 6 }) {
  const inputs = useRef([])

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return
    const chars = value.split('')
    chars[i] = val[val.length - 1]
    onChange(chars.join(''))
    if (i < length - 1) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      const chars = value.split('')
      if (chars[i]) {
        chars[i] = ''
        onChange(chars.join(''))
      } else if (i > 0) {
        const prev = inputs.current[i - 1]
        prev?.focus()
        const c = value.split('')
        c[i - 1] = ''
        onChange(c.join(''))
      }
    }
  }

  return (
    <div className="flex gap-1.5 w-full justify-between">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="pin-dot flex-1 min-w-0 max-w-[46px] aspect-square rounded-xl border border-[#E5E7EB] text-center text-xl font-mono bg-white transition-all"
        />
      ))}
    </div>
  )
}
