import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export function Button({ tone = 'primary', loading = false, className = '', children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; loading?: boolean }) {
  const toneClass = {
    primary: 'bg-primary text-primary-foreground border-primary hover:brightness-105',
    secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-background',
    ghost: 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground border-destructive hover:brightness-105',
    outline: 'bg-card text-foreground border-border hover:border-primary hover:text-primary',
  }[tone];
  return <button disabled={disabled || loading} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${toneClass} ${className}`} {...props}>{loading && <LoaderCircle size={15} className="animate-spin" />}{children}</button>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...props }, ref) => <input ref={ref} className={`h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 ${className}`} {...props} />);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = '', ...props }, ref) => <textarea ref={ref} className={`w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 ${className}`} {...props} />);
Textarea.displayName = 'Textarea';

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">{children}{hint && <span className="ml-2 normal-case font-normal tracking-normal text-muted-foreground/70">{hint}</span>}</label>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'orange' | 'red' | 'blue' }) {
  const tones = { neutral: 'bg-secondary text-muted-foreground', green: 'bg-primary/10 text-primary', orange: 'bg-accent/15 text-accent-foreground', red: 'bg-destructive/10 text-destructive', blue: 'bg-chart-3/10 text-chart-3' };
  return <span className={`inline-flex items-center rounded-md px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

export function PageLoader() {
  return <div className="space-y-4 p-1" data-testid="loading-page"><div className="h-8 w-52 animate-pulse rounded-lg bg-secondary" /><div className="h-28 animate-pulse rounded-xl bg-secondary" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-xl bg-secondary" /><div className="h-32 animate-pulse rounded-xl bg-secondary" /><div className="h-32 animate-pulse rounded-xl bg-secondary" /></div></div>;
}

export function ErrorState({ message = 'Something interrupted the workspace.', retry }: { message?: string; retry?: () => void }) {
  return <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-8 text-center" data-testid="status-error"><p className="text-sm font-semibold text-destructive">{message}</p>{retry && <Button tone="outline" className="mt-4" onClick={retry} data-testid="button-retry">Try again</Button>}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/70 px-6 py-14 text-center" data-testid="status-empty"><div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 font-mono text-primary">/</div><h3 className="text-base font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function StatCard({ label, value, detail, accent = 'primary' }: { label: string; value: string | number; detail?: string; accent?: 'primary' | 'accent' | 'blue' }) {
  const color = { primary: 'text-primary', accent: 'text-accent-foreground', blue: 'text-chart-3' }[accent];
  return <div className="rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className={`mt-2 font-mono text-3xl font-medium tracking-tight ${color}`}>{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}