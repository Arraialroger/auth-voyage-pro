import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface UserProfile {
  type: 'receptionist' | 'professional' | null;
  professionalId?: string;
  loading: boolean;
}

export const useUserProfile = (): UserProfile => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({ type: null, loading: true });

  useEffect(() => {
    if (!user) {
      setProfile({ type: null, loading: false });
      return;
    }

    const fetchUserProfile = async () => {
      try {
        // Verificar se é recepcionista
        const { data: staffData } = await supabase
          .from('staff_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (staffData?.role === 'receptionist') {
          setProfile({ type: 'receptionist', loading: false });
          return;
        }

        // Verificar se é profissional
        const { data: professionalData } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (professionalData) {
          setProfile({ 
            type: 'professional', 
            professionalId: professionalData.id,
            loading: false 
          });
          return;
        }

        setProfile({ type: null, loading: false });
      } catch (error) {
        logger.error('Erro ao buscar perfil do usuário:', error);
        setProfile({ type: null, loading: false });
      }
    };

    fetchUserProfile();
  }, [user]);

  return profile;
};