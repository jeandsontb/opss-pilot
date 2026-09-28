# Contrato HTTP de Indisponibilidade

Quando todas as tentativas dos modelos configurados falham, `POST /chat`
responde:

- status `503`;
- corpo JSON validado;
- mensagem genérica de indisponibilidade do modelo;
- nenhum prompt, cabeçalho, token ou credencial do provedor.

Falhas de entrada, estratégia desconhecida e erros não classificados como
indisponibilidade mantêm seus contratos existentes.
