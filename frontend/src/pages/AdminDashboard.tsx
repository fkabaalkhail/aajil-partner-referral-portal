import { useState, useEffect, useCallback, type CSSProperties, type FormEvent } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import SupplierList, { type Supplier } from '../components/SupplierList';

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a202c',
    margin: 0,
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#4a5568',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '1rem',
  },
  form: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  input: {
    padding: '0.6rem 0.8rem',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '0.9rem',
    width: '200px',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  fieldError: {
    fontSize: '0.75rem',
    color: '#e53e3e',
    margin: 0,
  },
  submitButton: {
    padding: '0.6rem 1.2rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#3182ce',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    marginTop: '0.25rem',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successMessage: {
    padding: '0.75rem 1rem',
    backgroundColor: '#c6f6d5',
    color: '#276749',
    borderRadius: '4px',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
  },
  errorMessage: {
    padding: '0.75rem 1rem',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    borderRadius: '4px',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
  },
};

interface FormErrors {
  name?: string;
  email?: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/suppliers');
      setSuppliers(response.data);
    } catch {
      setErrorMessage('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  function validateForm(): FormErrors {
    const errors: FormErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = 'Name is required';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name must be 100 characters or fewer';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email format';
    }

    return errors;
  }

  async function handleInviteSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/admin/suppliers', {
        name: name.trim(),
        email: email.trim(),
      });
      setSuccessMessage(`Supplier "${name.trim()}" invited successfully.`);
      setName('');
      setEmail('');
      setFormErrors({});
      await fetchSuppliers();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      if (apiError?.code === 'CONFLICT') {
        setErrorMessage(apiError.message || 'A supplier with this email already exists.');
      } else if (apiError?.code === 'VALIDATION_ERROR' && apiError.fields) {
        setFormErrors(apiError.fields);
      } else {
        setErrorMessage('Failed to invite supplier. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await apiClient.patch(`/admin/suppliers/${id}/deactivate`);
      await fetchSuppliers();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      if (apiError?.code === 'CONFLICT') {
        setErrorMessage(apiError.message || 'Supplier is already deactivated.');
      } else {
        setErrorMessage('Failed to deactivate supplier.');
      }
    }
  }

  async function handleReactivate(id: string) {
    try {
      await apiClient.patch(`/admin/suppliers/${id}/reactivate`);
      await fetchSuppliers();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      if (apiError?.code === 'CONFLICT') {
        setErrorMessage(apiError.message || 'Supplier is already active.');
      } else {
        setErrorMessage('Failed to reactivate supplier.');
      }
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <div>
          <span style={{ marginRight: '1rem', color: '#4a5568', fontSize: '0.85rem' }}>
            {user?.name}
          </span>
          <button style={styles.logoutButton} onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Invite Supplier Form */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Invite Supplier</h2>
        <form style={styles.form} onSubmit={handleInviteSubmit} noValidate>
          <div style={styles.inputGroup}>
            <input
              type="text"
              placeholder="Supplier name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              style={{
                ...styles.input,
                ...(formErrors.name ? styles.inputError : {}),
              }}
              aria-label="Supplier name"
              aria-invalid={!!formErrors.name}
            />
            {formErrors.name && <p style={styles.fieldError}>{formErrors.name}</p>}
          </div>
          <div style={styles.inputGroup}>
            <input
              type="email"
              placeholder="Contact email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
              }}
              style={{
                ...styles.input,
                ...(formErrors.email ? styles.inputError : {}),
              }}
              aria-label="Contact email"
              aria-invalid={!!formErrors.email}
            />
            {formErrors.email && <p style={styles.fieldError}>{formErrors.email}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {submitting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
        {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
        {errorMessage && <div style={styles.errorMessage}>{errorMessage}</div>}
      </section>

      {/* Supplier List */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Suppliers</h2>
        <SupplierList
          suppliers={suppliers}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          loading={loading}
        />
      </section>
    </div>
  );
}
