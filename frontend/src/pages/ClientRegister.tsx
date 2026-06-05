import { useState, useEffect, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';

interface FieldErrors {
  businessName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

interface ReferralInfo {
  valid: boolean;
  supplierName: string;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

export default function ClientRegister() {
  const { code } = useParams<{ code: string }>();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [supplierName, setSupplierName] = useState('');
  const [invalidMessage, setInvalidMessage] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate referral code on mount
  useEffect(() => {
    if (!code) {
      setPageState('invalid');
      setInvalidMessage('Invalid referral link.');
      return;
    }

    apiClient
      .get<ReferralInfo>(`/referral/${code}`)
      .then((res) => {
        if (res.data.valid) {
          setSupplierName(res.data.supplierName);
          setPageState('valid');
        } else {
          setPageState('invalid');
          setInvalidMessage('This referral link is no longer active.');
        }
      })
      .catch(() => {
        setPageState('invalid');
        setInvalidMessage('This referral link is no longer active.');
      });
  }, [code]);

  // Client-side validation
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    if (!contactName.trim()) {
      errors.contactName = 'Contact name is required';
    }
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
      errors.phone = 'Phone must be in E.164 format (e.g., +966512345678)';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email format';
    }
    return errors;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post(`/referral/${code}/register`, {
        businessName: businessName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setPageState('success');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: {
            status?: number;
            data?: { error?: { code?: string; message?: string; fields?: Record<string, string> } };
          };
        };
        const status = axiosErr.response?.status;
        const errorData = axiosErr.response?.data?.error;

        if (status === 409) {
          setFormError('This email is already registered.');
        } else if (status === 404) {
          setFormError('This referral link is no longer active.');
        } else if (status === 400 && errorData?.fields) {
          setFieldErrors(errorData.fields as FieldErrors);
        } else {
          setFormError(errorData?.message || 'Registration failed. Please try again.');
        }
      } else {
        setFormError('Unable to connect. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <p>Validating referral link…</p>
      </div>
    );
  }

  // Invalid/inactive referral code
  if (pageState === 'invalid') {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>Referral Link Unavailable</h1>
        <p role="alert" style={{ color: 'red' }}>
          {invalidMessage}
        </p>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>Registration Complete</h1>
        <p>Thank you for registering. You have been referred by <strong>{supplierName}</strong>.</p>
      </div>
    );
  }

  // Valid referral — show registration form
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px' }}>
      <h1>Client Registration</h1>
      <p>
        Referred by: <strong>{supplierName}</strong>
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="businessName" style={{ display: 'block', marginBottom: 4 }}>
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            aria-invalid={!!fieldErrors.businessName}
            aria-describedby={fieldErrors.businessName ? 'businessName-error' : undefined}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
          {fieldErrors.businessName && (
            <span id="businessName-error" style={{ color: 'red', fontSize: 13 }}>
              {fieldErrors.businessName}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="contactName" style={{ display: 'block', marginBottom: 4 }}>
            Contact Name
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            aria-invalid={!!fieldErrors.contactName}
            aria-describedby={fieldErrors.contactName ? 'contactName-error' : undefined}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
          {fieldErrors.contactName && (
            <span id="contactName-error" style={{ color: 'red', fontSize: 13 }}>
              {fieldErrors.contactName}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="phone" style={{ display: 'block', marginBottom: 4 }}>
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966512345678"
            aria-invalid={!!fieldErrors.phone}
            aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
          {fieldErrors.phone && (
            <span id="phone-error" style={{ color: 'red', fontSize: 13 }}>
              {fieldErrors.phone}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: 4 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          />
          {fieldErrors.email && (
            <span id="email-error" style={{ color: 'red', fontSize: 13 }}>
              {fieldErrors.email}
            </span>
          )}
        </div>

        {formError && (
          <div role="alert" style={{ color: 'red', marginBottom: 16 }}>
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: 10, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'Registering…' : 'Register'}
        </button>
      </form>
    </div>
  );
}
