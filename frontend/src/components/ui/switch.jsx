import * as React from 'react';

import Toggle from './Toggle';

// Compatibility wrapper: the app currently uses Radix-style props
// (`checked`, `onCheckedChange`, `disabled`). This component keeps that API
// but renders the new modern toggle UI.
const Switch = React.forwardRef(
  ({ className = '', checked = false, onCheckedChange, onChange, disabled = false, size = 'md', ...props }, ref) => {
    const handleChange = (val) => {
      if (typeof onChange === 'function') onChange(val);
      else if (typeof onCheckedChange === 'function') onCheckedChange(val);
    };

    // We intentionally ignore `...props` like role/className from callsites,
    // since Toggle owns the switch semantics + visuals.
    return (
      <div className={className} ref={ref}>
        <Toggle checked={!!checked} onChange={handleChange} disabled={!!disabled} size={size} />
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
