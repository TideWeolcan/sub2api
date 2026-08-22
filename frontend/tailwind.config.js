/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色调 - Teal/Cyan 青色系（保持不变；CPA tokens 以 --cpa-* 变量另行提供）
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e'
        },
        // 辅助色 - 深蓝灰
        accent: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        // 深色模式背景
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        // CPA design tokens — CSS-variable backed (from cpa-tokens.css, no SCSS)
        cpa: {
          primary: 'var(--cpa-primary)',
          success: 'var(--cpa-success)',
          warning: 'var(--cpa-warning)',
          error: 'var(--cpa-error)',
          danger: 'var(--cpa-danger)',
          info: 'var(--cpa-info)',
          surface: 'var(--cpa-app-surface)',
          'surface-strong': 'var(--cpa-app-surface-strong)',
          'surface-muted': 'var(--cpa-app-surface-muted)',
          border: 'var(--cpa-app-border)',
          'border-strong': 'var(--cpa-app-border-strong)',
          'text-primary': 'var(--cpa-app-text-primary)',
          'text-regular': 'var(--cpa-app-text-regular)',
          'text-muted': 'var(--cpa-app-text-muted)'
        },
        // CPA data palettes — var-backed so dark mode remaps automatically
        'cpa-blue': {
          DEFAULT: 'var(--cpa-data-blue-base)',
          dark: 'var(--cpa-data-blue-dark-2)',
          300: 'var(--cpa-data-blue-light-3)',
          500: 'var(--cpa-data-blue-light-5)',
          700: 'var(--cpa-data-blue-light-7)',
          800: 'var(--cpa-data-blue-light-8)',
          900: 'var(--cpa-data-blue-light-9)'
        },
        'cpa-green': {
          DEFAULT: 'var(--cpa-data-green-base)',
          dark: 'var(--cpa-data-green-dark-2)',
          300: 'var(--cpa-data-green-light-3)',
          500: 'var(--cpa-data-green-light-5)',
          700: 'var(--cpa-data-green-light-7)',
          800: 'var(--cpa-data-green-light-8)',
          900: 'var(--cpa-data-green-light-9)'
        },
        'cpa-amber': {
          DEFAULT: 'var(--cpa-data-amber-base)',
          dark: 'var(--cpa-data-amber-dark-2)',
          300: 'var(--cpa-data-amber-light-3)',
          500: 'var(--cpa-data-amber-light-5)',
          700: 'var(--cpa-data-amber-light-7)',
          800: 'var(--cpa-data-amber-light-8)',
          900: 'var(--cpa-data-amber-light-9)'
        },
        'cpa-red': {
          DEFAULT: 'var(--cpa-data-red-base)',
          dark: 'var(--cpa-data-red-dark-2)',
          300: 'var(--cpa-data-red-light-3)',
          500: 'var(--cpa-data-red-light-5)',
          700: 'var(--cpa-data-red-light-7)',
          800: 'var(--cpa-data-red-light-8)',
          900: 'var(--cpa-data-red-light-9)'
        },
        'cpa-violet': {
          DEFAULT: 'var(--cpa-data-violet-base)',
          dark: 'var(--cpa-data-violet-dark-2)',
          300: 'var(--cpa-data-violet-light-3)',
          500: 'var(--cpa-data-violet-light-5)',
          700: 'var(--cpa-data-violet-light-7)',
          800: 'var(--cpa-data-violet-light-8)',
          900: 'var(--cpa-data-violet-light-9)'
        },
        'cpa-cyan': {
          DEFAULT: 'var(--cpa-data-cyan-base)',
          dark: 'var(--cpa-data-cyan-dark-2)',
          300: 'var(--cpa-data-cyan-light-3)',
          500: 'var(--cpa-data-cyan-light-5)',
          700: 'var(--cpa-data-cyan-light-7)',
          800: 'var(--cpa-data-cyan-light-8)',
          900: 'var(--cpa-data-cyan-light-9)'
        },
        'cpa-teal': {
          DEFAULT: 'var(--cpa-data-teal-base)',
          dark: 'var(--cpa-data-teal-dark-2)',
          300: 'var(--cpa-data-teal-light-3)',
          500: 'var(--cpa-data-teal-light-5)',
          700: 'var(--cpa-data-teal-light-7)',
          800: 'var(--cpa-data-teal-light-8)',
          900: 'var(--cpa-data-teal-light-9)'
        },
        'cpa-slate': {
          DEFAULT: 'var(--cpa-data-slate-base)',
          dark: 'var(--cpa-data-slate-dark-2)',
          300: 'var(--cpa-data-slate-light-3)',
          500: 'var(--cpa-data-slate-light-5)',
          700: 'var(--cpa-data-slate-light-7)',
          800: 'var(--cpa-data-slate-light-8)',
          900: 'var(--cpa-data-slate-light-9)'
        }
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.06)',
        glow: '0 0 20px rgba(20, 184, 166, 0.25)',
        'glow-lg': '0 0 40px rgba(20, 184, 166, 0.35)',
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'cpa-sm': 'var(--cpa-shadow-sm)',
        'cpa-md': 'var(--cpa-shadow-md)',
        'cpa-lg': 'var(--cpa-shadow-lg)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'mesh-gradient':
          'radial-gradient(at 40% 20%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(20, 184, 166, 0.08) 0px, transparent 50%)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.25)' },
          '100%': { boxShadow: '0 0 30px rgba(20, 184, 166, 0.4)' }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        '4xl': '2rem',
        // CPA radii — var-backed
        'cpa-sm': 'var(--cpa-radius-sm)',
        'cpa-md': 'var(--cpa-radius-md)',
        'cpa-lg': 'var(--cpa-radius-lg)',
        'cpa-app-sm': 'var(--cpa-radius-app-sm)',
        'cpa-app-md': 'var(--cpa-radius-app-md)',
        'cpa-app-lg': 'var(--cpa-radius-app-lg)'
      },
      spacing: {
        'cpa-xs': 'var(--cpa-spacing-xs)',
        'cpa-sm': 'var(--cpa-spacing-sm)',
        'cpa-md': 'var(--cpa-spacing-md)',
        'cpa-lg': 'var(--cpa-spacing-lg)',
        'cpa-xl': 'var(--cpa-spacing-xl)',
        'cpa-2xl': 'var(--cpa-spacing-2xl)',
        'cpa-gap': 'var(--cpa-app-gap)',
        'cpa-card': 'var(--cpa-app-card-padding)'
      }
    }
  },
  plugins: []
}
