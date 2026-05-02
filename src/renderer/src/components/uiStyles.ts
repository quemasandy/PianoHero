import type { CSSProperties } from 'react'

export function buttonStyle(background: string, color = '#fff', disabled = false): CSSProperties {
  return {
    background,
    color,
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  }
}
