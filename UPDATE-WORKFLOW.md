# Atualização rápida do projeto

A partir da v3.3.1c, você não precisa mais abrir pasta por pasta nem usar o GitHub Desktop para cada update.

## Fluxo recomendado

1. Baixe o ZIP `PATCH-ONLY` da atualização.
2. Deixe o ZIP em qualquer pasta do Windows.
3. Na raiz do projeto, dê dois cliques em `GERENCIAR_PROJETO.bat`.
4. Escolha **1 — Aplicar ZIP de update + validar + GitHub + Cloudflare**.
5. Selecione o ZIP.

O gerenciador:

- extrai e mescla os arquivos automaticamente;
- nunca sobrescreve `.git`, `node_modules`, `dist`, `release`, `.env` ou `server/.env`;
- roda `npm install` somente quando necessário;
- executa verificação e testes;
- gera o build local;
- cria o commit e executa `git push`;
- pode executar `wrangler deploy` diretamente no Cloudflare.

## Primeira configuração do Cloudflare local

Execute uma vez:

```powershell
npx wrangler@4 login
```

Depois disso, o gerenciador consegue publicar direto no Worker.

### Recomendado

Quando o deploy local estiver funcionando, desative o deploy automático por Git no Cloudflare. Assim, o `git push` continua atualizando o GitHub, mas o Cloudflare não inicia um segundo build remoto. O deploy passa a ser feito pelo Wrangler depois do build local.

Isso elimina a espera por `Initializing build environment...` na rotina normal de atualização.

## Publicar sem aplicar um novo ZIP

Abra `GERENCIAR_PROJETO.bat` e escolha **2**, ou execute `scripts/windows/PUBLICAR_RAPIDO.bat`.

## Segurança

Se `verify`, testes ou build falharem, o fluxo para antes do deploy. Arquivos de ambiente locais não entram no pacote de atualização.
