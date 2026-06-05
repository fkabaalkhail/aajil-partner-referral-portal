import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import ReferralLink from '../components/ReferralLink';

interface SupplierProfile {
  id: string;
  name: string;
  contactEmail: string;
  referralCode: string;
  status: 'active' | 'deactivated';
  referralLink: string;
  referralCount: number;
}

interface ClientRecord {
  id: string;
  businessName: string;
  registeredAt: string;
}

interface PaginatedClients {
  data: ClientRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [clients, setClients] = useState<PaginatedClients | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch supplier profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await apiClient.get('/supplier/me');
        setProfile(res.data);
      } catch {
        setError('Failed to load supplier profile.');
      }
    }
    fetchProfile();
  }, []);

  // Fetch clients (paginated)
  const fetchClients = useCallback(async (page: number) => {
    try {
      const res = await apiClient.get(`/supplier/me/clients?page=${page}&pageSize=20`);
      setClients(res.data);
    } catch {
      setError('Failed to load client list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(currentPage);
  }, [currentPage, fetchClients]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && !profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#991b1b' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Supplier Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user?.name}</span>
          <button
            onClick={logout}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Referral Link Card */}
      {profile && (
        <ReferralLink link={profile.referralLink} status={profile.status} />
      )}

      {/* Referral Count */}
      {profile && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Total Referrals</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
            {profile.referralCount}
          </p>
        </div>
      )}

      {/* Client List */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>Referred Clients</h2>

        {clients && clients.data.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280' }}>No referrals have registered yet</p>
          </div>
        )}

        {clients && clients.data.length > 0 && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Business Name
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Registration Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.data.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}>
                      {client.businessName}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(client.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {clients.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage <= 1 ? 0.5 : 1,
                    fontSize: '0.875rem',
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  Page {clients.page} of {clients.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= clients.totalPages}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: currentPage >= clients.totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= clients.totalPages ? 0.5 : 1,
                    fontSize: '0.875rem',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
