'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--navy)'}}>
      <div style={{color:'#fff',fontSize:'16px'}}>Redirecting...</div>
    </div>
  );
}
