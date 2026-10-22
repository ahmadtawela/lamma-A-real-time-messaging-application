import { describe, it, expect, beforeAll } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

const wait = (ms) => act(() => new Promise((r) => setTimeout(r, ms)));
const errors = [];
beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} };
  Element.prototype.scrollIntoView = () => {}; URL.createObjectURL = () => 'blob:x';
  navigator.mediaDevices = { getUserMedia: async () => { throw Object.assign(new Error('no cam'), { name: 'NotFoundError' }); } };
  localStorage.setItem('lamma.mock.auth', '1');
  const orig = console.error; console.error = (...a) => { const m = a.map(String).join(' '); if (!/Future Flag|act\(|not wrapped in act/.test(m)) errors.push(m.slice(0, 260)); orig.apply(console, []); };
});

async function mount(path) {
  window.history.pushState({}, '', path);
  const { LanguageProvider } = await import('@/shared/context/LanguageProvider');
  const { ThemeProvider } = await import('@/shared/context/ThemeProvider');
  const { ToastProvider } = await import('@/shared/context/ToastProvider');
  const { default: App } = await import('@/app/App');
  return render(<LanguageProvider><ThemeProvider><ToastProvider><App /></ToastProvider></ThemeProvider></LanguageProvider>);
}
async function until(fn, ms = 15000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(250); } return false; }
const q = (c, sel) => c.querySelector(sel);
const byLabel = (c, re) => [...c.querySelectorAll('button,a,input,textarea')].find((b) => re.test(b.getAttribute('aria-label') || b.textContent || ''));

