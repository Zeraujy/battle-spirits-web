# Battle Spirits Eternal Simulator — Economy/Admin 4.3.0

Execute `ECONOMY-4.3.0.sql` after the 4.2.x economy migrations.

## Initial admin activation
The Admin Panel is server-authorized. It does **not** use a client-side admin flag.

In the Supabase SQL editor, add the account UUID that should be the owner:

```sql
insert into public.bs_admin_users(user_id, role)
values ('YOUR_AUTH_USER_UUID'::uuid, 'owner')
on conflict (user_id) do update set role='owner';
```

The panel exposes only public profile identity, gameplay status and the two in-game currencies. It does not expose passwords, auth tokens or private e-mail data.

## Crafting
Crafting prices are rarity-based and copies after the first receive a 25% collection discount. The global ownership cap remains 6 copies.
