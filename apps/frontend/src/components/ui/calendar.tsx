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
        caption_label: "text-base font-semibold text-slate-900",
        nav: "space-x-1 flex items-center gap-2",
        nav_button: cn(
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2",
        head_row: "flex mb-2",
        head_cell:
          "text-slate-600 rounded-md w-10 font-semibold text-xs tracking-wide uppercase flex items-center justify-center",
        row: "flex w-full gap-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-lg [&:has([aria-selected].day-outside)]:bg-slate-50/50 [&:has([aria-selected])]:bg-cyan-100/70 first:[&:has([aria-selected])]:rounded-l-lg last:[&:has([aria-selected])]:rounded-r-lg focus-within:relative focus-within:z-20",
        day: cn(
          "h-10 w-10 p-0 font-medium aria-selected:opacity-100 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-1"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-cyan-600 text-white hover:bg-cyan-700 hover:text-white focus:bg-cyan-700 focus:text-white font-semibold",
        day_today: "bg-slate-200 text-slate-900 font-semibold border-2 border-slate-300",
        day_outside:
          "day-outside text-slate-400 opacity-40 aria-selected:bg-slate-100/40 aria-selected:text-slate-400 aria-selected:opacity-30",
        day_disabled: "text-slate-300 opacity-40 cursor-not-allowed",
        day_range_middle:
          "aria-selected:bg-cyan-100 aria-selected:text-slate-900",
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
