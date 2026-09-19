import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, UserRound } from 'lucide-react';
import { useSessionCommands, useSessionView } from '../../features/auth/public';
import { TaxonomyMenu } from '../../features/taxonomy/public';
import { Button } from '../../shared/ui/Button';
import { ThemeToggleButton } from '../../shared/ui/theme/ThemeToggleButton';
import { loginPath } from '../routes/paths';
import { sanitizeReturnTo } from '../routes/return-to';

const ANONYMOUS_NAME = 'Tài khoản';

type AccountDisclosureProps = Readonly<{
  displayName: string;
  onSignOut: () => void;
}>;

// A disclosure (a button that shows and hides a panel), deliberately not an ARIA menu:
// the panel holds one ordinary button and no arrow-key navigation is promised. Escape, an
// outside click, or focus moving elsewhere closes it; Escape and an outside click that
// leaves focus nowhere return it to the button.
function AccountDisclosure({ displayName, onSignOut }: AccountDisclosureProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const name = displayName.trim() ? displayName : ANONYMOUS_NAME;

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && containerRef.current?.contains(target) === true;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function handleClick(event: MouseEvent) {
      if (inside(event.target)) return;
      setOpen(false);
      // A click on a focusable element keeps its focus; a click on nothing would strand it.
      if (!document.activeElement || document.activeElement === document.body) {
        buttonRef.current?.focus();
      }
    }
    function handleFocusIn(event: FocusEvent) {
      if (!inside(event.target)) setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open]);

  return (
    // Below `md` the header wraps, so the button can sit anywhere on the row: the panel is
    // then anchored to the sticky header (right edge, inside the page gutter) and can never
    // run off-screen. From `md` up it hangs from the button.
    <div ref={containerRef} className="md:relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 max-w-[9rem] items-center gap-1.5 rounded-md px-3 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--panel-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] sm:max-w-[16rem]"
      >
        <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate">{name}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-4 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-md border border-[color:var(--line-strong)] bg-[color:var(--panel)] p-2 shadow-[var(--shadow-md)] md:right-0"
      >
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setOpen(false);
            onSignOut();
          }}
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}

export function PublicHeader() {
  const view = useSessionView();
  const { signOut } = useSessionCommands();
  const location = useLocation();
  const loginLinkRef = useRef<HTMLAnchorElement>(null);
  const focusLoginAfterSignOut = useRef(false);
  const [signedOutMessage, setSignedOutMessage] = useState('');

  const isGuest =
    view.status === 'anonymous' ||
    view.status === 'expired' ||
    view.status === 'restore-unavailable';
  const isSettling = view.status === 'booting' || view.status === 'restoring';

  // After signing out the account button is gone: move focus to the sign-in link.
  useEffect(() => {
    if (isGuest && focusLoginAfterSignOut.current) {
      focusLoginAfterSignOut.current = false;
      loginLinkRef.current?.focus();
    }
  }, [isGuest]);

  function handleSignOut() {
    focusLoginAfterSignOut.current = true;
    setSignedOutMessage('Đã đăng xuất.');
    signOut();
  }

  // The visitor comes back to where they were; `/` (the default) needs no parameter.
  const returnTo = sanitizeReturnTo(`${location.pathname}${location.search}`);
  const signInTarget = loginPath(returnTo === '/' ? undefined : returnTo);

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--panel)]">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="text-lg font-semibold text-[color:var(--ink)]">
          Servio.
        </Link>
        <TaxonomyMenu />
        <div className="hidden flex-1 md:block" />
        <nav className="flex items-center gap-2 text-sm">
          {isGuest ? (
            <>
              <Link
                ref={loginLinkRef}
                to={signInTarget}
                className="px-3 py-2 text-[color:var(--ink)]"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-[color:var(--accent)] px-3 py-2 font-medium text-white"
              >
                Đăng ký
              </Link>
            </>
          ) : null}
          {isSettling ? (
            // Same footprint as the guest links, with no links and no account control while
            // the session is still being restored.
            <div
              role="status"
              aria-busy="true"
              aria-label="Đang tải trạng thái tài khoản"
              className="h-9 w-44"
            />
          ) : null}
          {view.status === 'authenticated' && view.identity ? (
            <AccountDisclosure displayName={view.identity.displayName} onSignOut={handleSignOut} />
          ) : null}
          <ThemeToggleButton />
        </nav>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {view.status === 'authenticated' ? '' : signedOutMessage}
      </span>
    </header>
  );
}
