import { cn } from '@/lib/utils'

interface AppIconProps {
  className?: string
  iconClassName?: string
}

export function AppIcon({ className, iconClassName }: AppIconProps) {
  return (
    <div 
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        "bg-black/5 dark:bg-white/10",
        "border border-black/10 dark:border-white/10",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
        "backdrop-blur-md",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={cn("w-[70%] h-[70%] text-text-primary", iconClassName)}
        fill="currentColor"
      >
        <path d="M 15 80 L 32 80 L 23.5 60 Z" />
        <path d="M 33 55 L 45 30 L 65 30 C 78 30 85 38 85 50 C 85 58 78 65 68 68 L 78 80 L 60 80 L 52 68 L 47 68 L 52 80 L 35 80 L 45 55 Z M 48 55 L 55 55 C 65 55 68 50 68 45 C 68 40 65 38 55 38 L 41 38 Z" fillRule="evenodd" />
      </svg>
    </div>
  )
}
