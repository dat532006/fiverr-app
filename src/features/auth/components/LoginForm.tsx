import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useFormik } from 'formik';
import { CircleAlert } from 'lucide-react';
import { object, string } from 'yup';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { useSessionController } from '../session/useSession';

type LoginValues = { email: string; password: string };
type FieldName = keyof LoginValues;

const FIELD_ORDER: readonly FieldName[] = ['email', 'password'];

const REJECTED_MESSAGE = 'Đăng nhập không thành công. Vui lòng thử lại.';
const OFFLINE_MESSAGE = 'Bạn đang ngoại tuyến. Hãy kết nối mạng rồi thử lại.';

// Validation runs on blur and on submit. The password is validated for presence only and
// is never trimmed or otherwise altered.
const loginSchema = object({
  email: string().required('Vui lòng nhập email.').email('Email chưa đúng định dạng.'),
  password: string().required('Vui lòng nhập mật khẩu.'),
});

// `seq` makes a repeated identical failure a new event, so focus moves to it every time.
type Summary = Readonly<{ text: string; seq: number }>;

export function LoginForm() {
  const { signIn } = useSessionController();
  const [summary, setSummary] = useState<Summary | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({});
  const sequence = useRef(0);

  useEffect(() => {
    if (summary) summaryRef.current?.focus();
  }, [summary]);

  function fail(text: string) {
    sequence.current += 1;
    setSummary({ text, seq: sequence.current });
  }

  const formik = useFormik<LoginValues>({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setSummary(null);
      const outcome = await signIn({ email: values.email, password: values.password });
      switch (outcome.kind) {
        case 'signed-in':
          // The form is about to unmount; clear the credential regardless.
          await helpers.setFieldValue('password', '', false);
          return;
        case 'rejected':
          fail(REJECTED_MESSAGE);
          return;
        case 'failed':
          fail(outcome.error.message);
          return;
        case 'offline':
          fail(OFFLINE_MESSAGE);
          return;
        case 'busy':
        case 'stale':
          // Another sign-in is in flight, or the session changed: nothing to show.
          return;
      }
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formik.isSubmitting) return;
    const errors = await formik.validateForm();
    const invalid = FIELD_ORDER.find((name) => errors[name]);
    if (invalid) {
      // Client validation failed: nothing is sent, the first invalid field takes focus.
      await formik.setTouched({ email: true, password: true }, false);
      fieldRefs.current[invalid]?.focus();
      return;
    }
    await formik.submitForm();
  }

  function errorFor(name: FieldName): string | undefined {
    return formik.touched[name] ? formik.errors[name] : undefined;
  }

  const pending = formik.isSubmitting;

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={pending} className="flex flex-col gap-2">
      {summary ? (
        <div
          key={summary.seq}
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-md border border-[color:var(--danger)] p-3 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--danger)]"
          />
          <p>{summary.text}</p>
        </div>
      ) : null}

      <Field label="Email" error={errorFor('email')}>
        {(control) => (
          <input
            {...control}
            ref={(element) => {
              fieldRefs.current.email = element;
            }}
            type="email"
            name="email"
            autoComplete="username"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        )}
      </Field>

      <Field label="Mật khẩu" error={errorFor('password')}>
        {(control) => (
          <input
            {...control}
            ref={(element) => {
              fieldRefs.current.password = element;
            }}
            type="password"
            name="password"
            autoComplete="current-password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
        )}
      </Field>

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
