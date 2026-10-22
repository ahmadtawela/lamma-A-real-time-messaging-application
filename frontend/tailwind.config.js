const v = (name) => `var(--${name})`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'] },
      colors: {
        bg: v('bg'), surface: v('surface'), 'surface-2': v('surface-2'), border: v('border'),
        'text-1': v('text'), 'text-2': v('text-2'),
        accent: v('accent'), 'accent-fg': v('accent-fg'),
        success: v('success'), warning: v('warning'), danger: v('danger'),
        'msg-in': v('msg-in'), 'msg-in-fg': v('msg-in-fg'),
        'msg-out': v('msg-out'), 'msg-out-fg': v('msg-out-fg'),
      },
      borderRadius: { lg: '12px', xl: '16px' },
    },
  },
};
