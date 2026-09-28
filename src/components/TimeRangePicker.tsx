import { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

export interface TimeRange {
  label: string;
  value: string;
  hours: number;
}

export const timeRanges: TimeRange[] = [
  { label: "Last 15 minutes", value: "15m", hours: 0.25 },
  { label: "Last 30 minutes", value: "30m", hours: 0.5 },
  { label: "Last 1 hour", value: "1h", hours: 1 },
  { label: "Last 3 hours", value: "3h", hours: 3 },
  { label: "Last 6 hours", value: "6h", hours: 6 },
  { label: "Last 12 hours", value: "12h", hours: 12 },
  { label: "Last 24 hours", value: "24h", hours: 24 },
  { label: "Last 2 days", value: "2d", hours: 48 },
  { label: "Last 7 days", value: "7d", hours: 168 },
  { label: "Last 30 days", value: "30d", hours: 720 },
];

interface TimeRangePickerProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

const TimeRangePicker = ({ selected, onChange }: TimeRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary text-sm text-foreground hover:bg-accent transition-colors"
      >
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{selected.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Time range</p>
          </div>
          <div className="p-1 max-h-64 overflow-y-auto">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => { onChange(range); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  selected.value === range.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeRangePicker;
