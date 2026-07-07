import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ButtonColorfulProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

// Recolored to the Glufloat brand: a blue to green gradient sheen
// instead of the original indigo/purple/pink.
export function ButtonColorful({
  className,
  label = "Start my 3-day free trial",
  ...props
}: ButtonColorfulProps) {
  return (
    <Button
      className={cn(
        "relative h-12 overflow-hidden px-6",
        "bg-[var(--blue-deep)]",
        "transition-all duration-200",
        "group",
        className,
      )}
      {...props}
    >
      {/* Brand gradient background effect */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-[var(--blue)] via-[var(--blue-bright)] to-[var(--green)]",
          "opacity-70 transition-opacity duration-500 group-hover:opacity-100",
        )}
      />

      {/* Content */}
      <div className="relative flex items-center justify-center gap-2">
        <span className="text-base font-bold text-white">{label}</span>
        <ArrowUpRight className="h-4 w-4 text-white/90 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Button>
  );
}
