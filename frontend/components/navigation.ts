import { LayoutDashboard, Target, FileCheck2, BarChart3, ClipboardCheck, Brain, BrainCircuit, Dumbbell, ShieldQuestion, Mic2, FolderKanban, Github, FileText, Route, BookOpen, Library, FolderOpen, BriefcaseBusiness, Compass, UserRound, Settings2, Bell, LifeBuoy, Scale, MessageSquareText, Gauge, Hammer, GraduationCap, Rocket, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The sidebar shows a handful of MAIN sections. Clicking a section expands it to reveal its related
 * features (one section open at a time) instead of listing every page at once.
 */
export type NavChild = { id: string; label: string; href: string; icon: LucideIcon; keywords?: string[] };
export type NavSection = { id: string; label: string; icon: LucideIcon; blurb: string; children: NavChild[] };
export type NavItem = NavChild & { sectionId: string; section: string; group: string };

export const SECTIONS: NavSection[] = [
  { id: 'workspace', label: 'Workspace', icon: Gauge, blurb: 'Your progress and proof', children: [
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
    { id: 'competencies', label: 'Competencies', href: '/competencies', icon: Target, keywords: ['skills', 'gaps'] },
    { id: 'evidence', label: 'Claim Evidence', href: '/evidence', icon: FileCheck2, keywords: ['proof', 'verification', 'claim', 'target evidence'] },
    { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3, keywords: ['progress', 'insights', 'metrics'] },
  ] },
  { id: 'assess', label: 'Assess & Practice', icon: ClipboardCheck, blurb: 'Test and sharpen skills', children: [
    { id: 'assessments', label: 'Assessment Studio', href: '/assessments', icon: ClipboardCheck, keywords: ['assessment', 'quiz', 'test', 'adaptive'] },
    { id: 'assessment', label: 'Role Baseline', href: '/assessment', icon: Gauge, keywords: ['diagnostic', 'baseline', 'retest'] },
    { id: 'challenges', label: 'Challenges', href: '/challenges', icon: BrainCircuit, keywords: ['coding', 'debugging'] },
    { id: 'practice', label: 'Practice', href: '/practice', icon: Dumbbell, keywords: ['exercise', 'lab'] },
    { id: 'reasoning', label: 'Reasoning Lab', href: '/reasoning', icon: Brain, keywords: ['logic', 'interpretation'] },
    { id: 'project-defense', label: 'Project Defense', href: '/project-defense', icon: ShieldQuestion, keywords: ['socratic', 'defense'] },
    { id: 'interview', label: 'AI Interviewer', href: '/interview', icon: Mic2, keywords: ['interview', 'mock'] },
  ] },
  { id: 'build', label: 'Build', icon: Hammer, blurb: 'Projects and portfolio proof', children: [
    { id: 'projects', label: 'Projects', href: '/projects', icon: FolderKanban, keywords: ['portfolio', 'build'] },
    { id: 'github', label: 'GitHub Intelligence', href: '/github', icon: Github, keywords: ['repository', 'repo', 'code'] },
    { id: 'resume', label: 'Resume Analysis', href: '/resume', icon: FileText, keywords: ['resume', 'cv'] },
  ] },
  { id: 'learn', label: 'Learn', icon: GraduationCap, blurb: 'Close your gaps', children: [
    { id: 'roadmap', label: 'Roadmap', href: '/roadmap', icon: Route, keywords: ['plan', 'journey'] },
    { id: 'learn', label: 'Learning Paths', href: '/learn', icon: BookOpen, keywords: ['learn', 'courses', 'subjects', 'path'] },
    { id: 'resources', label: 'Resources', href: '/learn?view=resources', icon: Library, keywords: ['docs', 'videos', 'pdf', 'links'] },
    { id: 'materials', label: 'Study Materials', href: '/learn?view=materials', icon: FolderOpen, keywords: ['pdf', 'slides', 'files'] },
  ] },
  { id: 'career', label: 'Career', icon: Rocket, blurb: 'Roles and opportunities', children: [
    { id: 'career', label: 'Career Intelligence', href: '/career', icon: BriefcaseBusiness, keywords: ['career', 'salary'] },
    { id: 'roles', label: 'Explore Roles', href: '/career?view=roles', icon: Compass, keywords: ['role', 'readiness'] },
    { id: 'jobs', label: 'Opportunities', href: '/career?view=jobs', icon: Scale, keywords: ['jobs', 'openings'] },
  ] },
  { id: 'account', label: 'Account & Help', icon: UserCog, blurb: 'Settings, help and policies', children: [
    { id: 'profile', label: 'Profile & Target Role', href: '/profile', icon: UserRound, keywords: ['account', 'target', 'role'] },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings2, keywords: ['preferences', 'ai', 'theme'] },
    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: Bell, keywords: ['alerts'] },
    { id: 'help', label: 'Help & Getting Started', href: '/help', icon: LifeBuoy, keywords: ['guide', 'support'] },
    { id: 'contact', label: 'Contact', href: '/contact', icon: MessageSquareText, keywords: ['support', 'feedback'] },
    { id: 'privacy', label: 'Privacy', href: '/privacy', icon: ShieldQuestion, keywords: ['data', 'security'] },
    { id: 'terms', label: 'Terms', href: '/terms', icon: FileText, keywords: ['legal'] },
  ] },
];

/** Flat list used by global search and active-state detection. */
export const NAVIGATION: NavItem[] = SECTIONS.flatMap(s => s.children.map(c => ({ ...c, sectionId: s.id, section: s.label, group: s.label })));

export function searchNavigation(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return NAVIGATION.filter(n => [n.label, n.id, n.section, ...(n.keywords || [])].join(' ').toLowerCase().includes(q)).slice(0, 12);
}

/**
 * Work out which navigation item matches the current URL.
 * 1. an item whose ?view= query matches the URL wins (Resources, Study Materials, Explore Roles…);
 * 2. otherwise the plain item for the path;
 * 3. otherwise the nearest parent for nested routes such as /career/Backend%20Developer.
 */
export function findActiveItem(pathname: string, params: { get(name: string): string | null }): NavItem | undefined {
  const byQuery = NAVIGATION.find(n => {
    const [path, q] = n.href.split('?');
    if (path !== pathname || !q) return false;
    let ok = true;
    new URLSearchParams(q).forEach((v, k) => { if (params.get(k) !== v) ok = false; });
    return ok;
  });
  if (byQuery) return byQuery;
  const plain = NAVIGATION.find(n => n.href === pathname);
  if (plain) return plain;
  return NAVIGATION.filter(n => !n.href.includes('?') && n.href !== '/' && pathname.startsWith(n.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
}
