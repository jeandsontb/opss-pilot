# Quickstart Guide: GitHub Pages Deploy & Ativação

**Feature**: `014-deploy-web-pages`  
**Date**: 2026-09-25  
**Spec**: [spec.md](./spec.md)

---

## 1. Teste Local do Build de Produção

Antes de enviar o commit para o GitHub, valide que os artefatos são gerados corretamente sob a base `/opsspilot/`:

```bash
# Na raiz do projeto:
npm run web:build

# Verificar que a pasta dist contém index.html e assets:
ls -la web/dist
```

---

## 2. Configuração no Repositório do GitHub

Para que o GitHub Actions tenha autorização de publicar no GitHub Pages:

1. Acesse o seu repositório no GitHub.
2. Vá em **Settings** ➔ **Pages** (na barra lateral esquerda).
3. Na seção **Build and deployment**:
   - Em **Source**, selecione: **GitHub Actions** (em vez de "Deploy from a branch").
4. A partir desse momento, cada push na branch `main` disparará automaticamente o workflow `.github/workflows/deploy-pages.yml`.

---

## 3. Acesso à Interface Publicada

A URL do War Room no Pages segue a convenção:
```
https://<seu-usuario>.github.io/opss-pilot/
```

Ao abrir a URL:
1. Clique no ícone de engrenagem (⚙️) no cabeçalho.
2. Defina a URL da sua API (ex: `http://localhost:3000` se a API estiver rodando localmente na sua máquina).
3. Clique em **Testar Conexão** para checar o `/health` da API e o suporte a CORS.
4. Salve e utilize o War Room normalmente!
