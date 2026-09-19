import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Info } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { LoginForm } from '../components/LoginForm';
import { useSessionCommands, useSessionView } from '../session/useSession';

type LoginPageProps = Readonly<{
  // Sanitised by `app`; only used for the "Tiếp tục" link of the memory-only interstitial.
  returnTo: string;
}>;

const EXPIRED_NOTICE = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
const RESTORE_UNAVAILABLE_NOTICE =
  'Chưa khôi phục được phiên đăng nhập. Bạn có thể thử lại hoặc đăng nhập lại.';
const STORAGE_UNAVAILABLE_NOTICE =
  'Trình duyệt không cho lưu phiên đăng nhập. Phiên chỉ giữ đến khi bạn tải lại hoặc đóng trang.';
const UNSUPPORTED_NOTE = 'Chưa hỗ trợ đăng nhập bằng mạng xã hội hoặc khôi phục mật khẩu.';

function Notice({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-[color:var(--line-strong)] p-3 text-sm text-[color:var(--ink)]"
    >
      <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info)]" />
      <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
    </div>
  );
}

// S-06. The route shell, chrome and redirect belong to `app`; this is the page body.
export function LoginPage({ returnTo }: LoginPageProps) {
  const view = useSessionView();
  const { retryRestore } = useSessionCommands();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A4: focus moves to the page heading on arrival (local to this page).
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const restoring = view.status === 'booting' || view.status === 'restoring';
  const signedIn = view.status === 'authenticated';

  return (
    <section className="mx-auto w-full max-w-[420px] px-4 py-10 md:py-14">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mb-6 rounded text-[30px] font-semibold text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
      >
        Đăng nhập
      </h1>

      <div className="flex flex-col gap-4 rounded-[14px] bg-[color:var(--panel)] p-[22px] shadow-[var(--shadow-md)]">
        {restoring ? (
          <p role="status" className="text-sm text-[color:var(--ink)]">
            Đang khôi phục phiên đăng nhập…
          </p>
        ) : signedIn ? (
          // Shown only when the session could not be saved: the visitor learns it before
          // continuing. With a saved session, `app` redirects straight away instead.
          <>
            <p role="status" className="text-sm text-[color:var(--ink)]">
              Đã đăng nhập.
            </p>
            {view.persistence === 'memory-only' ? (
              <Notice>
                <p>{STORAGE_UNAVAILABLE_NOTICE}</p>
              </Notice>
            ) : null}
            <Link
              to={returnTo}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-[color:var(--line-strong)] px-4 py-2 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--panel-2)]"
            >
              Tiếp tục
            </Link>
          </>
        ) : (
          <>
            {view.status === 'expired' ? (
              <Notice>
                <p>{EXPIRED_NOTICE}</p>
              </Notice>
            ) : null}
            {view.status === 'restore-unavailable' ? (
              <Notice>
                <p>{RESTORE_UNAVAILABLE_NOTICE}</p>
                <Button variant="ghost" onClick={() => void retryRestore()}>
                  Thử lại
                </Button>
              </Notice>
            ) : null}
            {view.persistence === 'memory-only' ? (
              <Notice>
                <p>{STORAGE_UNAVAILABLE_NOTICE}</p>
              </Notice>
            ) : null}
            <LoginForm />
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-[color:var(--muted)]">{UNSUPPORTED_NOTE}</p>
    </section>
  );
}
