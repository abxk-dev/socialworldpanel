/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Use SocialWorldPanel theme CSS variables directly
        border: 'var(--border)',
        input: 'var(--input-bg)',
        ring: 'var(--border-focus)',
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--btn-primary-text)',
        },
        secondary: {
          DEFAULT: 'var(--bg-secondary)',
          foreground: 'var(--text-primary)',
        },
        destructive: {
          DEFAULT: 'var(--error)',
          foreground: 'var(--btn-primary-text)',
        },
        muted: {
          DEFAULT: 'var(--text-muted)',
          foreground: 'var(--bg-primary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--btn-primary-text)',
        },
        popover: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)',
        },
        card: {
          DEFAULT: 'var(--bg-card)',
          foreground: 'var(--text-primary)',
        },
        // Custom SMM Panel colors
        'deep-navy': 'var(--bg-tertiary)',
        'electric-blue': 'var(--accent)',
        'neon-green': 'var(--success)',
        'cyber-purple': 'var(--accent-secondary)',
        'dark-bg': 'var(--bg-primary)',
      },
      fontFamily: {
        'exo': ['"Exo 2"', 'sans-serif'],
        'dm-sans': ['"DM Sans"', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "glow-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(0, 212, 255, 0.3)",
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(0, 212, 255, 0.6)",
          }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" }
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        "counter": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "ticker": "ticker 30s linear infinite",
        "counter": "counter 0.5s ease-out forwards",
        "gradient-shift": "gradient-shift 3s ease infinite"
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-gradient': 'linear-gradient(135deg, var(--accent) 0%, var(--accent-secondary) 100%)',
        'neon-gradient': 'linear-gradient(90deg, var(--accent) 0%, var(--success) 50%, var(--accent-secondary) 100%)',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0, 212, 255, 0.5)',
        'neon-strong': '0 0 40px rgba(0, 212, 255, 0.8)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'purple-glow': '0 0 20px rgba(139, 92, 246, 0.5)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
