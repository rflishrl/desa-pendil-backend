import { cn } from '#lib/utils.js';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs';

const BASE_CLASSES =
	'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
	destructive:
		'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
	outline:
		'border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
	secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
	ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
	link: 'text-primary underline-offset-4 hover:underline'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
	default: 'h-9 px-4 py-2',
	sm: 'h-8 gap-1.5 rounded-md px-3 text-xs',
	lg: 'h-10 rounded-md px-6',
	icon: 'size-9',
	'icon-sm': 'size-8',
	'icon-xs': 'size-6 rounded-sm'
};

export function buttonVariants({
	variant = 'default',
	size = 'default',
	className
}: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
} = {}): string {
	return cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}
