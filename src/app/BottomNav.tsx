import { ChefHat, Settings, ShoppingBasket, Shuffle, Sun, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const LINKS: readonly { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/', label: 'Hoy', Icon: Sun },
  { to: '/que-como', label: '¿Qué como?', Icon: Shuffle },
  { to: '/cocinar', label: 'Cocinar', Icon: ChefHat },
  { to: '/comprar', label: 'Comprar', Icon: ShoppingBasket },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-full border border-border bg-surface/95 p-1 shadow-soft backdrop-blur">
        {LINKS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `tap flex flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[11px] font-semibold transition-colors duration-150 ${
                  isActive ? 'bg-butter text-butter-ink' : 'text-muted hover:text-text'
                }`
              }
            >
              <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
