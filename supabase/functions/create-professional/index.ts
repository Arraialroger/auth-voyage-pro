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
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is a receptionist
    const { data: staffProfile, error: staffError } = await anonClient
      .from('staff_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (staffError || staffProfile?.role !== 'receptionist') {
      console.error('User is not a receptionist:', staffError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas recepcionistas podem criar profissionais.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { full_name, specialization, email, password } = await req.json();

    // Validate payload
    if (!full_name || !specialization || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos. Forneça full_name, specialization, email e password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating professional:', { full_name, specialization, email });

    // Create user in Auth with service client
    const { data: newUser, error: createUserError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !newUser.user) {
      console.error('Error creating auth user:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError?.message || 'Desconhecido'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user created:', newUser.user.id);

    // Insert professional record with service client
    const { data: professional, error: insertError } = await serviceClient
      .from('professionals')
      .insert({
        user_id: newUser.user.id,
        full_name,
        specialization,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting professional:', insertError);
      // Rollback: delete the auth user
      await serviceClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar profissional: ${insertError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Professional created successfully:', professional);

    return new Response(
      JSON.stringify({ professional }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
