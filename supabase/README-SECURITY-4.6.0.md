# SECURITY 4.6.0

Execute `SECURITY-4.6.0.sql` no SQL Editor do Supabase **depois** das migrations de Economy 4.3.0 e Social/Ranked.

Esta migration reforça o princípio **Never Trust the Client**:

- carteira, coleção, ledger, receitas e progresso ficam isolados por `auth.uid()`;
- cliente autenticado não recebe permissões diretas de `INSERT/UPDATE/DELETE` nas tabelas críticas de economia;
- compras, craft e administração continuam passando por RPCs `SECURITY DEFINER` e usam a identidade autenticada do Supabase;
- `bs_admin_has_access()` deriva o admin do usuário autenticado, nunca de uma flag enviada pelo frontend;
- settlement Ranked continua executável apenas por `service_role` no backend;
- credenciais de `auth.users` não são expostas ao frontend.

Perfis sociais públicos não são tratados como dados privados: nome público, avatar e demais campos sociais continuam obedecendo as regras de visibilidade do Social Hub.

## Mudança importante no Guest Mode

Por segurança, a criação de conta não importa mais saldos, cartas ou recipes enviados pelo armazenamento local do Guest Mode. Esses valores eram controlados pelo cliente e poderiam ser falsificados. A conta autenticada recebe apenas o bônus fixo de 1500 SC + 1500 CC e faz a escolha dos Starter Decks pelo fluxo validado no banco.

## Crafting

O parâmetro de raridade enviado pelo frontend deixou de ser autoritativo. O custo agora usa `bs_card_security_catalog`, preenchido a partir do catálogo da Shop no banco. Cartas que não existirem nesse catálogo são rejeitadas pelo crafting até serem cadastradas corretamente.
