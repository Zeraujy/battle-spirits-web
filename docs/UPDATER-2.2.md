# Atualizador 2.2

## Como funciona

O `Battle Spirits Updater.exe` consulta um arquivo JSON público, por exemplo:

```text
https://seu-dominio.com/battle-spirits/latest.json
```

Exemplo do manifesto:

```json
{
  "version": "2.3.0",
  "installerUrl": "Battle-Spirits-Setup-2.3.0.exe",
  "sha256": "HASH_SHA256_DO_INSTALADOR",
  "notes": [
    "Nova mecânica",
    "Correções do online"
  ]
}
```

`installerUrl` pode ser relativo ao endereço do `latest.json` ou uma URL absoluta.

## Configuração

Há duas maneiras:

1. Dentro do jogo: **Configurações > Servidor de atualizações**.
2. Antes do build: edite `config/update-config.json`.

A configuração salva dentro do jogo tem prioridade e fica junto dos dados do jogador.

## Gerando uma versão nova

Atualize `version` no `package.json` e execute:

```bat
GERAR_INSTALADOR_WINDOWS.bat
```

Ao final, `release/` conterá o instalador e `latest.json`.

Se definir a variável abaixo antes do build, o manifesto usará uma URL absoluta para o instalador:

```bat
set UPDATE_BASE_URL=https://seu-dominio.com/battle-spirits
```

Depois publique na mesma hospedagem:

- `latest.json`
- `Battle-Spirits-Setup-X.Y.Z.exe`

## Importante

O updater não elimina a necessidade de uma hospedagem pública para distribuir os arquivos da atualização. A versão 2.2 deixa toda a infraestrutura do cliente pronta, mas você ainda precisa escolher onde hospedar `latest.json` e os instaladores.
