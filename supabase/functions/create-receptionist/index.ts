import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client using the caller's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Tentativa de criação de recepcionista sem autorização');
      return new Response(
        JSON.stringify({ error: 'Autorização necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client with service role privileges
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user making the request
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      console.error('Erro ao obter usuário autenticado:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Usuário ${user.email} tentando criar recepcionista`);

    // Verify caller is a receptionist
    const { data: staffProfile, error: staffError } = await anonClient
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (staffError || staffProfile?.role !== 'receptionist') {
      console.error('Acesso negado - usuário não é recepcionista:', user.email);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas recepcionistas podem criar outros recepcionistas.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { email, password, full_name } = await req.json();

    // Validate payload
    if (!email || !password) {
      console.error('Dados incompletos fornecidos');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos. Forneça email e password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Iniciando criação de recepcionista: ${email}`);

    // Create user in Auth with service client
    const { data: newUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || email,
      }
    });

    if (createUserError || !newUser.user) {
      console.error('Erro ao criar usuário na autenticação:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError?.message || 'Desconhecido'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário de autenticação criado com sucesso:', newUser.user.id);

    // Insert staff profile record with service client
    const { data: staffRecord, error: insertError } = await serviceClient
      .from('staff_profiles')
      .insert({
        user_id: newUser.user.id,
        role: 'receptionist',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir registro de staff_profiles:', insertError);
      // Rollback: delete the auth user
      await serviceClient.auth.admin.deleteUser(newUser.user.id);
      console.log('Usuário de autenticação removido (rollback)');
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil de recepcionista: ${insertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recepcionista criado com sucesso:', email);

    return new Response(
      JSON.stringify({ 
        success: true,
        receptionist: {
          id: staffRecord.id,
          email: newUser.user.email,
          full_name: full_name || email,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro inesperado no servidor:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
