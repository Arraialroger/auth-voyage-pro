# Guia de Administração - Sistema Arraial Odonto

## 📋 Índice
- [Como Cadastrar Novo Recepcionista](#como-cadastrar-novo-recepcionista)
- [Como Cadastrar Novo Profissional](#como-cadastrar-novo-profissional)
- [Estrutura de Permissões](#estrutura-de-permissões)
- [Solução de Problemas](#solução-de-problemas)

---

## 🔐 Como Cadastrar Novo Recepcionista

**IMPORTANTE:** Recepcionistas precisam ser criados manualmente via Supabase Dashboard por questões de segurança.

### Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/bacwlstdjceottxccrap
2. Faça login com suas credenciais de administrador

### Passo 2: Criar Usuário no Authentication

1. No menu lateral, vá em **Authentication** → **Users**
2. Clique no botão **"Add user"** (ou "Invite")
3. Preencha os dados:
   - **Email:** email@exemplo.com
   - **Password:** senha segura (mínimo 6 caracteres)
   - **Auto Confirm User:** ✅ Marcar (para não precisar confirmar email)
4. Clique em **"Create user"** ou **"Send invitation"**
5. **IMPORTANTE:** Copie o **User ID** (UUID) que aparecerá na lista de usuários

### Passo 3: Adicionar Registro em staff_profiles

1. No menu lateral, vá em **SQL Editor**
2. Clique em **"New query"**
3. Cole o seguinte SQL (substituindo os valores):

```sql
INSERT INTO public.staff_profiles (user_id, role)
VALUES (
  'COLE_AQUI_O_USER_ID_COPIADO',  -- UUID do usuário criado no passo anterior
  'receptionist'                    -- Sempre 'receptionist' para recepcionistas
);
```

**Exemplo prático:**
```sql
INSERT INTO public.staff_profiles (user_id, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'receptionist'
);
```

4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
5. Verifique se apareceu a mensagem de sucesso: **"Success. No rows returned"**

### Passo 4: Verificar se Funcionou

1. Faça logout do sistema
2. Faça login com o email e senha do novo recepcionista
3. Verifique se:
   - ✅ Consegue acessar o painel de administração
   - ✅ Vê todos os cards administrativos
   - ✅ Consegue criar/editar pacientes, profissionais, agendamentos, etc.

---

## 👨‍⚕️ Como Cadastrar Novo Profissional

**Profissionais podem ser cadastrados diretamente pelo sistema:**

1. Faça login como recepcionista
2. Vá em **"Administração"** → **"Gerenciar Profissionais"**
3. Clique em **"Novo Profissional"**
4. Preencha:
   - Nome completo
   - Email
   - Senha
   - Especialização
5. Clique em **"Salvar"**

✅ **Automático:** O sistema cria o usuário em Authentication E adiciona na tabela `professionals`

---

## 🔒 Estrutura de Permissões

### Recepcionista (Staff)
- ✅ **Acesso total** ao sistema
- ✅ Criar/editar/deletar: pacientes, profissionais, tratamentos, agendamentos
- ✅ Gerenciar finanças (pagamentos, despesas, metas)
- ✅ Gerenciar lista de espera
- ⚠️ **Criação manual** via Supabase Dashboard

### Profissional
- ✅ Ver **apenas seus próprios** agendamentos
- ✅ Ver **apenas sua própria** lista de espera
- ✅ Ver pacientes e tratamentos (leitura)
- ✅ Ver transações financeiras dos **seus agendamentos**
- ❌ **Não pode** criar/editar outros profissionais
- ❌ **Não pode** gerenciar finanças globais
- ✅ **Criação pelo sistema** (via interface)

### Tabelas no Banco de Dados

```
auth.users (Supabase Auth)
    ↓
    ├── staff_profiles (Recepcionistas)
    │   └── role: 'receptionist'
    │
    └── professionals (Profissionais)
        └── specialization: 'dentist' | 'assistant' | 'orthodontist'
```

---

## 🐛 Solução de Problemas

### Problema: Recepcionista não consegue acessar o sistema

**Verificar:**

1. **Usuário existe em Authentication?**
   - Vá em Authentication → Users
   - Procure pelo email

2. **Registro existe em staff_profiles?**
   ```sql
   SELECT * FROM public.staff_profiles 
   WHERE user_id = 'COLE_USER_ID_AQUI';
   ```

3. **Role está correto?**
   ```sql
   SELECT user_id, role FROM public.staff_profiles;
   ```
   - Deve retornar: `role = 'receptionist'`

### Problema: Recepcionista vê erro "Forbidden" ou "Unauthorized"

**Solução:**
- Verifique se o `user_id` em `staff_profiles` corresponde ao `id` em `auth.users`
- Execute:
   ```sql
   SELECT sp.id, sp.user_id, sp.role, au.email
   FROM public.staff_profiles sp
   LEFT JOIN auth.users au ON au.id = sp.user_id;
   ```
- Se `email` estiver NULL, o `user_id` está errado

### Problema: Profissional foi criado mas não consegue logar

**Solução:**
- Verifique se o usuário foi criado em Authentication
- Execute:
   ```sql
   SELECT p.id, p.full_name, p.user_id, au.email
   FROM public.professionals p
   LEFT JOIN auth.users au ON au.id = p.user_id;
   ```
- Se `email` estiver NULL, recrie o profissional pelo sistema

---

## 📊 Queries Úteis

### Listar todos os recepcionistas
```sql
SELECT 
  sp.id,
  sp.role,
  au.email,
  au.created_at
FROM public.staff_profiles sp
JOIN auth.users au ON au.id = sp.user_id
WHERE sp.role = 'receptionist';
```

### Listar todos os profissionais
```sql
SELECT 
  p.id,
  p.full_name,
  p.specialization,
  au.email,
  p.created_at
FROM public.professionals p
JOIN auth.users au ON au.id = p.user_id;
```

### Verificar permissões de um usuário específico
```sql
-- Substituir 'email@exemplo.com' pelo email real
SELECT 
  au.id as user_id,
  au.email,
  CASE 
    WHEN sp.role = 'receptionist' THEN 'Recepcionista'
    WHEN p.specialization IS NOT NULL THEN 'Profissional (' || p.specialization || ')'
    ELSE 'Sem permissão'
  END as tipo_usuario
FROM auth.users au
LEFT JOIN public.staff_profiles sp ON sp.user_id = au.id
LEFT JOIN public.professionals p ON p.user_id = au.id
WHERE au.email = 'email@exemplo.com';
```

---

## 🔗 Links Úteis

- **SQL Editor:** https://supabase.com/dashboard/project/bacwlstdjceottxccrap/sql/new
- **Authentication Users:** https://supabase.com/dashboard/project/bacwlstdjceottxccrap/auth/users
- **Table Editor (staff_profiles):** https://supabase.com/dashboard/project/bacwlstdjceottxccrap/editor

---

## ⚠️ Avisos de Segurança

1. **Nunca compartilhe** o link do Supabase Dashboard com usuários finais
2. **Sempre use senhas fortes** (mínimo 12 caracteres, letras + números + símbolos)
3. **Não delete** usuários diretamente do Authentication sem antes deletar os registros em `staff_profiles` ou `professionals`
4. **Faça backup** antes de executar queries de DELETE ou UPDATE

---

## 🏗️ Decisões de Arquitetura

### Tabela n8n_chat_histories (Removida)

**Data:** 2025-01-XX  
**Decisão:** Tabela removida do banco de dados  
**Motivo:** 
- Não estava sendo utilizada no código da aplicação
- Seguindo princípio YAGNI (You Ain't Gonna Need It)
- Redução de superfície de ataque de segurança
- Simplificação da arquitetura

**Impacto:** Nenhum - tabela não estava em uso  
**Reversibilidade:** 100% - pode ser recriada quando funcionalidades de IA forem implementadas  
**Quando Recriar:** Apenas quando features de IA (WhatsApp AI Assistant, Chat Inteligente) forem desenvolvidas

---

## 📝 Histórico de Versões

| Data | Versão | Alterações |
|------|--------|------------|
| 2025-01-XX | 1.0 | Criação inicial do guia |

---

**Dúvidas?** Consulte a documentação do Supabase: https://supabase.com/docs
