import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import './Login.css';

export default function Login() {
  const { logoUrl, login } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError('Email atau password salah. Pastikan akun Anda sudah terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      <div className="login-bg">
        <div className="login-bg__circle login-bg__circle--1" />
        <div className="login-bg__circle login-bg__circle--2" />
        <div className="login-bg__circle login-bg__circle--3" />
      </div>
      <div className="login-card animate-fade-in-scale">
        <div className="login-card__header">
          <img src={logoUrl} alt="MyIbrohimku" className="login-card__logo" />
          <h1 className="login-card__title">MyIbrohimku</h1>
          <p className="login-card__subtitle">Sistem Manajemen Pesantren</p>
        </div>
        <form onSubmit={handleSubmit} className="login-card__form">
          <Input
            label="Email"
            type="email"
            id="login-email"
            name="email"
            autoComplete="username"
            placeholder="admin@myibrohimku.id"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="Masukkan password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <div className="login-card__error">{error}</div>}
          <Button type="submit" fullWidth disabled={loading} id="login-submit-btn">
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
          <p className="login-card__hint">Masuk menggunakan akun yang terdaftar</p>
        </form>
      </div>
    </div>
  );
}
