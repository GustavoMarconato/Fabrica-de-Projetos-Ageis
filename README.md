# Orion Bioinsumos Dashboard

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
- Next.js e Vinext
- Vite
- Cloudflare Workers
- Tailwind CSS
- Google Planilhas em CSV
- Anthropic API para o assistente

## Como executar

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

O dashboard funciona sem a chave da Anthropic. Nesse caso, apenas o assistente virtual fica indisponível.

## Integração com a planilha

A rota `/api/excel-live` fica em `worker/index.ts`. Ela busca o CSV publicado no Google Planilhas e o entrega para o dashboard. A tela consulta essa rota a cada 5 segundos e recalcula os indicadores quando identifica uma alteração.

O arquivo `public/Orion_Base_Dashboard.xlsx` é a base Excel disponível para download e uso local.

## Parâmetros acadêmicos

Os valores abaixo são hipóteses de simulação e não representam telemetria oficial de uma máquina da Orion:

- rendimento de referência de 9,6 hectares por hora
- dose de referência de 40 litros por hectare
- pontuação de 100 para condição favorável, 60 para atenção e 0 para evitar

## Segurança

Não envie chaves de API para o GitHub. Os arquivos `.env` estão ignorados pelo Git. Configure as variáveis diretamente no serviço de hospedagem usado.

## Grupo

- André Maciel
- Murilo Boy
- Caio Marconato
- Gustavo Marconato
- Lucas Silva
- Carlos Alberto

