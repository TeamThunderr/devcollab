import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "../../lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col space-y-6",
        month: "space-y-5",
        caption: "flex justify-between items-center px-1 pt-1 pb-3 relative",
        caption_label: "text-sm font-bold text-slate-100",
        nav: "space-x-1 flex items-center gap-2",
        nav_button: cn(
          "h-7 w-7 bg-transparent p-0 opacity-80 hover:opacity-100 flex items-center justify-center rounded-lg border border-white/[0.04] bg-white/[0.02] hover:border-slate-800 hover:bg-white/[0.05] text-slate-355 transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2",
        head_row: "flex mb-2",
        head_cell:
          "text-slate-500 rounded-md w-10 font-extrabold text-[10px] tracking-wider uppercase flex items-center justify-center",
        row: "flex w-full gap-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-white/[0.01] [&:has([aria-selected])]:bg-indigo-650/20 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
        day: cn(
          "h-10 w-10 p-0 font-bold aria-selected:opacity-100 flex items-center justify-center rounded-lg hover:bg-slate-800 hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-slate-300 text-xs"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white focus:bg-indigo-750 focus:text-white font-extrabold shadow-md shadow-indigo-650/10",
        day_today: "bg-slate-900 text-white font-extrabold border border-indigo-500/40",
        day_outside:
          "day-outside text-slate-650 opacity-30 aria-selected:bg-white/[0.01] aria-selected:text-slate-650",
        day_disabled: "text-slate-800 opacity-20 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-indigo-600/20 aria-selected:text-indigo-200",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-5 w-5" />,
        IconRight: () => <ChevronRight className="h-5 w-5" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
