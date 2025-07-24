'use client'

import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'
}

export function PageContainer({ 
  children, 
  className, 
  noPadding = false,
  maxWidth = '7xl'
}: PageContainerProps) {
  const maxWidthClass = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  }

  return (
    <div className={cn(
      'w-full mx-auto',
      maxWidthClass[maxWidth],
      !noPadding && 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12',
      className
    )}>
      {children}
    </div>
  )
}

interface PageHeaderProps {
  children: React.ReactNode
  className?: string
}

export function PageHeader({ children, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 sm:mb-8 lg:mb-12', className)}>
      {children}
    </div>
  )
}

interface PageTitleProps {
  children: React.ReactNode
  className?: string
  subtitle?: string
}

export function PageTitle({ children, className, subtitle }: PageTitleProps) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <h1 className={cn(
        'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900',
        className
      )}>
        {children}
      </h1>
      {subtitle && (
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  )
}

interface PageSectionProps {
  children: React.ReactNode
  className?: string
}

export function PageSection({ children, className }: PageSectionProps) {
  return (
    <section className={cn('space-y-4 sm:space-y-6 lg:space-y-8', className)}>
      {children}
    </section>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClass = {
    'sm': 'gap-3',
    'md': 'gap-4 sm:gap-6',
    'lg': 'gap-6 sm:gap-8',
    'xl': 'gap-8 sm:gap-10'
  }

  const getGridCols = () => {
    const classes = []
    if (cols.default) classes.push(`grid-cols-${cols.default}`)
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)
    if (cols['2xl']) classes.push(`2xl:grid-cols-${cols['2xl']}`)
    return classes.join(' ')
  }

  return (
    <div className={cn(
      'grid',
      getGridCols(),
      gapClass[gap],
      className
    )}>
      {children}
    </div>
  )
} 