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
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {LINKS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `tap flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold ${
                  isActive ? 'text-sage' : 'text-muted'
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
