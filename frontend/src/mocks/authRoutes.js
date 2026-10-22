// Extra auth endpoints for the mock backend. Demo codes: 2FA 123456, recovery "recovery-1234", device 654321.
import { users } from '@/mocks/data';

export const authRoutes = ({ fail, requireAuth, me, now, AUTH_KEY }) => [
  ['POST', /^\/api\/register$/, async ({ body }) => {
    const e = {};
    if (!body.name?.trim()) e.name = ['The name field is required.'];
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) e.email = ['The email field must be a valid email address.'];
    else if (users.some((u) => u.email === body.email) || body.email === 'taken@lamma.test') e.email = ['The email has already been taken.'];
    if ((body.password ?? '').length < 8) e.password = ['The password field must be at least 8 characters.'];
    else if (body.password !== body.password_confirmation) e.password = ['The password field confirmation does not match.'];
    if (!body.terms) e.terms = ['You must accept the terms.'];
    if (Object.keys(e).length) fail(422, 'The given data was invalid.', e);
    Object.assign(me(), { name: body.name, email: body.email, email_verified_at: null, locale: body.locale ?? me().locale });
    localStorage.setItem(AUTH_KEY, '1');
    return [201, { user: me() }];
  }],
  ['POST', /^\/api\/forgot-password$/, async ({ body }) => {
    if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) fail(422, 'The given data was invalid.', { email: ['The email field must be a valid email address.'] });
    return [200, { message: 'We have emailed your password reset link.' }];
  }],
  ['POST', /^\/api\/reset-password$/, async ({ body }) => {
    const e = {};
    if ((body.password ?? '').length < 8) e.password = ['The password field must be at least 8 characters.'];
    else if (body.password !== body.password_confirmation) e.password = ['The password field confirmation does not match.'];
    if (!body.token) e.email = ['This password reset token is invalid.'];
    if (Object.keys(e).length) fail(422, 'The given data was invalid.', e);
    return [200, { message: 'Your password has been reset.' }];
  }],
  ['POST', /^\/api\/two-factor-challenge$/, async ({ body }) => {
    const ok = body.recovery ? body.code === 'recovery-1234' : body.code === '123456';
    if (!ok) fail(422, 'The provided code was invalid.', { code: ['The provided code was invalid.'] });
    localStorage.setItem(AUTH_KEY, '1');
    return [200, { user: me() }];
  }],
  ['POST', /^\/api\/device\/verify$/, async ({ body }) => {
    if (body.code !== '654321') fail(422, 'The provided code was invalid.', { code: ['The provided code was invalid.'] });
    localStorage.setItem(AUTH_KEY, '1');
    return [200, { user: me() }];
  }],
  ['POST', /^\/api\/email\/verification-notification$/, async () => { requireAuth(); return [202, { message: 'Verification link sent.' }]; }],
  ['POST', /^\/api\/email\/verify$/, async () => { requireAuth(); me().email_verified_at = now(); return [200, { user: me() }]; }],
];
