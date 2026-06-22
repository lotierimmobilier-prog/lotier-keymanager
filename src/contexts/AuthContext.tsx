import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'COLLAB' | 'PRESTATAIRE';
  is_super_admin: boolean;
  is_banned: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isImpersonating: boolean;
  originalAdminProfile: UserProfile | null;
  signUp: (email: string, password: string, agencyName: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  impersonateUser: (userId: string) => Promise<{ error: Error | null }>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalAdminProfile, setOriginalAdminProfile] = useState<UserProfile | null>(null);
  const [activeImpersonationId, setActiveImpersonationId] = useState<string | null>(null);
  const skipNextSignInEvent = useRef(false);

  useEffect(() => {
    let mounted = true;
    let loadingTimeoutId: NodeJS.Timeout;

    const setupLoadingTimeout = () => {
      loadingTimeoutId = setTimeout(() => {
        if (mounted) {
          console.error('[Auth] Loading timeout - forcing loading to false');
          setLoading(false);
        }
      }, 8000);
    };

    setupLoadingTimeout();

    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) {
          clearTimeout(loadingTimeoutId);
          return;
        }

        if (error) {
          console.error('[Auth] Session error:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          clearTimeout(loadingTimeoutId);
          return;
        }

        return { session };
      } catch (error) {
        console.error('[Auth] Fatal session error:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        clearTimeout(loadingTimeoutId);
        return { session: null };
      }
    }

    initSession().then(async (result) => {
      if (!result || !mounted) {
        clearTimeout(loadingTimeoutId);
        return;
      }

      const { session } = result;
      if (!session) {
        console.log('[Auth] No active session');
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        clearTimeout(loadingTimeoutId);
        return;
      }

      console.log('[Auth] Session found, loading profile');
      setSession(session);
      setUser(session.user);

      const impersonationMode = localStorage.getItem('impersonation_mode');
      const impersonatedUserId = localStorage.getItem('impersonated_user_id');
      const sessionId = localStorage.getItem('impersonation_session_id');

      if (impersonationMode === 'true' && impersonatedUserId) {
        try {
          const [profileResult, targetUserResult] = await Promise.all([
            supabase.from('users').select('*').eq('id', session.user.id).maybeSingle(),
            supabase.from('users').select('*').eq('id', impersonatedUserId).maybeSingle()
          ]);

          if (!mounted) {
            clearTimeout(loadingTimeoutId);
            return;
          }

          if (profileResult.data?.is_super_admin && targetUserResult.data) {
            console.log('[Auth] Impersonation mode active');
            setOriginalAdminProfile(profileResult.data);
            setProfile({ ...targetUserResult.data, is_super_admin: false });
            setIsImpersonating(true);
            setActiveImpersonationId(sessionId);
            setLoading(false);
            clearTimeout(loadingTimeoutId);
          } else {
            console.log('[Auth] Invalid impersonation, clearing');
            localStorage.removeItem('impersonation_mode');
            localStorage.removeItem('impersonated_user_id');
            localStorage.removeItem('impersonation_session_id');
            await loadProfile(session.user.id);
            clearTimeout(loadingTimeoutId);
          }
        } catch (impersonationError) {
          if (!mounted) {
            clearTimeout(loadingTimeoutId);
            return;
          }
          console.error('[Auth] Impersonation error:', impersonationError);
          localStorage.removeItem('impersonation_mode');
          localStorage.removeItem('impersonated_user_id');
          localStorage.removeItem('impersonation_session_id');
          await loadProfile(session.user.id);
          clearTimeout(loadingTimeoutId);
        }
      } else {
        await loadProfile(session.user.id);
        clearTimeout(loadingTimeoutId);
      }
    }).catch((error) => {
      if (!mounted) {
        clearTimeout(loadingTimeoutId);
        return;
      }
      console.error('[Auth] Fatal auth error:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      clearTimeout(loadingTimeoutId);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('[Auth] Event:', event);

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsImpersonating(false);
        setOriginalAdminProfile(null);
        setActiveImpersonationId(null);
        localStorage.removeItem('impersonation_mode');
        localStorage.removeItem('impersonated_user_id');
        localStorage.removeItem('impersonation_session_id');
        return;
      }

      if (event === 'SIGNED_IN') {
        if (skipNextSignInEvent.current) {
          console.log('[Auth] Skipping SIGNED_IN event (already handled by signIn)');
          skipNextSignInEvent.current = false;
          return;
        }

        console.log('[Auth] Handling SIGNED_IN event from onAuthStateChange');
        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          (async () => {
            const currentImpersonating = localStorage.getItem('impersonation_mode') === 'true';
            if (!currentImpersonating) {
              await loadProfile(session.user.id);
            }
          })();
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string, retries = 2) {
    console.log('[Auth] Loading profile for:', userId);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Error fetching profile:', error);

        if (retries > 0) {
          console.log('[Auth] Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadProfile(userId, retries - 1);
        }

        setLoading(false);
        return;
      }

      if (!data) {
        console.error('[Auth] Profile not found for user:', userId);

        if (retries > 0) {
          console.log('[Auth] Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadProfile(userId, retries - 1);
        }

        setLoading(false);
        return;
      }

      if (data.is_banned) {
        console.log('[Auth] User is banned');
        await supabase.auth.signOut();
        alert('Votre compte a été banni. Contactez l\'administrateur.');
        setProfile(null);
        setUser(null);
        setSession(null);
        setLoading(false);
        return;
      }

      console.log('[Auth] Profile loaded successfully');
      setProfile(data);
      setLoading(false);
    } catch (error) {
      console.error('[Auth] Fatal error loading profile:', error);

      if (retries > 0) {
        console.log('[Auth] Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadProfile(userId, retries - 1);
      }

      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, agencyName: string, firstName: string, lastName: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Échec de la création du compte');

      console.log('Calling complete-signup function for user:', authData.user.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            agencyName,
            firstName,
            lastName,
            userId: authData.user.id,
            email,
          }),
        }
      );

      console.log('Edge function response status:', response.status);
      const result = await response.json();
      console.log('Edge function result:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Erreur lors de la création de l\'agence');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProfile(authData.user.id);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signIn(email: string, password: string) {
    try {
      console.log('[Auth] Starting signIn');
      setLoading(true);
      skipNextSignInEvent.current = true;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        skipNextSignInEvent.current = false;
        throw error;
      }

      if (data.user && data.session) {
        console.log('[Auth] SignIn successful, loading profile directly');
        setSession(data.session);
        setUser(data.user);
        await loadProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('[Auth] SignIn failed:', error);
      setLoading(false);
      skipNextSignInEvent.current = false;
      return { error: error as Error };
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    try {
      if (activeImpersonationId) {
        await supabase
          .from('impersonation_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', activeImpersonationId);
      }

      localStorage.removeItem('impersonation_mode');
      localStorage.removeItem('impersonated_user_id');
      localStorage.removeItem('impersonation_session_id');

      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      await supabase.auth.signOut();
    }
  }

  async function impersonateUser(userId: string) {
    try {
      if (!profile?.is_super_admin) {
        throw new Error('Seuls les super admins peuvent utiliser cette fonction');
      }

      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError || !targetUser) {
        throw new Error('Utilisateur non trouvé');
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('impersonation_sessions')
        .insert({
          super_admin_id: profile.id,
          impersonated_user_id: userId,
          is_active: true,
        })
        .select()
        .maybeSingle();

      if (sessionError) throw sessionError;

      setOriginalAdminProfile(profile);
      setProfile({
        ...targetUser,
        is_super_admin: false
      });
      setIsImpersonating(true);
      setActiveImpersonationId(sessionData?.id || null);

      localStorage.setItem('impersonation_mode', 'true');
      localStorage.setItem('impersonated_user_id', userId);
      localStorage.setItem('impersonated_agency_id', targetUser.agency_id);
      localStorage.setItem('original_admin_id', profile.id);
      if (sessionData?.id) {
        localStorage.setItem('impersonation_session_id', sessionData.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Error impersonating user:', error);
      return { error: error as Error };
    }
  }

  async function stopImpersonation() {
    try {
      if (!isImpersonating || !originalAdminProfile) {
        throw new Error('Aucune session d\'impersonation active');
      }

      if (activeImpersonationId) {
        await supabase
          .from('impersonation_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', activeImpersonationId);
      }

      localStorage.removeItem('impersonation_mode');
      localStorage.removeItem('impersonated_user_id');
      localStorage.removeItem('impersonated_agency_id');
      localStorage.removeItem('original_admin_id');
      localStorage.removeItem('impersonation_session_id');

      setProfile(originalAdminProfile);
      setIsImpersonating(false);
      setOriginalAdminProfile(null);
      setActiveImpersonationId(null);
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isImpersonating,
      originalAdminProfile,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      impersonateUser,
      stopImpersonation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
