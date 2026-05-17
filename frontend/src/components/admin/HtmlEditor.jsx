import React from 'react';

// Lightweight fallback for the admin rich-text editor.
// Keeps admin pages compiling after revert; replace later with full editor if needed.
export default function HtmlEditor({ value, onChange, placeholder = '' }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-h-[180px] bg-deep-navy border-[var(--border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none"
    />
  );
}

