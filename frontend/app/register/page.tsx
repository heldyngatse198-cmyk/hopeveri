'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Eye, EyeOff, Mail, Lock, User, Camera, Check, Upload } from 'lucide-react';

const AVATAR_COLORS = ['#06b6d4','#8b5cf6','#f43f5e','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6'];

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[1]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (email: string) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await register(email, password);
      setMessage(data?.message || 'Compte créé. Vérifie ton email pour confirmer ton adresse avant connexion.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#f0f0f0' }}>
      <div className="w-full max-w-md" style={{
        background: '#ffffff',
        border: '4px solid #1a1a2e',
        borderRadius: '0',
        boxShadow: '8px 8px 0 #1a1a2e',
        padding: '2rem',
      }}>
        {/* Brand */}
        <div className="text-center mb-6">
          <div style={{
            width: '64px',
            height: '64px',
            background: '#8b5cf6',
            border: '3px solid #1a1a2e',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#fff',
            transform: 'rotate(3deg)',
          }}>
            HV
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: '#1a1a2e',
            textTransform: 'uppercase',
            letterSpacing: '-0.03em',
          }}>
            Créer un compte
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#4a4a6a', fontWeight: 600, marginTop: '0.25rem' }}>
            Inscris-toi pour accéder aux analyses IA, à l'humanisation et aux offres premium.
          </p>
        </div>

        {/* Avatar Picker */}
        <div className="mb-6 text-center">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            Ton avatar
          </p>
          
          {/* Avatar Preview */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid #1a1a2e',
            background: avatarPreview ? 'transparent' : selectedColor,
            margin: '0 auto 0.75rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{getInitials(email)}</span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '28px',
                height: '28px',
                background: '#ffffff',
                border: '2px solid #1a1a2e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={14} color="#1a1a2e" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {/* Color Picker */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '28px',
                  height: '28px',
                  background: color,
                  border: selectedColor === color ? '3px solid #1a1a2e' : '2px solid #d1d5db',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {selectedColor === color && <Check size={14} color="#fff" />}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Les couleurs d'avatar peuvent être modifiées plus tard dans les paramètres.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#1a1a2e',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#1a1a2e', opacity: 0.5 }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ton@email.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '3px solid #1a1a2e',
                  borderRadius: '0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1a1a2e',
                  background: '#f8f8ff',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#1a1a2e',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#1a1a2e', opacity: 0.5 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 caractères"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  border: '3px solid #1a1a2e',
                  borderRadius: '0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1a1a2e',
                  background: '#f8f8ff',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#1a1a2e', opacity: 0.5, padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Message / Error */}
          {error && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', border: '2px solid #ef4444', color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ padding: '0.75rem', background: '#d1fae5', border: '2px solid #10b981', color: '#065f46', fontSize: '0.8rem', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading ? '#94a3b8' : '#8b5cf6',
              border: '3px solid #1a1a2e',
              borderRadius: '0',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '4px 4px 0 #1a1a2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? 'Enregistrement...' : <><User size={18} /> Créer mon compte</>}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '3px', background: '#1a1a2e' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4a4a6a' }}>OU</span>
          <div style={{ flex: 1, height: '3px', background: '#1a1a2e' }} />
        </div>

        {/* Login link */}
        <Link
          href="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.75rem',
            background: '#ffffff',
            border: '3px solid #1a1a2e',
            boxShadow: '4px 4px 0 #1a1a2e',
            color: '#1a1a2e',
            fontSize: '0.875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Déjà inscrit ? Connecte-toi <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
