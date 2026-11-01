import { ArrowRight, Shuffle } from 'lucide-react';
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

const SWIPE_THRESHOLD = 90;
const DRAG_START = 10;
const EXIT_MS = 180;

type SwipeCardProps = {
  label: string;
  onLeft: () => void;
  onRight: () => void;
  children: ReactNode;
};

// Horizontal drags swipe the card; vertical drags are left to the page scroll (touch-action: pan-y).
export function SwipeCard({ label, onLeft, onRight, children }: SwipeCardProps) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null);
  const [active, setActive] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const finish = (direction: 'left' | 'right') => {
    setLeaving(direction);
    setTimeout(() => {
      if (direction === 'left') onLeft();
      else onRight();
    }, EXIT_MS);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (leaving || (event.pointerType === 'mouse' && event.button !== 0)) return;
    start.current = { x: event.clientX, y: event.clientY };
    dragging.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const moveX = event.clientX - start.current.x;
    const moveY = event.clientY - start.current.y;
    if (!dragging.current) {
      if (Math.abs(moveX) > DRAG_START && Math.abs(moveX) > Math.abs(moveY)) {
        dragging.current = true;
        setActive(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(moveY) > DRAG_START) {
        start.current = null;
        return;
      } else {
        return;
      }
    }
    setDx(moveX);
  };

  const onPointerEnd = () => {
    const wasDragging = dragging.current;
    start.current = null;
    dragging.current = false;
    setActive(false);
    if (!wasDragging) return;
    if (dx <= -SWIPE_THRESHOLD) finish('left');
    else if (dx >= SWIPE_THRESHOLD) finish('right');
    else setDx(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') finish('left');
    if (event.key === 'ArrowRight') finish('right');
  };

  const offset = leaving === 'left' ? -480 : leaving === 'right' ? 480 : dx;
  const animate = leaving !== null || !active;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-between rounded-3xl px-6 text-lg font-semibold transition-opacity ${
          dx === 0 && !leaving ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className={`inline-flex items-center gap-2 text-mint-ink ${dx > 0 || leaving === 'right' ? '' : 'invisible'}`}>
          <ArrowRight size={22} />
          Ver preparación
        </span>
        <span className={`inline-flex items-center gap-2 text-muted ${dx < 0 || leaving === 'left' ? '' : 'invisible'}`}>
          Otra
          <Shuffle size={22} />
        </span>
      </div>
      <div
        role="group"
        aria-roledescription="tarjeta deslizable"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        style={{
          transform: `translateX(${offset}px) rotate(${offset / 25}deg)`,
          transition: animate ? `transform ${EXIT_MS}ms ease-out` : 'none',
          touchAction: 'pan-y',
        }}
        className="relative cursor-grab select-none active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
}
