import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
      <h1>404</h1>
      <p style={{ fontSize: 18, color: '#555', marginBottom: 24 }}>
        Page not found. The page you are looking for does not exist.
      </p>
      <Link to="/login" style={{ color: '#1976d2', textDecoration: 'underline' }}>
        Go to Login
      </Link>
    </div>
  );
}
