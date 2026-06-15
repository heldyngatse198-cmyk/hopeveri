'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Camera, Check, Palette, Upload, LogOut, User, Trash2 } from 'lucide-react';

const AVATAR_COLORS = ['#06b6d4','#8b5cf6','#f43f5e','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6'];

const BG_COLORS = [
  { name: 'Original', value: '#090b17' },
  { name: 'Blanc', value: '#f0f0f0' },
  { name: 'Noir', value: '#0a0a0a' },
  { name: 'Bleu Nuit', value: '#0f172a' },
  { name: 'Gris', value: '#1f2937' },
  { name: 'Violet', value: '#1e1338' },
  { name: 'Vert', value: '#0f2e1a' },
  { name: 'Rose', value: '#2d142c' },
  { name: 'Rouge', value: '#2d1414' },
];

export default function ParametresPage() {
  const { user, logout, updateAvatar, updateAvatarColor, updateBackgroundColor } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingColor, setSavingColor] = useState<string | null>(null);
  const [savingBg, setSavingBg] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      await updateAvatar(file);
      setMessage('Avatar mis à jour !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec upload');
    } finally {
      setUploading(false);
    }
  };

  const handleColorChange = async (color: string) => {
    setSavingColor(color);
    setError('');
    setMessage('');
    try {
      await updateAvatarColor(color);
      setMessage('Couleur d\'avatar mise à jour !');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec');
    } finally {
      setSavingColor(null);
    }
  };

  const handleBgChange = async (color: string) => {
    setSavingBg(color);
    setError('');
    setMessage('');
    try {
      await updateBackgroundColor(color);
      setMessage('Couleur de fond mise à jour !');
      // Apply to body
      document.body.style.background = color;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec');
    } finally {
      setSavingBg(null);
    }
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  // Apply background on mount
  useEffect(() => {
    if (user?.background_color) {
      document.body.style.background = user.background_color;
    }
  }, [user?.background_color]);

  // Show avatar section even when not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#f0f0f0' }}>
        <div className="w-full max-w-md text-center" style={{
          background: '#ffffff', border: '4px solid #1a1a2e', boxShadow: '8px 8px 0 #1a1a2e', padding: '2rem',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1a2e' }}>Paramètres</h1>
          <p style={{ color: '#4a4a6a', fontWeight: 600, margin: '1rem 0' }}>Tu n'es pas connecté.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" style={{
              padding: '0.75rem 1.5rem', background: '#f43f5e', border: '3px solid #1a1a2e',
              color: '#fff', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none',
              boxShadow: '4px 4px 0 #1a1a2e',
            }}>Se connecter</Link>
            <Link href="/register" style={{
              padding: '0.75rem 1.5rem', background: '#fff', border: '3px solid #1a1a2e',
              color: '#1a1a2e', fontWeight: 700, textTransform: 'uppercase', textDecoration: 'none',
              boxShadow: '4px 4px 0 #1a1a2e',
            }}>Créer un compte</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: user.background_color || '#090b17' }}>
      <div className="px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            padding: '2rem',
          }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
              Paramètres
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Gère ton avatar, les couleurs d'interface et ton compte HopeVeri.
            </p>

            {message && (
              <div style={{ padding: '0.75rem', background: '#d1fae5', border: '2px solid #10b981', color: '#065f46', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', border: '2px solid #ef4444', color: '#991b1b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Avatar Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                <User size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Avatar
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.2)',
                  background: user.avatar_url ? 'transparent' : (user.avatar_color || '#06b6d4'),
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', flexShrink: 0,
                }}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{getInitials()}</span>
                  )}
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    <Upload size={14} /> {uploading ? 'Upload...' : 'Uploader une photo'}
                  </button>
                </div>
              </div>

              {/* Avatar Colors */}
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Couleur de fond d'avatar :
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      disabled={savingColor === color}
                      style={{
                        width: '32px', height: '32px', background: color,
                        border: user.avatar_color === color ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {user.avatar_color === color && <Check size={14} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Color Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                <Palette size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Couleur de fond
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg.value}
                    onClick={() => handleBgChange(bg.value)}
                    disabled={savingBg === bg.value}
                    style={{
                      padding: '0.5rem 1rem', background: bg.value, color: '#fff',
                      border: user.background_color === bg.value ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                    }}
                  >
                    {user.background_color === bg.value && <Check size={12} />}
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Info */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
                Compte
              </h2>
              <div style={{
                padding: '1rem', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Email</p>
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>{user.email}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Abonnement</p>
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {user.subscription === 'free' ? 'Gratuit' : user.subscription === 'monthly' ? 'Mensuel Premium' : 'Annuel Premium'}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Quota journalier</p>
                <p style={{ color: '#fff', fontWeight: 600, marginBottom: '0.75rem' }}>{user.daily_quota} / analyses restantes</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 1.5rem', background: '#ef4444',
                border: '2px solid rgba(255,255,255,0.2)', color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              <LogOut size={16} /> Me déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
