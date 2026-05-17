import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeSwitcher = () => {
  const { activeTheme, saveGlobalSiteTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = async (themeName) => {
    setSaving(true);
    setSaved(false);
    const result = await saveGlobalSiteTheme(themeName);
    setSaving(false);
    if (result?.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Site Theme
      </h2>
      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: 14,
          marginBottom: 28,
        }}
      >
        Default site theme for visitors and users who have not set a personal preference in their menu. Logged-in users can override with the sun/moon toggle. Main Admin changes apply to defaults (clients poll for updates).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        <div
          onClick={() => handleChange('dark')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleChange('dark');
          }}
          style={{
            border: activeTheme === 'dark' ? '2px solid var(--accent)' : '2px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving && activeTheme !== 'dark' ? 0.7 : 1,
            transition: 'all 0.2s',
            background: activeTheme === 'dark' ? 'var(--accent-light)' : 'var(--card-bg)',
            boxShadow: activeTheme === 'dark' ? 'var(--shadow-accent)' : 'none',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: 16,
              height: 140,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 48,
                background: 'var(--bg-secondary)',
                borderRight: '1px solid rgba(0,210,255,0.08)',
              }}
            />
            <div style={{ marginLeft: 56 }}>
              <div
                style={{
                  height: 8,
                  width: '60%',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 36,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 28,
                  background: 'var(--btn-primary-bg)',
                  opacity: 0.85,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--card-bg)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>🌙 Dark Mode</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dark bg + accent</div>
            </div>
            {activeTheme === 'dark' && (
              <div
                style={{
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  borderRadius: 50,
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ✓ Active
              </div>
            )}
          </div>
        </div>

        <div
          onClick={() => handleChange('light')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleChange('light');
          }}
          style={{
            border: activeTheme === 'light' ? '2px solid var(--accent)' : '2px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving && activeTheme !== 'light' ? 0.7 : 1,
            transition: 'all 0.2s',
            background: activeTheme === 'light' ? 'var(--accent-light)' : 'var(--card-bg)',
            boxShadow: activeTheme === 'light' ? 'var(--shadow-accent)' : 'none',
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: 16,
              height: 140,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 48,
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border)',
              }}
            />
            <div style={{ marginLeft: 56 }}>
              <div
                style={{
                  height: 8,
                  width: '60%',
                  background: 'rgba(15,23,42,0.15)',
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 36,
                      background: 'rgba(255,255,255,0.8)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 28,
                  background: 'var(--btn-primary-bg)',
                  opacity: 0.85,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--card-bg)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>☀️ Light Mode</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>White bg + blue</div>
            </div>
            {activeTheme === 'light' && (
              <div
                style={{
                  background: 'var(--accent-gradient)',
                  color: 'white',
                  borderRadius: 50,
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                ✓ Active
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          color: saving ? 'var(--text-muted)' : saved ? 'var(--success)' : 'transparent',
        }}
      >
        {saving ? '⏳ Saving default site theme...' : saved ? '✅ Default theme updated.' : '.'}
      </div>
    </div>
  );
};

export default ThemeSwitcher;

