import { useState, useCallback, useRef } from 'react';

interface ReferralLinkProps {
  link: string;
  status: 'active' | 'deactivated';
}

export default function ReferralLink({ link, status }: ReferralLinkProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    timerRef.current = setTimeout(() => {
      setCopyState('idle');
      timerRef.current = null;
    }, 3000);
  }, [link]);

  const statusLabel = status === 'active' ? 'Active' : 'Inactive';
  const statusColor = status === 'active' ? '#22c55e' : '#9ca3af';

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Referral Link</h3>
        <span
          aria-label={`Status: ${statusLabel}`}
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: status === 'active' ? '#dcfce7' : '#f3f4f6',
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input
          type="text"
          readOnly
          value={link}
          aria-label="Referral link"
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: '#f9fafb',
            color: '#374151',
          }}
        />
        <button
          onClick={handleCopy}
          aria-label={copyState === 'copied' ? 'Link copied' : copyState === 'failed' ? 'Copy failed' : 'Copy referral link'}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
            minWidth: '6rem',
            backgroundColor:
              copyState === 'copied' ? '#dcfce7' : copyState === 'failed' ? '#fee2e2' : '#2563eb',
            color:
              copyState === 'copied' ? '#166534' : copyState === 'failed' ? '#991b1b' : '#ffffff',
          }}
        >
          {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </div>
      {copyState === 'failed' && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#991b1b' }}>
          Could not copy automatically. Please select the link above and copy manually.
        </p>
      )}
    </div>
  );
}
