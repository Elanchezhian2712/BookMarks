// In your LoginPage component file

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This useEffect hook is correct and manages the page's background and scrolling.
  useEffect(() => {
    // When the login page mounts, add our special classes to the body
    document.body.classList.add('login-page-active', 'no-scroll');

    // This is a cleanup function that React runs when the component unmounts
    return () => {
      // When we navigate away from the login page, remove the classes
      document.body.classList.remove('login-page-active', 'no-scroll');
    };
  }, []); // The empty array means this effect runs only on mount and unmount

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="glass-login-page">
      <motion.div 
        className="glass-login-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="glass-title">My Book Mark</h1>
        <form onSubmit={handleLogin}>
          <div className="glass-input-group">
            <input 
              type="email" 
              className="glass-input"
              id="login-email" 
              required 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="glass-input-group">
            <input 
              type="password"
              className="glass-input"
              id="login-password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div style={{color: '#ffc1c1', textAlign: 'center', fontSize: '0.9rem', margin: '1rem 0'}}>{error}</div>}
          <button type="submit" className="glass-button" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}