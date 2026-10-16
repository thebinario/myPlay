import React from 'react';

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  backgroundColor: '#0D111B',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#F8FAFC',
  fontSize: '13px',
  minWidth: '200px',
};

export interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ label, description, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ color: '#E2E8F0', fontSize: '13px' }}>{label}</span>
      {description && <span style={{ color: '#64748B', fontSize: '11px' }}>{description}</span>}
    </div>
    {children}
  </div>
);

export interface SelectFieldProps {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
  disabled,
}) => (
  <select
    aria-label={label}
    value={value}
    disabled={disabled}
    onChange={(event) => onChange(event.target.value)}
    style={{ ...selectStyle, opacity: disabled ? 0.6 : 1 }}
  >
    {options.map((option) => (
      <option key={option.id} value={option.id}>
        {option.label}
      </option>
    ))}
  </select>
);

export interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    style={{
      width: '42px',
      height: '24px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.12)',
      backgroundColor: checked ? 'rgba(165, 148, 255, 0.35)' : 'rgba(255,255,255,0.08)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: '2px',
        left: checked ? '20px' : '2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: checked ? '#A594FF' : '#64748B',
        transition: 'left 0.15s ease',
      }}
    />
  </button>
);
