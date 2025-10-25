import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "../../lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    {/*
      Use absolute positioning for the indicator so its background-gradient
      cannot be suppressed by parent flex layout or sizing. Keep a small
      visual clamp for 0 values (render-only) so a thin sliver is visible.
    */}
    <ProgressPrimitive.Indicator
      aria-hidden
      // expose a data attribute for easier inspection in DevTools
      data-progress-width={`${Math.max(3, Number(value || 0))}%`}
      className="absolute left-0 top-0 bottom-0 transition-all"
      // Provide explicit inline background & height to avoid external CSS/utility purge
      // hiding the gradient and to make computed styles visible in DevTools.
      style={{
        width: `${Math.max(3, Number(value || 0))}%`,
        height: '100%',
        backgroundImage: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
      }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }