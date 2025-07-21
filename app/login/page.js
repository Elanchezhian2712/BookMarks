'use client';

import { useState } from 'react';
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setError('');
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
    
    setIsSubmitting(false);
  };

  return (
    // We can reuse the glass-login-page style for a consistent entry point
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