describe('lamma end-to-end (jsdom, mock backend)', () => {
  it('chat: open, send, reply UI, details, call overlay', async () => {
    const { container: c } = await mount('/app/chat/1'); await until(() => c.querySelectorAll('[data-msg]').length > 5);
    console.log('CHAT1 state:', 'textarea', !!q(c, 'textarea'), 'bubbles', c.querySelectorAll('[data-msg]').length, '| alert:', [...c.querySelectorAll('[role=alert]')].map((a) => a.textContent.slice(0, 100)).join('|'), '| sidebar items', c.querySelectorAll('aside li').length, '| text:', c.textContent.slice(0, 160));
    expect(c.querySelectorAll('[data-msg]').length).toBeGreaterThan(5);
    // send a message
    const ta = q(c, 'textarea'); fireEvent.change(ta, { target: { value: 'مرحبا Ahmed, hello' } });
    fireEvent.keyDown(ta, { key: 'Enter' }); await wait(600);
    expect(c.textContent).toContain('مرحبا Ahmed, hello');
    // details panel opens
    fireEvent.click(byLabel(c, /Details|التفاصيل/)); await wait(300);
    expect(q(c, '.fixed.inset-0.z-30')).toBeTruthy();
    fireEvent.click(byLabel(c, /^(Close|إغلاق)$/)); await wait(200);
    // voice call: overlay appears, ends
    fireEvent.click(byLabel(c, /Voice call|مكالمة صوتية/)); await wait(400);
    expect(q(document.body, '[role=dialog][aria-label]')).toBeTruthy();
    await wait(4200);
    const end = byLabel(document.body, /End call|إنهاء المكالمة/); expect(end).toBeTruthy();
    fireEvent.click(end); await wait(500);
  }, 40000);

  it('every page renders without crashing', async () => {
    for (const path of ['/app', '/app/groups', '/app/contacts', '/app/status', '/app/calls', '/app/notifications', '/app/settings', '/app/profile', '/admin', '/admin/users', '/admin/groups', '/admin/reports', '/admin/settings']) {
      const { container: c, unmount } = await mount(path); await wait(2500);
      const alert = [...c.querySelectorAll('[role=alert]')].map((a) => a.textContent).join('|');
      console.log(path.padEnd(22), 'len', String(c.innerHTML.length).padStart(6), alert ? 'ALERT: ' + alert.slice(0, 120) : 'ok');
      unmount();
    }
  }, 60000);

  it('calls page: simulate incoming call, accept, hang up', async () => {
    const { container: c } = await mount('/app/calls'); await wait(1500);
    fireEvent.click(byLabel(c, /Simulate incoming|محاكاة/)); await wait(600);
    const accept = byLabel(document.body, /^(Accept|قبول)$/); expect(accept).toBeTruthy();
    fireEvent.click(accept); await wait(2500);
    fireEvent.click(byLabel(document.body, /End call|إنهاء المكالمة/)); await wait(3500);
    expect(c.textContent).toMatch(/Completed|مكتملة|Declined|مرفوضة/);
  }, 30000);

  it('message menu is rendered in a portal and shows every action (Delete included)', async () => {
    const { container: c } = await mount('/app/chat/1'); await until(() => c.querySelectorAll('[data-msg]').length > 5);
    const mine = [...c.querySelectorAll('[data-msg]')].find((m) => m.className.includes('flex-row-reverse'));
    fireEvent.click(mine.querySelector('button[aria-label="More options"], button[aria-label="المزيد من الخيارات"]')); await wait(300);
    const menu = document.body.querySelector('[role=menu]'); expect(menu).toBeTruthy();
    expect(c.contains(menu)).toBe(false);                                   // portal: outside the scrolling chat container
    const labels = [...menu.querySelectorAll('[role=menuitem]')].map((b) => b.textContent);
    console.log('menu items:', labels.join(' | '));
    expect(labels.some((l) => /Delete|حذف/.test(l))).toBe(true); expect(labels.length).toBeGreaterThanOrEqual(6);
    fireEvent.keyDown(document, { key: 'Escape' }); await wait(200);
    expect(document.body.querySelector('[role=menu]')).toBeNull();
  }, 40000);

  it('emoji picker: full categories, Arabic + English search, inserts into the composer', async () => {
    const { container: c } = await mount('/app/chat/1'); await until(() => !!q(c, 'textarea'));
    fireEvent.click(byLabel(c, /^(Emoji|الرموز التعبيرية)$/)); await until(() => document.body.querySelectorAll('[role=dialog] section[data-group]').length >= 9, 20000);
    const dlg = document.body.querySelector('[role=dialog]');
    const total = dlg.querySelectorAll('section button').length; console.log('emoji buttons rendered:', total); expect(total).toBeGreaterThan(1500);
    const search = dlg.querySelector('input'); fireEvent.change(search, { target: { value: 'قلب' } }); await wait(300);
    const arRes = dlg.querySelectorAll('button[aria-label]:not([role=tab]):not([role=radio])').length; console.log('Arabic "قلب" results:', arRes); expect(arRes).toBeGreaterThan(5);
    fireEvent.change(search, { target: { value: 'rocket' } }); await wait(300);
    const rocket = [...dlg.querySelectorAll('button')].find((b) => b.textContent === '🚀'); expect(rocket).toBeTruthy();
    fireEvent.click(rocket); await wait(200);
    expect(q(c, 'textarea').value).toContain('🚀');
  }, 40000);

  it('contacts: add by phone number (no email needed)', async () => {
    const { container: c } = await mount('/app/contacts'); await until(() => c.querySelectorAll('ul li').length > 3);
    fireEvent.click(byLabel(document.body, /^(Add contact|إضافة جهة اتصال)$/)); await wait(300);
    const tel = document.body.querySelector('input[type=tel]'); expect(tel).toBeTruthy();
    fireEvent.change(document.body.querySelector('select'), { target: { value: 'TR' } });
    fireEvent.change(tel, { target: { value: '555 107 00 11' } }); await wait(200);
    const submit = [...document.body.querySelectorAll('form button[type=submit]')].pop(); expect(submit.disabled).toBe(false);
    fireEvent.click(submit); await wait(1200);
    expect(document.body.querySelector('input[type=tel]')).toBeNull();     // modal closed => request succeeded
  }, 40000);

  it('profile: phone verification flow with the SMS code', async () => {
    const { container: c } = await mount('/app/profile'); await until(() => !!document.body.querySelector('section[aria-label]'));
    const tel = await (async () => { await until(() => !!document.body.querySelector('input[type=tel]')); return document.body.querySelector('input[type=tel]'); })();
    fireEvent.change(document.body.querySelector('section[aria-label] select'), { target: { value: 'TR' } });
    fireEvent.change(tel, { target: { value: '555 777 88 99' } }); await wait(150);
    fireEvent.click(byLabel(document.body, /Send verification code|إرسال رمز التحقق/)); await until(() => !!document.body.querySelector('input[autocomplete=one-time-code]'));
    fireEvent.change(document.body.querySelector('input[autocomplete=one-time-code]'), { target: { value: '123456' } }); await wait(100);
    fireEvent.click(document.body.querySelector('section[aria-label] form button[type=submit]')); await until(() => /Verified|موثّق/.test(c.textContent));
    expect(c.textContent).toMatch(/Verified|موثّق/);
  }, 40000);

  it('typing in a modal field keeps the focus (no jump out after each character)', async () => {
    const { container: c } = await mount('/app/contacts'); await until(() => c.querySelectorAll('ul li').length > 3);
    fireEvent.click(byLabel(document.body, /^(Add contact|إضافة جهة اتصال)$/)); await wait(300);
    const tel = document.body.querySelector('input[type=tel]'); tel.focus(); expect(document.activeElement).toBe(tel);
    for (const v of ['5', '55', '555', '555 1', '555 10']) { fireEvent.change(tel, { target: { value: v } }); await wait(60); expect(document.activeElement).toBe(tel); }
  }, 30000);

  it('typing in the composer and the chat search keeps the focus', async () => {
    const { container: c } = await mount('/app/chat/1'); await until(() => c.querySelectorAll('[data-msg]').length > 5);
    for (const sel of ['textarea', 'aside input']) {
      const el = q(c, sel); el.focus();
      for (const v of ['a', 'ab', 'abc', 'abcd']) { fireEvent.change(el, { target: { value: v } }); await wait(350); expect(document.activeElement === q(c, sel)).toBe(true); }
    }
  }, 40000);

  it('no console errors were logged', () => { console.log('console errors:', JSON.stringify(errors, null, 1)); expect(errors).toEqual([]); });
});
