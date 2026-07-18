import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  searchable = false,
  disabled = false,
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    // Reset focused index when filtering or opening
    setFocusedIndex(-1)
  }, [searchQuery, isOpen])

  // Focus search input when dropdown opens — cancel if it closes before the timer fires
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const id = setTimeout(() => {
        // Only steal focus if this select is still open
        if (searchInputRef.current) {
          searchInputRef.current.focus()
        }
      }, 50)
      return () => clearTimeout(id)
    }
  }, [isOpen, searchable])

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [isOpen])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearchQuery('')
    // Return focus to trigger button
    triggerRef.current?.focus()
  }

  // Keyboard navigation support
  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        e.preventDefault()
        break
      case 'Tab':
        setIsOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((prev) => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex].value)
        } else if (filteredOptions.length > 0) {
          // Default to first match if nothing focused yet
          handleSelect(filteredOptions[0].value)
        }
        break
      default:
        break
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full text-left font-sans', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[48px] rounded-xl border transition-all text-sm font-semibold select-none',
          isOpen 
            ? 'border-[#00f2fe]/40 shadow-[0_0_15px_rgba(0,242,254,0.15)] ring-1 ring-[#00f2fe]/20 bg-[#111827]' 
            : 'border-white/5 bg-white/3 hover:border-white/10 hover:bg-white/5 text-text-primary',
          disabled && 'opacity-40 cursor-not-allowed bg-white/1'
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-white/55 font-normal')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-tertiary transition-transform duration-300 shrink-0',
            isOpen && 'rotate-180 text-[#00f2fe]'
          )}
        />
      </button>

      {/* Dropdown Options Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'absolute z-50 top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl border backdrop-blur-xl flex flex-col',
              'bg-[#111827] border-white/8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
            )}
          >
            {/* Search Input Box */}
            {searchable && (
              <div className="relative p-1 border-b border-white/5 mb-1.5 shrink-0 flex items-center">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/30 border border-white/5 text-xs text-white placeholder:text-white/45 caret-white outline-none focus:border-[#00f2fe]/45 transition-colors"
                />
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto py-0.5 space-y-1 select-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-text-tertiary font-mono">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value
                  const isFocused = index === focusedIndex

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs text-left transition-all relative overflow-hidden',
                        isSelected
                          ? 'font-bold text-white bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] shadow-md'
                          : isFocused 
                            ? 'bg-[#1E293B] text-white scale-[1.02] translate-y-[-1px] shadow-[0_0_10px_rgba(0,242,254,0.1)] border-white/10'
                            : 'text-white/85 hover:bg-[#1E293B] hover:scale-[1.02] hover:translate-y-[-1px] hover:shadow-[0_0_10px_rgba(0,242,254,0.08)]'
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
