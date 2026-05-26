import typography from '@tailwindcss/typography';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'InterVariable', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // DevCollab Design System
        dc: {
          bg:       '#0B1020',
          surface:  '#0F1629',
          card:     '#111827',
          cardHov:  '#141E33',
          border:   '#1F2937',
          borderHov:'#374151',
          accent:   '#7C3AED',
          accent2:  '#3B82F6',
          success:  '#10B981',
          warning:  '#F59E0B',
          danger:   '#EF4444',
          txPri:    '#F9FAFB',
          txSec:    '#9CA3AF',
          txMut:    '#4B5563',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'ai-gradient':     'linear-gradient(135deg, #7C3AED 0%, #3B82F6 50%, #06B6D4 100%)',
        'card-gradient':   'linear-gradient(145deg, #111827 0%, #0F1629 100%)',
      },
      boxShadow: {
        'ai-glow':    '0 0 24px rgba(124,58,237,0.25), 0 0 48px rgba(124,58,237,0.10)',
        'ai-glow-sm': '0 0 12px rgba(124,58,237,0.20)',
        'blue-glow':  '0 0 24px rgba(59,130,246,0.25)',
        'card-hov':   '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,58,237,0.15)',
        'float':      '0 20px 60px rgba(0,0,0,0.5)',
        'dock':       '0 -4px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
      },
      animation: {
        'glow-pulse':     'glow-pulse 2.5s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
        'float':          'float 6s ease-in-out infinite',
        'float-slow':     'float 9s ease-in-out infinite',
        'fade-up':        'fade-up 0.3s ease-out forwards',
        'gradient-spin':  'gradient-spin 4s linear infinite',
        'ai-thinking':    'ai-thinking 1.4s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        'blob-drift':     'blob-drift 12s ease-in-out infinite alternate',
        'ping-slow':      'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'scale-in':       'scale-in 0.15s ease-out forwards',
        'border-glow':    'border-glow 2s ease-in-out infinite',
        'cursor-glow':    'cursor-glow 0.15s ease-out',
        'notification-in':'notification-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'dock-bounce':    'dock-bounce 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(124,58,237,0.3)' },
          '50%':      { boxShadow: '0 0 24px rgba(124,58,237,0.6), 0 0 48px rgba(124,58,237,0.2)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-spin': {
          '0%':   { '--gradient-angle': '0deg' },
          '100%': { '--gradient-angle': '360deg' },
        },
        'ai-thinking': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%':           { transform: 'scale(1)',   opacity: '1' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'blob-drift': {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '33%':  { transform: 'translate(20px, -15px) scale(1.05)' },
          '66%':  { transform: 'translate(-10px, 10px) scale(0.95)' },
          '100%': { transform: 'translate(5px, -5px) scale(1.02)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(124,58,237,0.2)' },
          '50%':      { borderColor: 'rgba(124,58,237,0.5)' },
        },
        'notification-in': {
          from: { opacity: '0', transform: 'translateX(100%) scale(0.9)' },
          to:   { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'dock-bounce': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'spring':    'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth':    'cubic-bezier(0.4, 0, 0.2, 1)',
        'out-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [typography],
};
