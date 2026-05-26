import * as React from "react"
import { format, isBefore, startOfDay } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
  disablePastDates?: boolean
  disabled?: boolean
}

export function DatePicker({ date, setDate, placeholder = "No due date", disablePastDates = false, disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
  }

  return (
    <Popover open={disabled ? false : isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-semibold outline-none transition cursor-pointer select-none text-xs",
            disabled
              ? "border-white/[0.02] bg-slate-900/40 text-slate-650 pointer-events-none opacity-50 cursor-not-allowed"
              : "border-white/[0.04] bg-slate-950 hover:bg-slate-900/50 hover:border-slate-800 text-slate-300",
            !date && !disabled && "text-slate-500",
            date && !disabled && "text-slate-200"
          )}
        >
          <span className="truncate flex-1 text-xs">
            {date ? format(date, "PPP") : placeholder}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {date && !disabled && (
              <button
                onClick={handleClearDate}
                className="p-1 rounded-md hover:bg-white/5 transition"
                title="Clear date"
              >
                <X className="h-3.5 w-3.5 text-slate-500 hover:text-white" />
              </button>
            )}
            <CalendarIcon className="h-4 w-4 text-indigo-400" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 mt-2 border-none bg-transparent" align="start">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0e0f12] shadow-2xl backdrop-blur-md overflow-hidden">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              if (selectedDate && disablePastDates) {
                const today = startOfDay(new Date())
                if (isBefore(selectedDate, today)) {
                  return
                }
              }
              setDate(selectedDate)
              setIsOpen(false)
            }}
            disabled={(date) => {
              if (!disablePastDates) return false
              return isBefore(date, startOfDay(new Date()))
            }}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
