import { useState, useEffect, type CSSProperties } from 'react';
import apiClient from '../api/client';

export interface Client {
  id: string;
  supplierId: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  registeredAt: string;
}

interface ClientListProps {
  supplierId: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '0.75rem 1rem 0.75rem 2rem',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  heading: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: '0.5rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: 600,
    color: '#718096',
    fontSize: '0.75rem',
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid #edf2f7',
    color: '#2d3748',
  },
  emptyState: {
    padding: '1.5rem 1rem',
    textAlign: 'center' as const,
    color: '#718096',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  loadingState: {
    padding: '1rem',
    textAlign: 'center' as const,
    color: '#718096',
    fontSize: '0.85rem',
  },
  errorState: {
    padding: '1rem',
    textAlign: 'center' as const,
    color: '#c53030',
    fontSize: '0.85rem',
  },
};

export default function ClientList({ supplierId }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get(
          `/admin/suppliers/${supplierId}/clients?page=1&pageSize=20`
        );
        if (!cancelled) {
          setClients(response.data.data);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load clients.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchClients();

    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  if (loading) {
    return <div style={styles.loadingState}>Loading clients...</div>;
  }

  if (error) {
    return <div style={styles.errorState}>{error}</div>;
  }

  if (clients.length === 0) {
    return (
      <div style={styles.emptyState}>
        No clients have been referred by this supplier.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>Referred Clients</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Business Name</th>
            <th style={styles.th}>Contact Name</th>
            <th style={styles.th}>Registration Date</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td style={styles.td}>{client.businessName}</td>
              <td style={styles.td}>{client.contactName}</td>
              <td style={styles.td}>
                {new Date(client.registeredAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
