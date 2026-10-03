# Battle Spirits: KAIHOU! Simulator

Simulador Web feito por fã para jogar **Battle Spirits** online.

O projeto é sem fins lucrativos e não possui afiliação oficial com a Bandai. Todos os direitos sobre Battle Spirits, nomes, imagens, personagens e cartas pertencem aos respectivos detentores.

## Arquitetura oficial

A partir da v4.8.1, o projeto possui uma única base oficial: **Web + Online**.

- Frontend: React + Vite
- Hospedagem Web: Cloudflare
- Multiplayer: servidor Node.js + Socket.IO separado do frontend
- Conta e recursos cloud: Supabase

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação completa

```bash
npm run project:check
```

## Publicação Web

```bash
npm run publish:cloudflare
```

Para novos sets, consulte `docs/card-database/adding-new-sets.md`.

## Documentation

See `docs/README.md` for the active documentation index and maintenance policy.
