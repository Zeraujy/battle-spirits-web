import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getProfile
} from "../services/storage.js";

import {
  accountsEnabled,
  supabase
} from "../services/supabase.js";

import {
  getAccountSession,
  loadCloudProfile,
  loadDecksFromCloud,
  signIn,
  signOut,
  signUp,
  syncDecksToCloud,
  syncProfileToCloud
} from "../services/socialService.js";

import {
  useLanguage
} from "../i18n.jsx";

import "../styles/account.css";


function getInitials(value) {
  const parts =
    String(
      value ||
      "Battle Spirits"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "BS";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}


function SyncAction({
  eyebrow,
  title,
  description,
  icon,
  disabled,
  onClick
}) {
  return (
    <button
      type="button"
      className="account-sync-action"
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className="account-sync-icon"
        aria-hidden="true"
      >
        {icon}
      </span>

      <span className="account-sync-copy">
        <small>
          {eyebrow}
        </small>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </span>

      <b aria-hidden="true">
        →
      </b>
    </button>
  );
}


export default function Account({
  onBack,
  onProfile
}) {
  const {
    language
  } =
    useLanguage();

  const pt =
    language !== "en";

  const localProfile =
    useMemo(
      () =>
        getProfile() ||
        {},
      []
    );

  const [
    session,
    setSession
  ] =
    useState({
      mode:
        accountsEnabled
          ? "cloud"
          : "local",

      user:
        null
    });

  const [
    email,
    setEmail
  ] =
    useState("");

  const [
    password,
    setPassword
  ] =
    useState("");

  const [
    message,
    setMessage
  ] =
    useState("");

  const [
    loading,
    setLoading
  ] =
    useState(
      Boolean(
        accountsEnabled
      )
    );


  const refresh =
    useCallback(
      async () => {
        try {
          const next =
            await getAccountSession();

          setSession(
            next || {
              mode:
                accountsEnabled
                  ? "cloud"
                  : "local",

              user:
                null
            }
          );
        } catch (
          error
        ) {
          console.error(
            "Falha ao atualizar sessão:",
            error
          );

          setMessage(
            error?.message ||
            (
              pt
                ? "Não foi possível carregar a sessão."
                : "Could not load session."
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        pt
      ]
    );


  useEffect(() => {
    let active =
      true;

    (async () => {
      try {
        const next =
          await getAccountSession();

        if (active) {
          setSession(
            next || {
              mode:
                accountsEnabled
                  ? "cloud"
                  : "local",

              user:
                null
            }
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Falha ao carregar sessão:",
          error
        );

        if (active) {
          setMessage(
            error?.message ||
            (
              pt
                ? "Não foi possível carregar a sessão."
                : "Could not load session."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    })();


    const authSubscription =
      supabase?.auth
        ?.onAuthStateChange(
          (
            _event,
            authSession
          ) => {
            if (!active) {
              return;
            }

            setSession({
              mode:
                "cloud",

              user:
                authSession?.user ||
                null
            });

            setLoading(
              false
            );
          }
        )
        ?.data
        ?.subscription;


    return () => {
      active =
        false;

      authSubscription
        ?.unsubscribe?.();
    };
  }, [
    pt
  ]);


  async function run(
    fn
  ) {
    setMessage(
      ""
    );

    setLoading(
      true
    );

    try {
      const result =
        await fn();

      setMessage(
        result?.ok
          ? (
            pt
              ? "Concluído."
              : "Done."
          )
          : (
            result?.error ||
            (
              pt
                ? "Ocorreu um erro."
                : "An error occurred."
            )
          )
      );

      await refresh();
    } catch (
      error
    ) {
      console.error(
        "Erro na conta:",
        error
      );

      setMessage(
        error?.message ||
        (
          pt
            ? "Falha ao acessar a conta."
            : "Account request failed."
        )
      );

      setLoading(
        false
      );
    }
  }


  const displayName =
    localProfile.displayName ||
    localProfile.name ||
    (
      pt
        ? "Jogador"
        : "Player"
    );

  const username =
    localProfile.username ||
    "";

  const avatar =
    localProfile.avatar ||
    null;

  const accountEmail =
    session?.user?.email ||
    email ||
    "";

  const connected =
    Boolean(
      session?.user
    );


  return (
    <main className="standard-page account-v2-page">

      <header className="account-v2-topbar">

        <button
          className="ghost account-v2-back"
          onClick={
            onBack
          }
        >
          <span aria-hidden="true">
            ←
          </span>

          {pt
            ? "Voltar"
            : "Back"}
        </button>


        <div className="account-v2-title">

          <span className="eyebrow">
            ACCOUNT
          </span>

          <h1>
            {pt
              ? "Conta Battle Spirits"
              : "Battle Spirits Account"}
          </h1>

          <p>
            {pt
              ? "Gerencie sua identidade, login e sincronização com a nuvem."
              : "Manage your identity, login and cloud synchronization."}
          </p>

        </div>


        <div
          className={
            `account-v2-status ${
              connected
                ? "online"
                : accountsEnabled
                  ? "offline"
                  : "local"
            }`
          }
        >
          <i />

          <div>
            <span>
              {connected
                ? (
                  pt
                    ? "CONTA"
                    : "ACCOUNT"
                )
                : (
                  accountsEnabled
                    ? "CLOUD"
                    : "LOCAL"
                )}
            </span>

            <strong>
              {connected
                ? (
                  pt
                    ? "CONECTADA"
                    : "CONNECTED"
                )
                : accountsEnabled
                  ? "OFFLINE"
                  : "LOCAL"}
            </strong>
          </div>
        </div>

      </header>


      <section className="account-v2-shell">

        {!accountsEnabled ? (
          <section className="account-v2-local-state">

            <div className="account-v2-profile-card">

              <div className="account-v2-avatar">
                {avatar
                  ? (
                    <img
                      src={avatar}
                      alt=""
                    />
                  )
                  : (
                    <span>
                      {getInitials(
                        displayName
                      )}
                    </span>
                  )}
              </div>


              <div className="account-v2-profile-copy">
                <span className="eyebrow">
                  {pt
                    ? "PERFIL LOCAL"
                    : "LOCAL PROFILE"}
                </span>

                <h2>
                  {displayName}
                </h2>

                <p>
                  {username
                    ? `@${username}`
                    : (
                      pt
                        ? "Perfil salvo neste dispositivo"
                        : "Profile saved on this device"
                    )}
                </p>
              </div>


              <span className="account-v2-local-badge">
                LOCAL
              </span>

            </div>


            <div className="account-v2-local-info">

              <span className="account-v2-info-icon">
                ◈
              </span>

              <div>
                <h3>
                  {pt
                    ? "Seu perfil continua funcionando normalmente"
                    : "Your profile still works normally"}
                </h3>

                <p>
                  {pt
                    ? "Seus decks, perfil e configurações permanecem salvos neste PC. Para login em nuvem, amigos e mensagens entre computadores, configure o Supabase do projeto."
                    : "Your decks, profile and settings remain saved on this PC. Configure Supabase for cloud login, friends and cross-device messages."}
                </p>
              </div>

            </div>


            <button
              className="primary-btn big account-v2-profile-button"
              onClick={
                onProfile
              }
            >
              <span>
                {pt
                  ? "Abrir meu perfil"
                  : "Open my profile"}
              </span>

              <b aria-hidden="true">
                →
              </b>
            </button>

          </section>
        ) : loading ? (
          <section className="account-v2-loading">

            <div className="account-spinner" />

            <span className="eyebrow">
              CLOUD ACCOUNT
            </span>

            <h2>
              {pt
                ? "Conectando à conta..."
                : "Connecting to account..."}
            </h2>

            <p>
              {pt
                ? "Aguarde enquanto verificamos sua sessão."
                : "Please wait while we verify your session."}
            </p>

          </section>
        ) : connected ? (
          <>
            <section className="account-v2-identity">

              <div className="account-v2-avatar large">
                {avatar
                  ? (
                    <img
                      src={avatar}
                      alt=""
                    />
                  )
                  : (
                    <span>
                      {getInitials(
                        displayName
                      )}
                    </span>
                  )}
              </div>


              <div className="account-v2-identity-copy">

                <span className="eyebrow">
                  ONLINE
                </span>

                <h2>
                  {displayName}
                </h2>

                <p className="account-v2-handle">
                  {username
                    ? `@${username}`
                    : (
                      pt
                        ? "Perfil Battle Spirits"
                        : "Battle Spirits profile"
                    )}
                </p>

                <div className="account-v2-email">
                  <span>
                    E-MAIL
                  </span>

                  <strong>
                    {accountEmail}
                  </strong>
                </div>

              </div>


              <div className="account-v2-connected-badge">
                <i />

                <span>
                  {pt
                    ? "Conta conectada"
                    : "Connected account"}
                </span>
              </div>

            </section>


            <section className="account-v2-sync-section">

              <header className="account-v2-section-heading">

                <div>
                  <span className="eyebrow">
                    CLOUD SYNC
                  </span>

                  <h3>
                    {pt
                      ? "Sincronização"
                      : "Synchronization"}
                  </h3>

                  <p>
                    {pt
                      ? "Envie ou recupere seus dados da nuvem."
                      : "Upload or restore your data from the cloud."}
                  </p>
                </div>


                <span className="account-v2-sync-state">
                  {pt
                    ? "NUVEM DISPONÍVEL"
                    : "CLOUD AVAILABLE"}
                </span>

              </header>


              <div className="account-v2-sync-grid">

                <SyncAction
                  eyebrow={
                    pt
                      ? "PERFIL"
                      : "PROFILE"
                  }
                  title={
                    pt
                      ? "Enviar para nuvem"
                      : "Upload to cloud"
                  }
                  description={
                    pt
                      ? "Salva avatar, banner e informações do perfil."
                      : "Saves avatar, banner and profile information."
                  }
                  icon="↑"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    run(
                      () =>
                        syncProfileToCloud()
                    )
                  }
                />


                <SyncAction
                  eyebrow={
                    pt
                      ? "PERFIL"
                      : "PROFILE"
                  }
                  title={
                    pt
                      ? "Baixar da nuvem"
                      : "Download from cloud"
                  }
                  description={
                    pt
                      ? "Restaura seu perfil salvo online."
                      : "Restores your online profile."
                  }
                  icon="↓"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    run(
                      () =>
                        loadCloudProfile()
                    )
                  }
                />


                <SyncAction
                  eyebrow={
                    pt
                      ? "DECKS"
                      : "DECKS"
                  }
                  title={
                    pt
                      ? "Enviar para nuvem"
                      : "Upload to cloud"
                  }
                  description={
                    pt
                      ? "Sincroniza sua biblioteca de decks."
                      : "Synchronizes your deck library."
                  }
                  icon="↑"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    run(
                      () =>
                        syncDecksToCloud()
                    )
                  }
                />


                <SyncAction
                  eyebrow={
                    pt
                      ? "DECKS"
                      : "DECKS"
                  }
                  title={
                    pt
                      ? "Baixar da nuvem"
                      : "Download from cloud"
                  }
                  description={
                    pt
                      ? "Recupera os decks salvos na conta."
                      : "Restores decks saved to the account."
                  }
                  icon="↓"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    run(
                      () =>
                        loadDecksFromCloud()
                    )
                  }
                />

              </div>

            </section>


            <footer className="account-v2-actions">

              <button
                className="primary-btn big account-v2-open-profile"
                onClick={
                  onProfile
                }
              >
                <span>
                  {pt
                    ? "Abrir perfil social"
                    : "Open social profile"}
                </span>

                <b aria-hidden="true">
                  →
                </b>
              </button>


              <button
                className="ghost danger account-v2-signout"
                disabled={
                  loading
                }
                onClick={() =>
                  run(
                    async () => {
                      await signOut();

                      return {
                        ok:
                          true
                      };
                    }
                  )
                }
              >
                {pt
                  ? "Sair da conta"
                  : "Sign out"}
              </button>

            </footer>
          </>
        ) : (
          <section className="account-v2-auth">

            <div className="account-v2-auth-intro">

              <div className="account-v2-auth-mark">
                BS
              </div>


              <div>
                <span className="eyebrow">
                  CLOUD ACCOUNT
                </span>

                <h2>
                  {pt
                    ? "Entre na sua conta"
                    : "Sign in to your account"}
                </h2>

                <p>
                  {pt
                    ? "Sincronize perfil, decks, amigos e mensagens entre dispositivos."
                    : "Sync profile, decks, friends and messages across devices."}
                </p>
              </div>

            </div>


            <div className="account-v2-auth-form">

              <label>
                <span>
                  E-mail
                </span>

                <input
                  type="email"
                  autoComplete="email"
                  value={
                    email
                  }
                  placeholder="you@example.com"
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target.value
                    )
                  }
                />
              </label>


              <label>
                <span>
                  {pt
                    ? "Senha"
                    : "Password"}
                </span>

                <input
                  type="password"
                  autoComplete="current-password"
                  value={
                    password
                  }
                  minLength={6}
                  placeholder="••••••••"
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                />
              </label>

            </div>


            <div className="account-v2-auth-actions">

              <button
                className="primary-btn big"
                disabled={
                  loading ||
                  !email.trim() ||
                  password.length <
                    6
                }
                onClick={() =>
                  run(
                    () =>
                      signIn(
                        email.trim(),
                        password
                      )
                  )
                }
              >
                {pt
                  ? "Entrar"
                  : "Sign in"}
              </button>


              <button
                disabled={
                  loading ||
                  !email.trim() ||
                  password.length <
                    6
                }
                onClick={() =>
                  run(
                    () =>
                      signUp(
                        email.trim(),
                        password
                      )
                  )
                }
              >
                {pt
                  ? "Criar conta"
                  : "Create account"}
              </button>

            </div>

          </section>
        )}


        {message && (
          <div className="account-v2-notice">
            <i />

            <span>
              {message}
            </span>
          </div>
        )}

      </section>

    </main>
  );
}
