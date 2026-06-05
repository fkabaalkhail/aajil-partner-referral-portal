import { useState, type CSSProperties } from 'react';
import ClientList from './ClientList';

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  referralCode: string;
  status: 'active' | 'deactivated';
  referralCount: number;
  createdAt: string;
}

interface SupplierListProps {
  suppliers: Supplier[];
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
  loading: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginTop: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem 1rem',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    color: '#4a5568',
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  deactivatedRow: {
    opacity: 0.5,
    color: '#a0aec0',
  },
  activeRow: {
    opacity: 1,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  activeBadge: {
    backgroundColor: '#c6f6d5',
    color: '#276749',
  },
  deactivatedBadge: {
    backgroundColor: '#e2e8f0',
    color: '#718096',
  },
  actionButton: {
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  deactivateButton: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
  },
  reactivateButton: {
    backgroundColor: '#c6f6d5',
    color: '#276749',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#718096',
  },
  loadingState: {
    textAlign: 'center' as const,
    padding: '2rem 1rem',
    color: '#718096',
  },
  clickableRow: {
    cursor: 'pointer',
  },
  expandedIndicator: {
    display: 'inline-block',
    marginRight: '0.5rem',
    fontSize: '0.75rem',
    transition: 'transform 0.2s',
  },
  clientListRow: {
    backgroundColor: '#f7fafc',
  },
  clientListCell: {
    padding: 0,
  },
};

export default function SupplierList({ suppliers, onDeactivate, onReactivate, loading }: SupplierListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return <div style={styles.loadingState}>Loading suppliers...</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No referral data is available yet.</p>
      </div>
    );
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Referral Count</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => {
            const isDeactivated = supplier.status === 'deactivated';
            const isExpanded = expandedId === supplier.id;
            const rowStyle = isDeactivated ? styles.deactivatedRow : styles.activeRow;

            return (
              <>
                <tr
                  key={supplier.id}
                  style={{ ...rowStyle, ...styles.clickableRow }}
                  onClick={() => toggleExpand(supplier.id)}
                  aria-expanded={isExpanded}
                  aria-label={`${supplier.name} - click to ${isExpanded ? 'collapse' : 'expand'} client list`}
                >
                  <td style={styles.td}>
                    <span style={{
                      ...styles.expandedIndicator,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}>
                      ▶
                    </span>
                    {supplier.name}
                  </td>
                  <td style={styles.td}>{supplier.contactEmail}</td>
                  <td style={styles.td}>{supplier.referralCount}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(isDeactivated ? styles.deactivatedBadge : styles.activeBadge),
                      }}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {isDeactivated ? (
                      <button
                        style={{ ...styles.actionButton, ...styles.reactivateButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReactivate(supplier.id);
                        }}
                        aria-label={`Reactivate ${supplier.name}`}
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        style={{ ...styles.actionButton, ...styles.deactivateButton }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeactivate(supplier.id);
                        }}
                        aria-label={`Deactivate ${supplier.name}`}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${supplier.id}-clients`} style={styles.clientListRow}>
                    <td colSpan={5} style={styles.clientListCell}>
                      <ClientList supplierId={supplier.id} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
