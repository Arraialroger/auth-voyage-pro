import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')!

    // Cliente com token do usuário (para validação)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Cliente admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Valida usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Usuário ${user.email} solicitando lista de recepcionistas`)

    // Verifica se o usuário é recepcionista
    const { data: staffProfile, error: staffError } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (staffError || staffProfile?.role !== 'receptionist') {
      console.error('Usuário não é recepcionista:', staffError)
      return new Response(
        JSON.stringify({ error: 'Apenas recepcionistas podem listar recepcionistas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca todos os staff_profiles com role='receptionist'
    const { data: receptionists, error: receptListError } = await supabaseAdmin
      .from('staff_profiles')
      .select('id, user_id, role')
      .eq('role', 'receptionist')

    if (receptListError) {
      console.error('Erro ao buscar recepcionistas:', receptListError)
      throw receptListError
    }

    console.log(`Encontrados ${receptionists?.length || 0} recepcionistas`)

    // Filtra apenas recepcionistas com user_id válido
    const validReceptionists = (receptionists || []).filter(r => r.user_id !== null)
    console.log(`Recepcionistas válidos (com user_id): ${validReceptionists.length}`)

    // Para cada recepcionista, busca dados do auth.users
    const receptionistsWithDetails = await Promise.all(
      validReceptionists.map(async (recept) => {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recept.user_id)
        return {
          id: recept.user_id,
          email: authUser.user?.email || '',
          full_name: authUser.user?.user_metadata?.full_name || authUser.user?.email || '',
          created_at: authUser.user?.created_at || new Date().toISOString(),
        }
      })
    )

    console.log('Recepcionistas carregados com sucesso')

    return new Response(
      JSON.stringify({ receptionists: receptionistsWithDetails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro ao listar recepcionistas:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
