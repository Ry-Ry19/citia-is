# CENRO Staff Portal — Authentication Setup

CENRO staff sign in at `/admin/login` with **Supabase Auth**. The
community pages (`/`, `/identify`, `/report`, `/species`) stay open to
everyone and never ask for an account.

A signed-in Supabase account is **not** automatically staff. Access also
needs an **active** row in `citia.staff_profiles`, which the CITIA-IS API
checks (`GET /staff/me`) at sign-in and on every staff page.

---

## 1. Supabase Dashboard settings

1. **Authentication → Sign In / Providers:** public sign-ups **off**.
   Staff accounts are created by hand (step 3).
2. **Authentication → URL Configuration:**
   - Site URL: `http://localhost:3000` (the production address later).
   - Redirect URLs: add `http://localhost:3000/auth/confirm`.
3. **Email sending (custom SMTP):** set up on 20 November 2026, using a
   Gmail account created for CITIA-IS and a Google app password
   (**Authentication → Emails → SMTP Settings**: host `smtp.gmail.com`,
   port `465`, sender name `CITIA-IS · CENRO Iligan City`). Delivery of a
   reset email was confirmed the same day. To move to another account
   later (for example when CENRO takes over), change only these fields
   and revoke the old app password.

4. **Reset password template** (**Authentication → Emails → Templates →
   Reset password**) uses this link, so a reset works in any browser:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/update-password">Reset your password</a>
   ```

> **Email limits:** Gmail allows about 500 emails a day. Supabase's own
> limit is set under Authentication → Rate Limits. A reset link expires
> after one hour and works once; an unused link does nothing.

## 2. Environment file

Add to `.env.local` in the project root (git-ignored):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SESSION_SECRET=<random secret, at least 32 characters>
```

Generate `SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never use the **secret / service_role** key in the frontend, and never
give any of these a `NEXT_PUBLIC_` prefix except the API address.

Restart `npm run dev` after editing `.env.local`. The CITIA-IS API must
be running too, because sign-in is checked against `GET /staff/me`.

## 3. Add a staff member

1. **Authentication → Users → Add user → Create new user.** Enter the
   email and a strong password, and tick **Auto Confirm User** (no
   confirmation email is needed).
2. In the **SQL Editor**, create the staff profile:

   ```sql
   insert into citia.staff_profiles (id, full_name, role)
   select id, 'Full Name', 'cenro_staff'   -- or 'administrator'
   from auth.users
   where lower(email) = lower('staff.email@example.com')
   returning id, full_name, role, account_status;
   ```

To remove access, set the profile's `account_status` to `disabled`. The
person is locked out on their next page load. Accounts are disabled, not
deleted, because reviews keep a reference to who made them.

---

## How the pieces fit together

| File | Role |
| --- | --- |
| `lib/supabase-server.ts` | The server-only Supabase client, with httpOnly cookies. |
| `lib/staff-api.ts` | Asks the CITIA-IS API whether the account is active staff. |
| `lib/admin-session.ts` | The 8-hour sign-in cookie and `getCurrentStaffSession()`. |
| `app/admin/actions.ts` | Sign-in, sign-out, reset-request and new-password actions. |
| `proxy.ts` | Refreshes the session and guards every `/admin/*` path. |
| `app/auth/confirm/route.ts` | Where the reset email link lands. |
| `app/admin/error.tsx` | "Temporarily unavailable" screen if the check cannot run. |

### Session rules

- A staff session lasts **8 hours**, then the staff member signs in
  again. There is no "Remember me".
- Three things must all hold on every staff page: a valid Supabase
  session (checked with `getClaims()`), the CITIA-IS 8-hour cookie for
  the same account, and an active staff profile.
- `proxy.ts` is a convenience, not the only check: every page checks the
  session itself.

### Cookies

- Supabase's session cookies and the CITIA-IS `citia_staff_signin`
  cookie are all `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- There is no browser-side Supabase client, so no script in the page can
  read a session.

### Failed sign-in messages

Every failed sign-in shows the same message:

> That email address and password combination was not recognised.

It does not reveal whether the account exists or is staff. A password
reset request also gets the same reply either way.

---

## Known limitations

1. **Email delivery** depends on the Gmail account in step 1 staying active.
2. **Rate limiting** of sign-in attempts is Supabase Auth's built-in
   limit; CITIA-IS adds none of its own.
3. **An issued access token stays valid until it expires** (1 hour).
   Disabling a staff profile still locks the person out immediately,
   because every staff page asks the API.

## Retired

The old single-account sign-in has been removed: `lib/admin-password.ts`,
`scripts/make-staff-hash.mjs` and the `bcryptjs` package. Remove the
unused `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` lines from `.env.local`.
Keep `SESSION_SECRET`: it now signs the 8-hour staff session cookie.
