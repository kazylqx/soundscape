import {
  CalendarClock,
  LayoutDashboard,
  ListMusic,
  Share2,
  Smile,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** Itens de navegacao compartilhados entre a Navbar e a BottomBar. */
export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Aparece na barra inferior do mobile (espaco limitado). */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Inicio',
    icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
    primary: true,
  },
  {
    to: '/profile',
    label: 'Perfil',
    icon: <User className="h-5 w-5" aria-hidden="true" />,
    primary: true,
  },
  {
    to: '/recommendations',
    label: 'Descobrir',
    icon: <Sparkles className="h-5 w-5" aria-hidden="true" />,
    primary: true,
  },
  {
    to: '/playlists',
    label: 'Playlists',
    icon: <ListMusic className="h-5 w-5" aria-hidden="true" />,
  },
  {
    to: '/moods',
    label: 'Moods',
    icon: <Smile className="h-5 w-5" aria-hidden="true" />,
  },
  {
    to: '/decades',
    label: 'Decadas',
    icon: <CalendarClock className="h-5 w-5" aria-hidden="true" />,
  },
  {
    to: '/share',
    label: 'Cards',
    icon: <Share2 className="h-5 w-5" aria-hidden="true" />,
    primary: true,
  },
  {
    to: '/compare',
    label: 'Comparar',
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
  },
];

export const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => item.primary);
