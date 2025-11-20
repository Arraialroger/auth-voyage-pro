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

    // Validação server-side robusta
    if (!email || !password || !full_name) {
      console.error('Dados incompletos fornecidos');
      return new Response(
        JSON.stringify({ error: 'Dados incompletos. Forneça email, password e full_name.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitizar e normalizar dados
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = full_name.trim().replace(/\s+/g, ' ');

    // Validações de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      console.error('Email inválido fornecido:', sanitizedEmail);
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de comprimento
    if (sanitizedEmail.length > 255) {
      console.error('Email muito longo:', sanitizedEmail.length);
      return new Response(
        JSON.stringify({ error: 'Email deve ter no máximo 255 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sanitizedFullName.length < 3 || sanitizedFullName.length > 100) {
      console.error('Nome inválido - comprimento:', sanitizedFullName.length);
      return new Response(
        JSON.stringify({ error: 'Nome deve ter entre 3 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8 || password.length > 72) {
      console.error('Senha com comprimento inválido');
      return new Response(
        JSON.stringify({ error: 'Senha deve ter entre 8 e 72 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de complexidade da senha
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      console.error('Senha não atende aos requisitos de complexidade');
      return new Response(
        JSON.stringify({ error: 'Senha deve conter letras maiúsculas, minúsculas e números' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validação de caracteres no nome
    const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
    if (!nameRegex.test(sanitizedFullName)) {
      console.error('Nome contém caracteres inválidos');
      return new Response(
        JSON.stringify({ error: 'Nome deve conter apenas letras, espaços, hífens e apóstrofos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se nome tem pelo menos 2 palavras (nome e sobrenome)
    if (sanitizedFullName.split(' ').length < 2) {
      console.error('Nome incompleto - faltando sobrenome');
      return new Response(
        JSON.stringify({ error: 'Por favor, informe o nome completo (nome e sobrenome)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Iniciando criação de recepcionista: ${sanitizedEmail}`);

    // Create user in Auth with service client using sanitized data
    const { data: newUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: sanitizedFullName,
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

    console.log('Recepcionista criado com sucesso:', sanitizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true,
        receptionist: {
          id: staffRecord.id,
          email: newUser.user.email,
          full_name: sanitizedFullName,
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
