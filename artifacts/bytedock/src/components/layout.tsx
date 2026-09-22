import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BarChart3, BookOpen, ChevronLeft, ChevronRight, Code2, FileCheck2, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Button } from '@/components/ui-custom';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student', 'staff', 'admin'] },
  { href: '/problems', label: 'Problem bank', icon: Code2, roles: ['student', 'staff', 'admin'] },
  { href: '/submissions', label: 'Submissions', icon: FileCheck2, roles: ['student', 'staff', 'admin'] },
  { href: '/students', label: 'Students', icon: Users, roles: ['staff', 'admin'] },
];

function initials(name?: string) { return name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'BD'; }

export function Brand({ dark = false }: { dark?: boolean }) {
  return <Link href="/dashboard" className="flex items-center gap-2.5" data-testid="link-brand"><span className={`grid h-8 w-8 place-items-center rounded-lg font-mono text-sm font-bold ${dark ? 'bg-primary text-primary-foreground' : 'bg-sidebar-primary text-sidebar-primary-foreground'}`}>B<span className="text-accent">·</span></span><span className={`text-[15px] font-extrabold tracking-[-.04em] ${dark ? 'text-sidebar-accent-foreground' : 'text-foreground'}`}>ByteDock</span></Link>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const [hasToken] = useState(() => Boolean(localStorage.getItem('bytedock-token')));
  const { data: user, isLoading, isError } = useGetCurrentUser({ query: { enabled: hasToken, retry: false } });
  const role = user?.role ?? 'student';
  useEffect(() => {
    if (!hasToken) setLocation('/login');
  }, [hasToken, setLocation]);
  const logout = () => { localStorage.removeItem('bytedock-token'); window.location.href = '/login'; };
  if (!hasToken) return null;
  return <div className="noise min-h-[100dvh] bg-background text-foreground">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 transition-transform duration-300 md:translate-x-0 ${collapsed ? 'md:w-[78px]' : ''} ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`mb-8 flex items-center px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}><Brand dark /> <button onClick={() => setOpen(false)} className="text-sidebar-foreground md:hidden" data-testid="button-close-menu"><X size={18} /></button></div>
      <div className={`mb-4 px-3 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/50 ${collapsed ? 'text-center' : ''}`}>{collapsed ? '//' : 'Workspace'}</div>
      <nav className="space-y-1">{nav.filter((item) => item.roles.includes(role)).map((item) => { const active = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href)); const Icon = item.icon; return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'} ${collapsed ? 'justify-center' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} className={active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'} />{!collapsed && item.label}</Link>; })}</nav>
      {(role === 'admin' || role === 'staff') && <div className="mt-8"><div className={`mb-4 px-3 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/50 ${collapsed ? 'text-center' : ''}`}>{collapsed ? '//' : 'Manage'}</div><Link href="/admin/problems/new" title={collapsed ? 'Create problem' : undefined} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? 'justify-center' : ''}`} data-testid="link-create-problem"><ShieldCheck size={17} className="text-accent" />{!collapsed && 'Create problem'}</Link></div>}
      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-4"><Link href="/settings" title={collapsed ? 'Settings' : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? 'justify-center' : ''}`} data-testid="link-settings"><Settings size={17} />{!collapsed && 'Settings'}</Link><button onClick={logout} title={collapsed ? 'Sign out' : undefined} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${collapsed ? 'justify-center' : ''}`} data-testid="button-logout"><LogOut size={17} />{!collapsed && 'Sign out'}</button></div>
    </aside>
    <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-lg border border-border bg-card shadow-sm md:hidden" data-testid="button-open-menu"><Menu size={18} /></button>
    <button onClick={() => setCollapsed(!collapsed)} className="fixed bottom-6 left-[228px] z-50 hidden h-8 w-8 place-items-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground md:grid" data-testid="button-collapse-sidebar">{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button>
    <main className={`min-h-[100dvh] transition-[padding] duration-300 md:pl-[248px] ${collapsed ? 'md:pl-[78px]' : ''}`}><header className="flex h-[72px] items-center justify-end border-b border-border bg-background/80 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3">{isLoading ? <div className="h-8 w-28 animate-pulse rounded bg-secondary" /> : isError ? <span className="font-mono text-xs text-destructive">offline</span> : <><div className="hidden text-right sm:block"><p className="text-xs font-bold" data-testid="text-user-name">{user?.name}</p><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground" data-testid="text-user-role">{role}</p></div><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary" data-testid="avatar-user">{initials(user?.name)}</div></>}</div></header><div className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">{children}</div></main>
  </div>;
}

export function AuthFrame({ children, eyebrow }: { children: ReactNode; eyebrow: string }) {
  return <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(360px,42%)_1fr]"><section className="relative hidden overflow-hidden bg-sidebar p-10 lg:flex lg:flex-col"><Brand dark /><div className="relative z-10 mt-auto max-w-md"><p className="mb-4 font-mono text-xs uppercase tracking-[.2em] text-sidebar-primary">/ {eyebrow}</p><h1 className="text-5xl font-extrabold leading-[1.05] tracking-[-.06em] text-sidebar-accent-foreground">Build the habit.<br /><span className="text-sidebar-primary">Ship the proof.</span></h1><p className="mt-6 max-w-sm text-sm leading-7 text-sidebar-foreground">A focused coding cockpit for practice, feedback, and progress that compounds.</p><div className="mt-10 grid-paper h-24 rounded-xl border border-sidebar-border opacity-50" /></div><div className="absolute -right-24 top-28 h-64 w-64 rounded-full border border-sidebar-primary/20" /><div className="absolute -right-12 top-40 h-40 w-40 rounded-full border border-sidebar-primary/10" /></section><section className="flex items-center justify-center p-6 md:p-12"><div className="w-full max-w-[420px]"><div className="mb-10 lg:hidden"><Brand /></div>{children}</div></section></div>;
}