# Online v3 — guia rápido

O Online está dividido em **configuração**, **cliente** e **servidor**. O arquivo que você deve editar normalmente é `public/config/online-config.js`.

Para trocar Tailscale/Funnel/Render/VPS por outro endereço, execute `CONFIGURAR-ONLINE.bat`, cole a nova URL HTTPS e confirme. Se `dist` já existir, o configurador também atualiza a cópia em `dist/config/online-config.js`, evitando um novo build apenas para uma troca local da URL.

Para hospedar o servidor no seu próprio PC, execute `INICIAR-ONLINE.bat`. `server/.env` controla a porta e o host; o padrão v3 é `HOST=0.0.0.0` e `PORT=3001`, permitindo que outros dispositivos da mesma rede alcancem o processo pelo IP do PC host. Um site HTTPS hospedado no Cloudflare, entretanto, deve preferir um endpoint HTTPS/WSS público para evitar bloqueios de conteúdo misto do navegador.

Use `TESTAR-ONLINE.bat` para consultar a rota `/health`. Uma resposta com `ok: true` confirma que o endereço configurado está respondendo ao protocolo HTTP; depois disso, a tela Online valida a conexão Socket.IO normalmente.
