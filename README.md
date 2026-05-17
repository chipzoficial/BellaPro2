# BellaPro

BellaPro é um microSaaS multiempresa para agendamento e gestão de salões de beleza, esmalterias, barbearias, clínicas de estética e profissionais autônomos.

Esta primeira versão entrega uma base web profissional, responsiva e pronta para evoluir para PWA, login social, cobrança por assinatura e app mobile no futuro.

## Stack

- Next.js 16 com App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui com componentes no código-fonte
- Zod
- React Hook Form
- date-fns
- bcryptjs para hash de senha

## Regras de rotas

- `/` exibe o login do sistema
- `/login` redireciona para `/`
- `/criar-conta` cria o primeiro usuário e o primeiro salão
- `/register` redireciona para `/criar-conta`
- `/app` é o painel autenticado
- `/app/agenda`, `/app/agendamentos`, `/app/clientes`, `/app/profissionais`, `/app/servicos`, `/app/financeiro`, `/app/configuracoes`, `/app/perfil` compõem o painel principal
- `/admin`, `/admin/saloes`, `/admin/usuarios`, `/admin/planos` ficam reservadas para a área global
- `/[slug]` é o link público de agendamento do salão

## Multiempresa

- A entidade principal do banco é `Organization`
- A interface sempre trata `Organization` como “salão”
- Todo dado operacional pertence a uma organização
- O vínculo entre usuário e salão é feito por `Membership`
- A organização atual é resolvida no servidor a partir da sessão, nunca confiando em `organizationId` vindo do client

## Autenticação

- Login por credenciais
- Sessão em cookie HTTP-only assinado com `jose`
- Hash de senha com `bcryptjs`
- Estrutura preparada para login com Google futuramente
- Proxy do Next protegendo `/app`, `/admin` e seleção de salão
- Validação de permissões também no servidor

## Design

- Base clara, neutra e premium
- Layout responsivo em desktop, tablet e celular
- Shell autenticado com sidebar no desktop e navegação móvel por sheet
- Evita “card dentro de card”; cards aparecem apenas onde agregam valor real, como métricas e blocos independentes

## Funcionalidades entregues

- Login na raiz `/`
- Cadastro inicial em `/criar-conta`
- Seleção de salão para usuários com múltiplas memberships
- Dashboard com métricas, agenda de hoje e próximos agendamentos
- Agenda diária
- Gestão de agendamentos
- Gestão de clientes
- Gestão de profissionais
- Gestão de serviços
- Financeiro inicial
- Configurações do salão com link público visível
- Perfil do usuário com alteração de senha
- Página pública por slug com fluxo de agendamento
- Seed de desenvolvimento

## Estrutura de pastas

```text
src/
  app/
    page.tsx
    criar-conta/
    selecionar-salao/
    app/
    admin/
    [slug]/
  components/
    app/
    auth/
    agenda/
    dashboard/
    layout/
    public-booking/
    shared/
    ui/
  lib/
    auth/
    availability.ts
    db.ts
    permissions.ts
    slug.ts
    validations/
  server/
    actions/
    queries/
  types/
prisma/
  schema.prisma
  seed.ts
```

## Como rodar

1. Instale as dependências:

```bash
npm install
```

2. Configure o ambiente:

```bash
cp .env.example .env
```

Preencha pelo menos:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="uma-chave-segura"
APP_URL="https://bellapro.kadoshlabs.app.br"
```

3. Gere o client do Prisma:

```bash
npx prisma generate
```

4. Rode a migration do banco:

```bash
npx prisma migrate dev --name init
```

5. Popule com dados de desenvolvimento:

```bash
npm run prisma:seed
```

6. Inicie em desenvolvimento:

```bash
npm run dev
```

## Usuário de teste

- E-mail: `owner@bellapro.local`
- Senha: `12345678`
- Slug público: `/meu-salao`

## Link público por slug

Cada salão possui um slug único e reservado para o agendamento público. Exemplo:

```text
https://bellapro.kadoshlabs.app.br/meu-salao
```

Na rota `/app/configuracoes`, o sistema mostra o link público completo com ações para copiar e abrir a página.

## Decisões técnicas

- `Organization` no banco e “salão” na interface
- Sessão própria por cookie assinado para manter a base simples no MVP
- Helpers de organização atual e permissões no servidor
- Função central em `src/lib/availability.ts` para calcular horários disponíveis
- Estrutura já preparada para evolução de PWA, login social e cobrança recorrente

## Observações

- O projeto usa UTF-8 para novos arquivos
- Não há implementação de pagamentos reais nesta fase
- A base está pensada para deploy em Coolify
- A interface evita o anti-pattern de “card dentro de card”
