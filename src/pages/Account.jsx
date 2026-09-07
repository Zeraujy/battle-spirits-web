import { useCallback, useEffect, useState } from "react";
import { accountsEnabled, supabase } from "../services/supabase.js";
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
import { useLanguage } from "../i18n.jsx";

export default function Account({ onBack, onProfile }) {
  const { language } = useLanguage();
  const pt = language !== "en";

  const [session, setSession] = useState({ mode: accountsEnabled ? "cloud" : "local", user: null });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(accountsEnabled));

  const refresh = useCallback(async () => {
    try {
      const next = await getAccountSession();
      setSession(next || { mode: accountsEnabled ? "cloud" : "local", user: null });
    } catch (error) {
      console.error("Falha ao atualizar sessão:", error);
      setMessage(error?.message || (pt ? "Não foi possível carregar a sessão." : "Could not load session."));
    } finally {
      setLoading(false);
    }
  }, [pt]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const next = await getAccountSession();
        if (active) setSession(next || { mode: accountsEnabled ? "cloud" : "local", user: null });
      } catch (error) {
        console.error("Falha ao carregar sessão:", error);
        if (active) setMessage(error?.message || (pt ? "Não foi possível carregar a sessão." : "Could not load session."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    const authSubscription = supabase?.auth
      ?.onAuthStateChange((_event, authSession) => {
        if (!active) return;
        setSession({ mode: "cloud", user: authSession?.user || null });
        setLoading(false);
      })
      ?.data?.subscription;

    return () => {
      active = false;
      authSubscription?.unsubscribe?.();
    };
  }, [pt]);

  async function run(fn) {
    setMessage("");
    setLoading(true);

    try {
      const result = await fn();
      setMessage(
        result?.ok
          ? (pt ? "Concluído." : "Done.")
          : (result?.error || (pt ? "Ocorreu um erro." : "An error occurred."))
      );
      await refresh();
    } catch (error) {
      console.error("Erro na conta:", error);
      setMessage(error?.message || (pt ? "Falha ao acessar a conta." : "Account request failed."));
      setLoading(false);
    }
  }

  return (
    <main className="standard-page account-page">
      <header className="page-header">
        <button className="ghost" onClick={onBack}>
          {pt ? "← Voltar" : "← Back"}
        </button>
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>{pt ? "Conta Battle Spirits" : "Battle Spirits Account"}</h1>
        </div>
      </header>

      <section className="panel account-panel">
        {!accountsEnabled ? (
          <div className="account-offline">
            <h2>{pt ? "Perfil local ativo" : "Local profile active"}</h2>
            <p>
              {pt
                ? "Seus decks, perfil e configurações continuam salvos neste PC. Para login em nuvem, amigos e mensagens entre computadores, configure o Supabase usando o arquivo supabase/SOCIAL-SETUP-2.3.sql."
                : "Your decks, profile and settings are still saved on this PC. Configure Supabase for cloud login, cross-device friends and messages."}
            </p>
            <button className="primary-btn" onClick={onProfile}>
              {pt ? "Abrir meu perfil" : "Open my profile"}
            </button>
          </div>
        ) : loading ? (
          <div className="account-loading">
            <div className="account-spinner" />
            <strong>{pt ? "Conectando à conta..." : "Connecting to account..."}</strong>
            <span>{pt ? "Aguarde um instante." : "Please wait a moment."}</span>
          </div>
        ) : session?.user ? (
          <>
            <div className="account-user-card">
              <span className="eyebrow">ONLINE</span>
              <h2>{session.user.email || (pt ? "Conta conectada" : "Connected account")}</h2>
              <p>
                {pt
                  ? "Conta conectada. Você pode sincronizar perfil e decks com a nuvem."
                  : "Account connected. You can sync profile and decks with the cloud."}
              </p>
            </div>

            <div className="account-sync-grid">
              <button disabled={loading} onClick={() => run(() => syncProfileToCloud())}>
                {pt ? "Enviar perfil para nuvem" : "Upload profile"}
              </button>
              <button disabled={loading} onClick={() => run(() => loadCloudProfile())}>
                {pt ? "Baixar perfil da nuvem" : "Download profile"}
              </button>
              <button disabled={loading} onClick={() => run(() => syncDecksToCloud())}>
                {pt ? "Enviar decks para nuvem" : "Upload decks"}
              </button>
              <button disabled={loading} onClick={() => run(() => loadDecksFromCloud())}>
                {pt ? "Baixar decks da nuvem" : "Download decks"}
              </button>
            </div>

            <div className="row-actions">
              <button className="primary-btn" onClick={onProfile}>
                {pt ? "Abrir perfil social" : "Open social profile"}
              </button>
              <button
                className="ghost danger"
                disabled={loading}
                onClick={() => run(async () => {
                  await signOut();
                  return { ok: true };
                })}
              >
                {pt ? "Sair da conta" : "Sign out"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="form-stack">
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                {pt ? "Senha" : "Password"}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>

            <div className="row-actions">
              <button
                className="primary-btn"
                disabled={loading || !email.trim() || password.length < 6}
                onClick={() => run(() => signIn(email.trim(), password))}
              >
                {pt ? "Entrar" : "Sign in"}
              </button>
              <button
                disabled={loading || !email.trim() || password.length < 6}
                onClick={() => run(() => signUp(email.trim(), password))}
              >
                {pt ? "Criar conta" : "Create account"}
              </button>
            </div>
          </>
        )}

        {message && <div className="notice-text">{message}</div>}
      </section>
    </main>
  );
}
