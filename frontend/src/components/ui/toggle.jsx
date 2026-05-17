import React from 'react';

const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  label, // optional label text
  labelPosition = 'right', // 'left' | 'right'
  description, // optional description below label
  color = 'blue', // 'blue' | 'green' | 'cyan' | 'purple'
  className = '',
}) => {
  const sizes = {
    sm: {
      track: { width: 36, height: 20 },
      thumb: { size: 14, offset: 3 },
      translate: 16,
      fontSize: 13,
    },
    md: {
      track: { width: 48, height: 26 },
      thumb: { size: 18, offset: 4 },
      translate: 22,
      fontSize: 14,
    },
    lg: {
      track: { width: 60, height: 32 },
      thumb: { size: 24, offset: 4 },
      translate: 28,
      fontSize: 15,
    },
  };

  const colors = {
    blue: { on: '#2563eb', glow: 'rgba(37,99,235,0.3)' },
    green: { on: '#10b981', glow: 'rgba(16,185,129,0.3)' },
    cyan: { on: '#00d2ff', glow: 'rgba(0,210,255,0.3)' },
    purple: { on: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  };

  const s = sizes[size] || sizes.md;
  const c = colors[color] || colors.blue;

  const trackStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    width: s.track.width,
    height: s.track.height,
    borderRadius: s.track.height,
    cursor: disabled ? 'not-allowed' : 'pointer',
    flexShrink: 0,
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    background: checked ? c.on : 'var(--toggle-off, #cbd5e1)',
    border: checked ? `2px solid ${c.on}` : '2px solid var(--toggle-border, #e2e8f0)',
    boxShadow: checked
      ? `0 0 0 3px ${c.glow}, 0 2px 8px ${c.glow}`
      : 'inset 0 1px 3px rgba(0,0,0,0.1)',
    opacity: disabled ? 0.5 : 1,
  };

  const thumbStyle = {
    position: 'absolute',
    left: s.thumb.offset,
    width: s.thumb.size,
    height: s.thumb.size,
    borderRadius: '50%',
    background: '#ffffff',
    boxShadow: checked
      ? '0 2px 6px rgba(0,0,0,0.2)'
      : '0 1px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    transform: checked ? `translateX(${s.translate}px) scale(1.05)` : 'translateX(0) scale(1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const thumbIconStyle = {
    fontSize: size === 'sm' ? 7 : size === 'lg' ? 11 : 9,
    color: checked ? c.on : '#94a3b8',
    opacity: 0.8,
    transition: 'all 0.3s',
    fontWeight: 900,
    lineHeight: 1,
    userSelect: 'none',
  };

  const labelWrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  };

  const labelStyle = {
    fontSize: s.fontSize,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
    userSelect: 'none',
  };

  const descStyle = {
    fontSize: s.fontSize - 1,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    userSelect: 'none',
  };

  const handleClick = () => {
    if (disabled || !onChange) return;
    onChange(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };

  const toggle = (
    <div
      style={trackStyle}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {size !== 'sm' && (
        <span
          style={{
            position: 'absolute',
            left: 6,
            fontSize: 9,
            fontWeight: 800,
            color: checked ? 'rgba(255,255,255,0.7)' : 'transparent',
            letterSpacing: 0.3,
            transition: 'all 0.3s',
            userSelect: 'none',
          }}
        >
          ON
        </span>
      )}

      {size !== 'sm' && (
        <span
          style={{
            position: 'absolute',
            right: 6,
            fontSize: 9,
            fontWeight: 800,
            color: !checked ? 'var(--text-disabled, #94a3b8)' : 'transparent',
            letterSpacing: 0.3,
            transition: 'all 0.3s',
            userSelect: 'none',
          }}
        >
          OFF
        </span>
      )}

      <div style={thumbStyle}>
        <span style={thumbIconStyle}>{checked ? '✓' : ''}</span>
      </div>
    </div>
  );

  if (!label) {
    return (
      <div
        className={className}
        style={{ display: 'inline-flex' }}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
      >
        {toggle}
      </div>
    );
  }

  const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
    gap: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div
      className={className}
      style={wrapperStyle}
      onClick={(e) => {
        e.preventDefault();
        handleClick();
      }}
    >
      {labelPosition !== 'left' && toggle}
      <div style={labelWrapStyle}>
        {label && <span style={labelStyle}>{label}</span>}
        {description && <span style={descStyle}>{description}</span>}
      </div>
      {labelPosition === 'left' && toggle}
    </div>
  );
};

export default Toggle;

