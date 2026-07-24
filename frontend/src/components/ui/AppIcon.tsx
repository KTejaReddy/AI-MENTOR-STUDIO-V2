import { cn } from '@/lib/utils'
import arkoreLogo from '@/assets/branding/arkore-logo-transparent.png'

interface AppIconProps {
  className?: string
  iconClassName?: string
}

export function AppIcon({ className, iconClassName }: AppIconProps) {
  return (
    <div 
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl transition-colors",
        "bg-black/5 dark:bg-white/90",
        "border border-black/10 dark:border-white",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
        "backdrop-blur-md",
        className
      )}
    >
      <img
        src={arkoreLogo}
        alt="ARKORE LOGICS"
        className={cn(
          "w-auto h-auto max-w-[135%] max-h-[135%] object-contain",
          iconClassName
        )}
      />
    </div>
  )
}
