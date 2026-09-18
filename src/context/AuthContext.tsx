/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole, Profile } from '../types';
import { ROLE_DEFINITIONS } from '../lib/roles';
import { recordAuditLog } from '../services/auditService';

export interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  currentRole: UserRole;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  switchSimulatedRole: (role: UserRole) => void;
  isSimulatingRole: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default guest profile when not logged in
const DEMO_USERS: Record<UserRole, Profile> = {
  SUPER_ADMIN: {
    id: 'user-superadmin-01',
    email: 'superadmin@pesantren.id',
    full_name: 'K.H. Ahmad Dimyathi (Pengasuh Pondok)',
    role_code: 'SUPER_ADMIN',
    phone: '081122334455',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  ADMIN: {
    id: 'user-admin-01',
    email: 'admin.sekretariat@pesantren.id',
    full_name: 'Ust. Fathurrahman (Sekretariat Pusat)',
    role_code: 'ADMIN',
    phone: '081234567890',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  PENGURUS_ASRAMA: {
    id: 'user-asrama-01',
    email: 'pengurus.asrama@pesantren.id',
    full_name: 'Ust. Hilman Nurhakim (Lurah Asrama Putra)',
    role_code: 'PENGURUS_ASRAMA',
    phone: '081398765432',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  PETUGAS_SEKOLAH: {
    id: 'user-sekolah-01',
    email: 'petugas.sekolah@pesantren.id',
    full_name: 'Ust. Zainuddin (Tata Usaha MTs/MA)',
    role_code: 'PETUGAS_SEKOLAH',
    phone: '081555666777',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  PETUGAS_MADIN: {
    id: 'user-madin-01',
    email: 'petugas.madin@pesantren.id',
    full_name: 'Ust. Marzuqi Ali (Petugas Madrasah Diniyah)',
    role_code: 'PETUGAS_MADIN',
    phone: '081777888999',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  PETUGAS_JAMAAH: {
    id: 'user-jamaah-01',
    email: 'petugas.jamaah@pesantren.id',
    full_name: 'Kang Mukhlis (Petugas Kedisiplinan Jamaah)',
    role_code: 'PETUGAS_JAMAAH',
    phone: '081999000111',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('SUPER_ADMIN');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSimulatingRole, setIsSimulatingRole] = useState<boolean>(false);

  const configured = isSupabaseConfigured();

  // Load profile from Supabase profiles table
  const fetchSupabaseProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        setCurrentRole((data as Profile).role_code);
      } else {
        // Fallback default profile if table row is absent
        const fallback: Profile = {
          id: userId,
          email,
          full_name: email.split('@')[0],
          role_code: 'SUPER_ADMIN',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallback);
        setCurrentRole('SUPER_ADMIN');
      }
    } catch {
      // Error handling
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (configured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (mounted && session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            await fetchSupabaseProfile(session.user.id, session.user.email || '');
          } else if (mounted) {
            // Default demo logged-in user for ease of first use
            const defaultUser = DEMO_USERS.SUPER_ADMIN;
            setUser({ id: defaultUser.id, email: defaultUser.email });
            setProfile(defaultUser);
            setCurrentRole('SUPER_ADMIN');
          }
        } catch {
          if (mounted) {
            const defaultUser = DEMO_USERS.SUPER_ADMIN;
            setUser({ id: defaultUser.id, email: defaultUser.email });
            setProfile(defaultUser);
            setCurrentRole('SUPER_ADMIN');
          }
        }
      } else {
        // Unconfigured environment: Default to Super Admin demo profile
        const defaultUser = DEMO_USERS.SUPER_ADMIN;
        setUser({ id: defaultUser.id, email: defaultUser.email });
        setProfile(defaultUser);
        setCurrentRole('SUPER_ADMIN');
      }

      if (mounted) setLoading(false);
    }

    initAuth();

    // Supabase Auth listener
    let authListener: { subscription?: { unsubscribe: () => void } } | null = null;
    if (configured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          await fetchSupabaseProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      });
      authListener = data;
    }

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [configured]);

  const login = async (email: string, pass: string): Promise<{ error: string | null }> => {
    if (!configured) {
      // Demo authentication simulation
      const foundRole = (Object.keys(DEMO_USERS) as UserRole[]).find(
        (r) => DEMO_USERS[r].email.toLowerCase() === email.toLowerCase().trim()
      );
      if (foundRole) {
        const u = DEMO_USERS[foundRole];
        setUser({ id: u.id, email: u.email });
        setProfile(u);
        setCurrentRole(u.role_code);
        setIsSimulatingRole(false);
        recordAuditLog({
          userId: u.id,
          userEmail: u.email,
          action: 'LOGIN',
          module: 'AUTH',
          details: { role: u.role_code, mode: 'demo' },
        });
        return { error: null };
      }
      // Any custom email logs in with Super Admin
      const customProfile: Profile = {
        id: `user-${Date.now()}`,
        email,
        full_name: email.split('@')[0],
        role_code: 'SUPER_ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser({ id: customProfile.id, email });
      setProfile(customProfile);
      setCurrentRole('SUPER_ADMIN');
      recordAuditLog({
        userId: customProfile.id,
        userEmail: email,
        action: 'LOGIN',
        module: 'AUTH',
        details: { role: 'SUPER_ADMIN', mode: 'demo' },
      });
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        await fetchSupabaseProfile(data.user.id, data.user.email || '');
        recordAuditLog({
          userId: data.user.id,
          userEmail: data.user.email || email,
          action: 'LOGIN',
          module: 'AUTH',
          details: { method: 'supabase_auth' },
        });
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal';
      return { error: msg };
    }
  };

  const logout = async () => {
    const prevEmail = user?.email;
    const prevId = user?.id;
    if (configured) {
      await supabase.auth.signOut();
    }
    recordAuditLog({
      userId: prevId || null,
      userEmail: prevEmail || 'User',
      action: 'LOGOUT',
      module: 'AUTH',
    });
    setUser(null);
    setProfile(null);
  };

  const switchSimulatedRole = (role: UserRole) => {
    setIsSimulatingRole(true);
    setCurrentRole(role);
    const demo = DEMO_USERS[role];
    setProfile({
      ...demo,
      id: user?.id || demo.id,
      email: user?.email || demo.email,
    });
  };

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      currentRole,
      loading,
      isConfigured: configured,
      login,
      logout,
      switchSimulatedRole,
      isSimulatingRole,
    }),
    [user, profile, currentRole, loading, configured, isSimulatingRole]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
