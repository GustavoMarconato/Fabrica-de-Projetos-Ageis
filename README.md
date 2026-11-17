# Orion Bioinsumos Dashboard para Vercel

Protótipo acadêmico desenvolvido para a Fábrica de Projetos Ágeis da Unimar. O sistema apresenta condições climáticas e estimativas para a aplicação de bioinsumos.

## Funcionalidades

- leitura automática de uma planilha publicada no Google Planilhas em formato CSV
- atualização dos dados a cada 5 segundos
- indicadores de chuva, temperatura, vento e umidade
- janela de aplicação por horário
- estimativas de área planejada, volume e rendimento
- detalhamento dos indicadores por horário
- assistente virtual sobre o dashboard e a Orion
- login demonstrativo para apresentação
- opção de conectar um arquivo Excel local

## Tecnologias

- TypeScript
- React 19
- Next.js 16
- Vercel Functions
- Tailwind CSS
- Google Planilhas em CSV
- Anthropic API para o assistente

## Como executar no computador

Requisitos:

- Node.js 22.13 ou superior
- npm

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env.local` com sua própria chave da Anthropic, caso queira usar o assistente:

```env
ANTHROPIC_API_KEY=sua_chave_aqui
ANTHROPIC_MODEL=claude-sonnet-5
```

Inicie o projeto:

```bash
npm run dev
```

Abra o endereço informado no terminal. Qualquer usuário e senha preenchidos liberam o login demonstrativo.

## Publicação na Vercel

1. Envie os arquivos desta pasta para um repositório no GitHub.
2. Entre em https://vercel.com e faça login.
3. Clique em Add New e depois em Project.
4. Importe o repositório do GitHub.
5. Confirme Framework Preset como Next.js.
6. Não altere Root Directory, Build Command ou Output Directory.
7. Para usar o assistente, adicione `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL` em Environment Variables.
8. Clique em Deploy.

O painel, a planilha e o login demonstrativo funcionam sem a chave. Somente o assistente fica indisponível.

Depois de cada envio para a branch principal no GitHub, a Vercel cria uma nova versão automaticamente.

## Integração com a planilha

A rota `/api/excel-live` fica em `app/api/excel-live/route.ts`. Ela é uma Vercel Function do Next.js. A rota busca o CSV publicado no Google Planilhas e o entrega para o dashboard. A tela consulta essa rota a cada 5 segundos e recalcula os indicadores quando identifica uma alteração.

O arquivo `public/Orion_Base_Dashboard.xlsx` é a base Excel disponível para download e uso local.

## Parâmetros acadêmicos

Os valores abaixo são hipóteses de simulação e não representam telemetria oficial de uma máquina da Orion:

- rendimento de referência de 9,6 hectares por hora
- dose de referência de 40 litros por hectare
- pontuação de 100 para condição favorável, 60 para atenção e 0 para evitar

## Segurança

Nunca envie uma chave de API para o GitHub. Os arquivos `.env` estão ignorados pelo Git. Configure a chave em Settings e Environment Variables dentro do projeto na Vercel.

## Grupo

- André Maciel
- Murilo Boy
- Caio Marconato
- Gustavo Marconato
- Lucas Silva
- Carlos Alberto
