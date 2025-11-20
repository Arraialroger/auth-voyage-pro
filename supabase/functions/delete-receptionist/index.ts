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

    // Verifica se o usuário é recepcionista
    const { data: staffProfile, error: staffError } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (staffError || staffProfile?.role !== 'receptionist') {
      console.error('Usuário não é recepcionista:', staffError)
      return new Response(
        JSON.stringify({ error: 'Apenas recepcionistas podem deletar recepcionistas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse body
    const { receptionist_id } = await req.json()

    if (!receptionist_id) {
      return new Response(
        JSON.stringify({ error: 'receptionist_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Usuário ${user.email} deletando recepcionista: ${receptionist_id}`)

    // Deleta o usuário usando admin
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(receptionist_id)

    if (deleteError) {
      console.error('Erro ao deletar usuário:', deleteError)
      throw deleteError
    }

    console.log(`Recepcionista ${receptionist_id} deletado com sucesso`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro ao deletar recepcionista:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
