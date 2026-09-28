# Quickstart Validation Guide: War Room Web OpssPilot

**Feature**: `013-war-room-web`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Pré-Requisitos

1. Node.js 22 LTS instalado.
2. Servidor backend OpssPilot rodando na porta 3000 (`npm run dev`).
3. Módulo `better-sqlite3` compilado e banco `opss_pilot.sqlite` inicializado.

---

## 2. Inicialização do Ambiente

### 2.1 Backend Express
No terminal raiz do projeto:
```bash
npm run dev
# Confirmar log: OpssPilot listening on http://localhost:3000
```

### 2.2 Frontend Vite
No terminal do diretório `web/`:
```bash
cd web
npm install
npm run dev
# Confirmar abertura em http://localhost:5173/opsspilot/
```

---

## 3. Roteiro de Validação Interativa

### Cenário 1: Acesso Inicial e Carregamento sob a Rota Base
1. Abra o navegador em `http://localhost:5173/opsspilot/`.
2. Verifique que a página inicial do War Room carrega com Dark Mode ativo por padrão, tipografia nítida e estado vazio ("Nenhuma mensagem ainda. Como posso ajudar no plantão?").
3. Verifique que não há erros 404 de assets estáticos no console do navegador.

### Cenário 2: Envio de Mensagem e Conversação
1. Digite `"me chame de Thiago e abra um low no auth"` e envie.
2. Observe o indicador de carregamento ativo no botão/input.
3. Ao receber a resposta, valide que o texto é exibido com o nome "Thiago" e o status do incidente.
4. Digite `"qual o meu nome?"` e envie.
5. Verifique que o assistente responde `"Seu nome é Thiago."`, comprovando a preservação do `conversationId`.

### Cenário 3: Inspeção de Raciocínio (Trace Viewer)
1. Na resposta do assistente, clique no botão **"Ver Raciocínio"**.
2. O painel lateral direito desliza suavemente exibindo a linha do tempo dos eventos (`route`, `action`, `observation`, `thought`, `fallback`).
3. Clique em um passo do tipo `action` para inspecionar os argumentos JSON da chamada da ferramenta `open_incident`.
4. Feche o painel via clique no botão `X` ou pressionando `Escape`.

### Cenário 4: Ação Crítica com Cartão de Aprovação (HTTP 202)
1. Simule ou solicite uma ação que requeira autorização de plantão.
2. Ao receber a resposta com status 202, confirme a renderização do `DecisionCard` com botões "Aprovar" e "Negar".
3. Clique em "Aprovar" e observe a confirmação registrada no histórico, com o botão desabilitado para prevenir duplicidade.

### Cenário 5: Configurações de Conectividade (Engrenagem)
1. Clique no ícone de engrenagem no cabeçalho.
2. Altere a URL da API para `http://localhost:3000` (ou clique em "Testar Conexão").
3. Verifique o badge verde de conexão ativa (`HTTP 200 /health OK`).
4. Salve e recarregue a página; certifique-se de que a URL configurada permaneceu salva no `localStorage`.
