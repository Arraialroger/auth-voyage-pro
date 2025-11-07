# Guia de Otimização - Fase 3

## 📦 Otimização de Assets

### Imagens PNG para Comprimir/Converter

#### Logos (podem ser convertidos para WebP)
- `public/assets/arraial-odonto-logo.png`
- `public/assets/new-arraial-odonto-logo.png`
- `public/assets/new-logo.png`

#### Ícones PWA (manter como PNG)
- `public/icons/apple-touch-icon.png`
- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512-maskable.png`
- `public/icons/icon-512x512.png`

### Ferramentas Recomendadas

#### Online (Gratuitas)
1. **Squoosh** (https://squoosh.app/)
   - Suporta PNG → WebP
   - Compressão avançada
   - Comparação lado a lado

2. **TinyPNG** (https://tinypng.com/)
   - Compressão PNG otimizada
   - Até 20 imagens por vez

#### CLI (para automação)
```bash
# Instalar ImageMagick
brew install imagemagick  # macOS
sudo apt install imagemagick  # Linux

# Converter PNG para WebP
convert input.png -quality 85 output.webp

# Comprimir PNG
pngquant input.png --quality 65-80 --output output.png
```

### Processo de Otimização

1. **Logos** (converter para WebP com fallback PNG):
   ```bash
   # Criar versões WebP
   convert public/assets/new-logo.png -quality 85 public/assets/new-logo.webp
   
   # Comprimir PNG original como fallback
   pngquant public/assets/new-logo.png --quality 65-80 --force
   ```

2. **Ícones PWA** (apenas comprimir):
   ```bash
   # Comprimir mantendo qualidade alta
   pngquant public/icons/*.png --quality 80-95 --force
   ```

### Implementação no Código

O código já está preparado para usar imagens diretas. Para WebP com fallback:

```tsx
<picture>
  <source srcSet="/assets/new-logo.webp" type="image/webp" />
  <img src="/assets/new-logo.png" alt="Arraial Odonto" />
</picture>
```

## ✅ Checklist de Testes Finais

### 1. Segurança (RLS)
- [ ] Login como recepcionista - acesso a todos os pacientes
- [ ] Login como profissional - acesso apenas aos seus pacientes
- [ ] Verificar logs de console (sem erros de permissão)
- [ ] Testar criação de documentos (apenas para pacientes permitidos)

### 2. Funcionalidades Core
- [ ] Criar novo agendamento
- [ ] Editar agendamento existente
- [ ] Cancelar agendamento
- [ ] Bloquear horário na agenda
- [ ] Adicionar paciente à lista de espera
- [ ] Gerenciar lista de espera

### 3. Gestão de Pacientes
- [ ] Criar novo paciente
- [ ] Editar dados do paciente
- [ ] Visualizar histórico de consultas
- [ ] Upload de documentos
- [ ] Visualizar documentos anexados

### 4. Administração
- [ ] Gerenciar profissionais
- [ ] Gerenciar tratamentos
- [ ] Configurar horários de atendimento
- [ ] Dashboard com estatísticas

### 5. PWA & Performance
- [ ] Instalar app no dispositivo móvel
- [ ] Funcionalidade offline (Service Worker)
- [ ] Sincronização ao retornar online
- [ ] Indicador de status online/offline
- [ ] Tempo de carregamento < 3s

### 6. Responsividade
- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)
- [ ] Orientação landscape em mobile

### 7. Notificações
- [ ] Lembrete de consulta (teste manual)
- [ ] Notificações em tempo real
- [ ] Sincronização entre abas

### 8. Logs & Debugging
- [ ] Sem `console.log` em produção
- [ ] Apenas `logger` usado
- [ ] Sem comentários de debug
- [ ] Sem warnings no console

## 🚀 Build de Produção

### Verificar tamanho do bundle
```bash
npm run build
```

### Metas de Performance
- **JS Bundle**: < 500KB (gzipped)
- **CSS Bundle**: < 100KB (gzipped)
- **Imagens otimizadas**: redução de 40-60%
- **Total Assets**: < 2MB

### Análise de Bundle
Usar Vite Bundle Visualizer:
```bash
npm install -D rollup-plugin-visualizer
```

Adicionar em `vite.config.ts`:
```ts
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  // ... outros plugins
  visualizer({ open: true, gzipSize: true })
]
```

## 📊 Métricas Esperadas

### Lighthouse Score (Meta)
- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 95
- **SEO**: > 90
- **PWA**: 100

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## 🔒 Segurança Final

### Checklist
- [x] RLS policies implementadas
- [x] Validação de inputs (Zod)
- [x] Sanitização de dados
- [x] HTTPS em produção
- [ ] Rate limiting (considerar implementar)
- [ ] CORS configurado corretamente

## 📝 Próximos Passos

1. Comprimir/converter imagens usando ferramentas recomendadas
2. Executar todos os testes do checklist
3. Gerar build de produção
4. Analisar bundle size
5. Executar Lighthouse audit
6. Deploy para produção
