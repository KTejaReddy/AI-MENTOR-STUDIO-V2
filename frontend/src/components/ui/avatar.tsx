import { cn } from '@/lib/utils'

interface AvatarProps {
  initials?: string
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
}

export function Avatar({ initials, src, alt, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-accent/15 text-accent-light font-semibold overflow-hidden shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt || ''} className="h-full w-full object-cover" />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  )
}
