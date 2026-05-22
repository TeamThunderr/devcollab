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
}

export function DatePicker({ date, setDate, placeholder = "No due date", disablePastDates = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const handleClearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-medium outline-none transition",
            "hover:border-slate-300 hover:bg-slate-50",
            "focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30",
            !date && "text-slate-500",
            date && "text-slate-900"
          )}
        >
          <span className="truncate flex-1 text-base">
            {date ? format(date, "PPP") : placeholder}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {date && (
              <button
                onClick={handleClearDate}
                className="p-1 rounded-md hover:bg-slate-200 transition"
                title="Clear date"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
            <CalendarIcon className="h-5 w-5 text-cyan-600" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 mt-2" align="start">
        <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
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
