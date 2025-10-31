import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Logout realizado",
            description: "Você foi desconectado com sucesso.",
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      let errorMessage = "Erro ao fazer login";
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = "Email ou senha incorretos";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Por favor, confirme seu email antes de fazer login";
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde";
      }
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      let errorMessage = "Erro ao criar conta";
      if (error.message.includes('User already registered')) {
        errorMessage = "Este email já está cadastrado";
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = "A senha deve ter pelo menos 6 caracteres";
      } else if (error.message.includes('Invalid email')) {
        errorMessage = "Email inválido";
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta.",
      });
    }

    return { error };
  };

  const signOut = async () => {
    try {
      setIsSigningOut(true);
      
      // Limpar estado local PRIMEIRO
      setSession(null);
      setUser(null);
      
      // Tentar fazer logout apenas localmente para evitar erros de sessão
      await supabase.auth.signOut({ scope: 'local' });
      
      // Limpar localStorage manualmente como fallback
      localStorage.removeItem('sb-bacwlstdjceottxccrap-auth-token');
      
      // Pequeno delay para garantir propagação do estado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Sempre redirecionar para login
      window.location.href = '/login';
    } catch (error) {
      // Em caso de qualquer erro, ainda assim limpar e redirecionar
      setSession(null);
      setUser(null);
      localStorage.clear();
      window.location.href = '/login';
    } finally {
      setIsSigningOut(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};