import { useEffect, useMemo, useRef, useState } from "react";
import EternalCinematicBackdrop from "../components/layout/EternalCinematicBackdrop.jsx";
import PointerTiltSurface from "../components/layout/PointerTiltSurface.jsx";
import { cardIndex } from "../services/cardRepository.js";
import { getDecks, getProfile, saveProfile } from "../services/storage.js";
import { accountsEnabled } from "../services/supabase.js";
import {
  DEFAULT_SOCIAL_PRIVACY,
  blockUser,
  getAccountSession,
  loadDirectMessages,
  loadSocialBootstrap,
  loadSocialProfile,
  markAllNotificationsRead,
  markConversationRead,
  removeFriend,
  respondFriendRequest,
  savePrivacySettings,
  searchProfiles,
  sendTypingSignal,
  setFriendPreference,
  subscribeConversationTyping,
  sendDirectMessage,
  sendFriendRequest,
  subscribeSocialEvents,
  syncProfileToCloud,
  touchSocialPresence,
  unblockUser
} from "../services/socialService.js";
import { buildPlayerSocialInsights, formatMasteryLabel } from "../services/socialInsights.js";
import { useLanguage } from "../i18n.jsx";
import "../styles/pages/socialHubV360.css";
import "../styles/pages/eternalInterfaceV350.css";

function getInitials(value) {
  const parts = String(value || "Player").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
}

function personName(person) {
  return person?.display_name || person?.displayName || person?.name || person?.username || "Jogador";
}

function personId(person) {
  return person?.friend_id || person?.user_id || person?.id || null;
}

function formatTime(value, language = "ptBR") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const locale = language === "en" ? "en-US" : "pt-BR";
  const clock = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return language === "en" ? `Today · ${clock}` : `Hoje · ${clock}`;
  if (date.toDateString() === yesterday.toDateString()) return language === "en" ? `Yesterday · ${clock}` : `Ontem · ${clock}`;
  return date.toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function presenceLabel(friend, pt) {
  if (friend?.is_online) return pt ? "Online" : "Online";
  if (friend?.presence_status === "away") return pt ? "Ausente" : "Away";
  if (friend?.presence_status === "busy") return pt ? "Ocupado" : "Busy";
  if (friend?.presence_status === "hidden") return pt ? "Status oculto" : "Status hidden";
  return pt ? "Offline" : "Offline";
}

function SocialAvatar({ person, size = "normal" }) {
  const name = personName(person);
  return (
    <span className={`social-avatar ${size}`}>
      {person?.avatar ? <img src={person.avatar} alt="" /> : <b>{getInitials(name)}</b>}
    </span>
  );
}

function SocialNavButton({ icon, label, active, badge, disabled, onClick }) {
  return (
    <button
      type="button"
      className={`social-nav-button ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="social-nav-active" aria-hidden="true" />
      <i aria-hidden="true">{icon}</i>
      <b>{label}</b>
      {badge > 0 && <em>{badge > 99 ? "99+" : badge}</em>}
    </button>
  );
}

function SocialSectionTitle({ eyebrow, title, description, action }) {
  return (
    <header className="social-section-title">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

function ToggleRow({ title, description, checked, onChange, disabled }) {
  return (
    <label className={`social-toggle-row ${disabled ? "disabled" : ""}`}>
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <i aria-hidden="true"><b /></i>
    </label>
  );
}

function PrivacySelect({ title, description, value, onChange, options, disabled }) {
  return (
    <label className="social-privacy-select">
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MasteryCard({ entry, language }) {
  if (!entry) return null;
  const label = formatMasteryLabel(entry.level, language);
  return (
    <PointerTiltSurface className="social-mastery-tilt" maxTilt={6} glare>
      <article className="social-mastery-card">
        <div className="social-mastery-art">
          {entry.image ? <img src={entry.image} alt="" /> : <span>{getInitials(entry.name)}</span>}
          <div className="social-mastery-shade" />
        </div>
        <div className="social-mastery-copy">
          <span>{label}</span>
          <strong title={entry.name}>{entry.name}</strong>
          <small>{entry.points} pts · {entry.deckCount} deck{entry.deckCount === 1 ? "" : "s"}</small>
        </div>
      </article>
    </PointerTiltSurface>
  );
}

function FriendDock({ friends, pt, onChat, onManage }) {
  const sorted = [...friends].sort((a, b) => Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite)) || Number(Boolean(b.is_online)) - Number(Boolean(a.is_online)) || personName(a).localeCompare(personName(b)));
  const online = sorted.filter((friend) => friend.is_online).length;
  return (
    <aside className="social-friend-dock">
      <header>
        <div>
          <span>{pt ? "AMIGOS" : "FRIENDS"}</span>
          <strong>{online} {pt ? "online" : "online"}</strong>
        </div>
        <button type="button" onClick={onManage} aria-label={pt ? "Gerenciar amigos" : "Manage friends"}>＋</button>
      </header>
      <div className="social-friend-dock-list">
        {sorted.length ? sorted.map((friend) => (
          <button type="button" key={personId(friend)} className="social-friend-dock-row" onClick={() => onChat(friend)}>
            <SocialAvatar person={friend} size="small" />
            <span>
              <strong>{friend.is_favorite ? "★ " : ""}{personName(friend)}</strong>
              <small>{friend.custom_status || presenceLabel(friend, pt)}</small>
            </span>
            <i className={friend.is_online ? "online" : ""} aria-hidden="true" />
            {Number(friend.unread_count || 0) > 0 && <em>{friend.unread_count}</em>}
          </button>
        )) : (
          <div className="social-friend-dock-empty">
            <b>◇</b>
            <span>{pt ? "Sua lista de amigos aparece aqui." : "Your friends list appears here."}</span>
          </div>
        )}
      </div>
      <footer>
        <span>{pt ? "Social separado das partidas Online" : "Social is isolated from Online matches"}</span>
      </footer>
    </aside>
  );
}

async function optimizeImage(file, { maxBytes = 6_000_000, width = 512, height = 512, quality = 0.82 } = {}) {
  if (!file) return null;
  if (file.size > maxBytes) throw new Error(`Imagem muito grande. Máximo: ${Math.round(maxBytes / 1_000_000)} MB.`);

  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível preparar a imagem."));
    img.src = source;
  });

  const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const nextQuality of [quality, 0.72, 0.6]) {
    const encoded = canvas.toDataURL("image/webp", nextQuality);
    if (encoded.length < 900_000) return encoded;
  }
  return canvas.toDataURL("image/jpeg", 0.68);
}

export default function Profile({ onBack }) {
  const { language } = useLanguage();
  const pt = language !== "en";
  const decks = useMemo(() => getDecks(), []);
  const insights = useMemo(() => buildPlayerSocialInsights(decks, cardIndex), [decks]);

  const initialProfile = useMemo(() => {
    const current = getProfile() || {};
    return {
      ...current,
      privacy: { ...DEFAULT_SOCIAL_PRIVACY, ...(current.privacy || {}) }
    };
  }, []);

  const [profile, setProfile] = useState(initialProfile);
  const [section, setSection] = useState("overview");
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [notifications, setNotifications] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [schema, setSchema] = useState({ ready: false, mode: accountsEnabled ? "legacy" : "local", version: null });
  const [sessionUser, setSessionUser] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const [friendFilter, setFriendFilter] = useState("");
  const [typingFriend, setTypingFriend] = useState(false);
  const typingStopRef = useRef(null);
  const aliveRef = useRef(true);

  const displayName = profile.displayName || profile.name || (pt ? "Jogador" : "Player");
  const username = profile.username || "username";
  const privacy = { ...DEFAULT_SOCIAL_PRIVACY, ...(profile.privacy || {}) };
  const privacyRef = useRef(privacy);
  privacyRef.current = privacy;
  const unreadMessages = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const unreadNotifications = notifications.filter((item) => !item.read_at).length;
  const incomingCount = requests.incoming.length;

  async function refreshSocial() {
    if (!accountsEnabled) return;
    const next = await loadSocialBootstrap();
    if (!aliveRef.current) return;
    setFriends(next.friends || []);
    setConversations(next.conversations || []);
    setRequests(next.requests || { incoming: [], outgoing: [] });
    setNotifications(next.notifications || []);
    setBlocked(next.blocked || []);
    setSchema(next.schema || { ready: false, mode: "legacy" });
  }

  useEffect(() => {
    aliveRef.current = true;
    let stopRealtime = () => {};
    let refreshTimer = null;
    let presenceTimer = null;
    let socialPollTimer = null;

    (async () => {
      if (!accountsEnabled) return;
      const session = await getAccountSession();
      if (aliveRef.current) setSessionUser(session.user || null);
      await refreshSocial();
      await touchSocialPresence(privacyRef.current.showOnlineStatus ? "online" : "invisible");
      stopRealtime = await subscribeSocialEvents(async () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => refreshSocial(), 220);
      });
      presenceTimer = setInterval(() => touchSocialPresence(privacyRef.current.showOnlineStatus ? "online" : "invisible"), 60_000);
      socialPollTimer = setInterval(() => refreshSocial(), 20_000);
    })();

    return () => {
      aliveRef.current = false;
      clearTimeout(refreshTimer);
      clearInterval(presenceTimer);
      clearInterval(socialPollTimer);
      stopRealtime?.();
      touchSocialPresence("offline").catch(() => {});
    };
    // Social presence intentionally exists only while Social Hub is mounted.
    // It is never opened during a match and does not share the Socket.IO channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedFriend || !accountsEnabled) return undefined;
    const id = personId(selectedFriend);
    let active = true;
    const reload = async () => {
      const next = await loadDirectMessages(id);
      if (active) setMessages(next);
      await markConversationRead(id);
    };
    reload();
    const timer = setInterval(reload, 12_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedFriend]);

  useEffect(() => {
    if (!selectedFriend || !accountsEnabled) { setTypingFriend(false); return undefined; }
    let stop = () => {};
    let active = true;
    (async () => {
      stop = await subscribeConversationTyping(personId(selectedFriend), (typing) => {
        if (!active) return;
        setTypingFriend(typing);
        if (typing) {
          clearTimeout(typingStopRef.current);
          typingStopRef.current = setTimeout(() => setTypingFriend(false), 2400);
        }
      });
    })();
    return () => { active = false; clearTimeout(typingStopRef.current); stop?.(); setTypingFriend(false); };
  }, [selectedFriend]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function saveIdentity() {
    const next = {
      ...profile,
      username: String(profile.username || "").trim().toLowerCase(),
      displayName: String(profile.displayName || profile.name || "").trim() || (pt ? "Jogador" : "Player"),
      privacy
    };
    next.name = next.displayName;
    saveProfile(next);
    setProfile(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);

    if (accountsEnabled && sessionUser) {
      const result = await syncProfileToCloud(next);
      flash(result.ok ? (pt ? "Perfil sincronizado." : "Profile synced.") : result.error);
    } else {
      flash(pt ? "Perfil salvo neste dispositivo." : "Profile saved on this device.");
    }
  }

  async function savePrivacy() {
    const next = { ...profile, privacy };
    setProfile(next);
    saveProfile(next);
    if (!accountsEnabled || !sessionUser) {
      flash(pt ? "Preferências locais salvas." : "Local preferences saved.");
      return;
    }
    const result = await savePrivacySettings(privacy);
    flash(result.ok ? (pt ? "Privacidade atualizada." : "Privacy updated.") : result.error);
    if (result.ok) await touchSocialPresence(privacy.showOnlineStatus ? "online" : "invisible");
  }

  async function handleImage(kind, file) {
    try {
      const nextImage = await optimizeImage(file, kind === "avatar"
        ? { maxBytes: 6_000_000, width: 320, height: 320, quality: 0.84 }
        : { maxBytes: 8_000_000, width: 1600, height: 640, quality: 0.78 });
      setProfile((current) => ({ ...current, [kind]: nextImage }));
    } catch (error) {
      flash(error?.message || String(error));
    }
  }

  async function doSearch() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      setSearchResults(await searchProfiles(query));
    } finally {
      setBusy(false);
    }
  }

  async function requestFriend(targetId) {
    setBusy(true);
    const result = await sendFriendRequest(targetId);
    flash(result.ok ? (result.status === "accepted" ? (pt ? "Amizade aceita." : "Friendship accepted.") : (pt ? "Pedido enviado." : "Request sent.")) : result.error);
    await refreshSocial();
    setBusy(false);
  }

  async function answerRequest(requestId, response) {
    setBusy(true);
    const result = await respondFriendRequest(requestId, response);
    flash(result.ok ? (response === "accept" ? (pt ? "Pedido aceito." : "Request accepted.") : (pt ? "Pedido recusado." : "Request declined.")) : result.error);
    await refreshSocial();
    setBusy(false);
  }

  async function openChat(friend) {
    setSelectedFriend(friend);
    setSection("messages");
    const id = personId(friend);
    setMessages(await loadDirectMessages(id));
    await markConversationRead(id);
    await refreshSocial();
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!selectedFriend || !chatText.trim()) return;
    const id = personId(selectedFriend);
    const result = await sendDirectMessage(id, chatText);
    if (!result.ok) {
      flash(result.error);
      return;
    }
    setChatText("");
    setMessages(await loadDirectMessages(id));
    await refreshSocial();
  }

  async function inspectProfile(person) {
    const id = personId(person);
    if (!id) return;
    setBusy(true);
    setRemoteProfile(await loadSocialProfile(id));
    setBusy(false);
  }

  async function handleRemoveFriend(friend) {
    const result = await removeFriend(personId(friend));
    flash(result.ok ? (pt ? "Amigo removido." : "Friend removed.") : result.error);
    setRemoteProfile(null);
    setSelectedFriend(null);
    await refreshSocial();
  }

  async function handleBlock(person) {
    const result = await blockUser(personId(person));
    flash(result.ok ? (pt ? "Jogador bloqueado." : "Player blocked.") : result.error);
    setRemoteProfile(null);
    setSelectedFriend(null);
    await refreshSocial();
  }

  async function handleUnblock(person) {
    const result = await unblockUser(personId(person));
    flash(result.ok ? (pt ? "Jogador desbloqueado." : "Player unblocked.") : result.error);
    await refreshSocial();
  }

  async function changeFriendPreference(friend, patch) {
    const result = await setFriendPreference(personId(friend), patch);
    flash(result.ok ? (pt ? "Preferência atualizada." : "Preference updated.") : result.error);
    if (result.ok) await refreshSocial();
  }

  function handleTypingChange(value) {
    setChatText(value);
    if (!selectedFriend) return;
    sendTypingSignal(personId(selectedFriend), Boolean(value.trim())).catch(() => {});
    clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => sendTypingSignal(personId(selectedFriend), false).catch(() => {}), 1300);
  }

  async function openNotifications() {
    setSection("notifications");
    await markAllNotificationsRead();
    await refreshSocial();
  }

  const relatedPeople = useMemo(() => {
    const map = new Map();
    for (const friend of friends) map.set(personId(friend), friend);
    for (const conversation of conversations) map.set(personId(conversation), conversation);
    for (const item of [...requests.incoming, ...requests.outgoing]) map.set(item.user_id, item);
    return map;
  }, [friends, conversations, requests]);

  const nav = [
    ["overview", "◇", pt ? "Visão geral" : "Overview", 0],
    ["profile", "◈", pt ? "Perfil" : "Profile", 0],
    ["friends", "＋", pt ? "Amigos" : "Friends", incomingCount],
    ["messages", "✦", pt ? "Mensagens" : "Messages", unreadMessages],
    ["notifications", "•", pt ? "Notificações" : "Notifications", unreadNotifications],
    ["mastery", "◆", pt ? "Maestria" : "Mastery", 0],
    ["privacy", "▣", pt ? "Privacidade" : "Privacy", 0]
  ];

  return (
    <main className="social-hub-page eternal-page">
      <EternalCinematicBackdrop compact />
      <div className="social-hub-shade" aria-hidden="true" />

      <header className="social-hub-topbar">
        <button type="button" className="eternal-menu-action social-hub-back" onClick={onBack}>{pt ? "Voltar" : "Back"}</button>
        <div className="social-hub-title">
          <span>SOCIAL HUB</span>
          <h1>{pt ? "Perfil & Comunidade" : "Profile & Community"}</h1>
        </div>
        <div className="social-hub-top-actions">
          <span className={`social-cloud-state ${sessionUser ? "online" : ""}`}>
            <i />
            <b>{sessionUser ? (pt ? "Nuvem conectada" : "Cloud connected") : accountsEnabled ? "Offline" : "Local"}</b>
          </span>
          <button type="button" className="social-notification-button" onClick={openNotifications} aria-label={pt ? "Notificações" : "Notifications"}>
            ✦
            {unreadNotifications > 0 && <em>{unreadNotifications}</em>}
          </button>
        </div>
      </header>

      {accountsEnabled && sessionUser && (!schema.ready || schema.version !== "3.6.1") && (
        <div className="social-schema-notice">
          <strong>{pt ? "Atualização Social Hub necessária" : "Social Hub migration required"}</strong>
          <span>{schema.ready ? (pt ? "Seu banco ainda está no Social Hub 3.6.0. Execute supabase/SOCIAL-HUB-3.6.1.sql para liberar favoritos, silenciamento, status e polish do chat." : "Your database is still on Social Hub 3.6.0. Run supabase/SOCIAL-HUB-3.6.1.sql to enable favorites, muting, status and chat polish.") : (pt ? "Execute primeiro SOCIAL-HUB-3.6.sql e depois supabase/SOCIAL-HUB-3.6.1.sql para liberar todo o Social Hub v3.6.1." : "Run SOCIAL-HUB-3.6.sql first, then supabase/SOCIAL-HUB-3.6.1.sql to enable all Social Hub v3.6.1 features.")}</span>
        </div>
      )}

      <section className="social-hub-shell">
        <aside className="social-hub-sidebar">
          <div className="social-self-card">
            <div className="social-self-banner" style={profile.banner ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72)),url(${profile.banner})` } : undefined} />
            <div className="social-self-identity">
              <SocialAvatar person={{ ...profile, display_name: displayName }} size="large" />
              <div>
                <strong>{displayName}</strong>
                <small>@{username}</small>
              </div>
            </div>
            <span className="social-profile-visibility">{privacy.profileVisibility === "public" ? (pt ? "Público" : "Public") : privacy.profileVisibility === "friends" ? (pt ? "Só amigos" : "Friends only") : (pt ? "Privado" : "Private")}</span>
          </div>

          <nav className="social-hub-nav">
            {nav.map(([key, icon, label, badge]) => (
              <SocialNavButton key={key} icon={icon} label={label} badge={badge} active={section === key} onClick={() => setSection(key)} />
            ))}
          </nav>

          <div className="social-hub-safety-note">
            <span>ONLINE SAFETY</span>
            <p>{pt ? "O Social Hub não é enviado ao servidor das partidas. O Online continua usando somente nome, username, cor e avatar compacto." : "Social Hub data is not sent to the match server. Online play still uses only name, username, color and a compact avatar."}</p>
          </div>
        </aside>

        <section className="social-hub-content">
          {notice && <div className="social-toast">{notice}</div>}

          {section === "overview" && (
            <div className="social-view social-overview-view">
              <section className="social-overview-hero" style={profile.banner ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.2),rgba(0,0,0,.82)),url(${profile.banner})` } : undefined}>
                <div className="social-overview-avatar"><SocialAvatar person={{ ...profile, display_name: displayName }} size="hero" /></div>
                <div className="social-overview-copy">
                  <span>{pt ? "DUELISTA" : "DUELIST"}</span>
                  <h2>{displayName}</h2>
                  <small>@{username}</small>
                  <p>{profile.bio || (pt ? "Adicione uma bio para contar um pouco sobre você à comunidade." : "Add a bio to tell the community a little about yourself.")}</p>
                </div>
                <div className="social-overview-actions">
                  <button type="button" className="eternal-menu-action" onClick={() => setSection("profile")}>{pt ? "Editar perfil" : "Edit profile"}</button>
                  <button type="button" className="eternal-menu-action" onClick={() => setSection("privacy")}>{pt ? "Privacidade" : "Privacy"}</button>
                </div>
              </section>

              <div className="social-stat-strip">
                <article><span>{pt ? "Amigos" : "Friends"}</span><strong>{friends.length}</strong><small>{friends.filter((item) => item.is_online).length} online</small></article>
                <article><span>{pt ? "Decks válidos" : "Valid decks"}</span><strong>{insights.validDecks}</strong><small>{insights.totalDecks} {pt ? "salvos" : "saved"}</small></article>
                <article><span>{pt ? "Cartas únicas" : "Unique cards"}</span><strong>{insights.uniqueCards}</strong><small>{insights.totalCopies} {pt ? "cópias em decks" : "deck copies"}</small></article>
                <article><span>{pt ? "Afinidade" : "Affinity"}</span><strong>{insights.primaryColor ? insights.primaryColor.toUpperCase() : "—"}</strong><small>{pt ? "baseada nos decks" : "based on decks"}</small></article>
              </div>

              <section className="social-overview-grid">
                <div className="social-panel social-overview-mastery">
                  <SocialSectionTitle eyebrow="CARD MASTERY" title={pt ? "Cartas em destaque" : "Featured cards"} description={pt ? "Maestria baseada na presença das cartas nos seus decks salvos." : "Mastery based on how strongly cards appear across your saved decks."} action={<button type="button" className="social-text-button" onClick={() => setSection("mastery")}>{pt ? "Ver tudo" : "See all"}</button>} />
                  <div className="social-mastery-row">
                    {insights.topCards.slice(0, 3).map((entry) => <MasteryCard key={entry.id} entry={entry} language={language} />)}
                    {!insights.topCards.length && <div className="social-empty-inline">{pt ? "Crie decks para começar a construir sua Maestria." : "Create decks to start building Mastery."}</div>}
                  </div>
                </div>

                <div className="social-panel social-recent-decks">
                  <SocialSectionTitle eyebrow="DECK PROFILE" title={pt ? "Decks recentes" : "Recent decks"} description={pt ? "Últimos decks editados na sua biblioteca." : "Recently edited decks in your library."} />
                  <div className="social-deck-mini-list">
                    {insights.topDecks.map((deck) => {
                      const cover = deck.coverCardId ? cardIndex.get(deck.coverCardId) : null;
                      return (
                        <article key={deck.id}>
                          <span className="social-deck-cover">{cover?.image ? <img src={cover.image} alt="" /> : "◇"}</span>
                          <div><strong>{deck.name}</strong><small>{deck.cards} {pt ? "cartas" : "cards"}</small></div>
                        </article>
                      );
                    })}
                    {!insights.topDecks.length && <div className="social-empty-inline">{pt ? "Nenhum deck salvo." : "No saved decks."}</div>}
                  </div>
                </div>
              </section>
            </div>
          )}

          {section === "profile" && (
            <div className="social-view social-profile-editor">
              <SocialSectionTitle eyebrow="PLAYER IDENTITY" title={pt ? "Configuração do perfil" : "Profile setup"} description={pt ? "Ajuste como sua identidade aparece nas áreas sociais. Imagens são compactadas antes de serem salvas." : "Choose how your identity appears in social areas. Images are compressed before they are saved."} action={<span className={`social-save-state ${saved ? "saved" : ""}`}>{saved ? (pt ? "SALVO" : "SAVED") : (pt ? "EDITANDO" : "EDITING")}</span>} />

              <div className="social-profile-media-editor">
                <div className="social-profile-banner-preview" style={profile.banner ? { backgroundImage: `linear-gradient(180deg,transparent,rgba(0,0,0,.68)),url(${profile.banner})` } : undefined}>
                  <label>{pt ? "Trocar banner" : "Change banner"}<input hidden type="file" accept="image/*" onChange={(event) => handleImage("banner", event.target.files?.[0])} /></label>
                </div>
                <div className="social-profile-avatar-editor">
                  <SocialAvatar person={{ ...profile, display_name: displayName }} size="hero" />
                  <label>{pt ? "Trocar avatar" : "Change avatar"}<input hidden type="file" accept="image/*" onChange={(event) => handleImage("avatar", event.target.files?.[0])} /></label>
                </div>
              </div>

              <div className="social-form-grid">
                <label><span>{pt ? "Nome de exibição" : "Display name"}</span><input maxLength={40} value={profile.displayName || profile.name || ""} onChange={(event) => setProfile({ ...profile, displayName: event.target.value, name: event.target.value })} /></label>
                <label><span>{pt ? "Nome de usuário" : "Username"}</span><div className="social-username-input"><b>@</b><input maxLength={24} value={profile.username || ""} onChange={(event) => setProfile({ ...profile, username: event.target.value.replace(/[^a-zA-Z0-9_.-]/g, "") })} /></div></label>
                <label><span>{pt ? "Status personalizado" : "Custom status"} <small>{String(profile.customStatus || "").length}/80</small></span><input maxLength={80} value={profile.customStatus || ""} onChange={(event) => setProfile({ ...profile, customStatus: event.target.value })} placeholder={pt ? "Ex.: Montando deck Roxo" : "e.g. Building a Purple deck"} /></label><label className="wide"><span>Bio <small>{String(profile.bio || "").length}/240</small></span><textarea maxLength={240} value={profile.bio || ""} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder={pt ? "Conte um pouco sobre você..." : "Tell the community about yourself..."} /></label>
              </div>
              <footer className="social-view-actions"><span>{accountsEnabled && sessionUser ? (pt ? "Salva localmente e sincroniza com sua conta." : "Saves locally and syncs with your account.") : (pt ? "Salva somente neste dispositivo." : "Saves only on this device.")}</span><button type="button" className="eternal-menu-action active" onClick={saveIdentity}>{pt ? "Salvar perfil" : "Save profile"}</button></footer>
            </div>
          )}

          {section === "friends" && (
            <div className="social-view social-friends-view">
              <SocialSectionTitle eyebrow="SOCIAL CONNECTIONS" title={pt ? "Amigos & pedidos" : "Friends & requests"} description={pt ? "Pedidos precisam ser aceitos antes de criar uma amizade. Nada é aprovado automaticamente." : "Requests must be accepted before a friendship is created. Nothing is auto-approved."} />

              {!accountsEnabled || !sessionUser ? (
                <div className="social-big-empty"><b>◇</b><strong>{pt ? "Entre na conta para usar Amigos" : "Sign in to use Friends"}</strong><span>{pt ? "Seu perfil, decks e Maestria local continuam funcionando offline." : "Your profile, decks and local Mastery still work offline."}</span></div>
              ) : (
                <>
                  <div className="social-search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && doSearch()} placeholder={pt ? "Buscar @usuário ou nome..." : "Search @username or name..."} /><button type="button" onClick={doSearch} disabled={busy}>{pt ? "Buscar" : "Search"}</button></div>

                  {requests.incoming.length > 0 && (
                    <section className="social-panel social-request-panel">
                      <SocialSectionTitle eyebrow="INCOMING" title={pt ? "Pedidos recebidos" : "Incoming requests"} description={`${requests.incoming.length}`} />
                      <div className="social-request-list">
                        {requests.incoming.map((request) => (
                          <article key={request.request_id}>
                            <button type="button" className="social-person-main" onClick={() => inspectProfile(request)}><SocialAvatar person={request} /><span><strong>{personName(request)}</strong><small>@{request.username}</small></span></button>
                            <div className="social-row-actions"><button type="button" onClick={() => answerRequest(request.request_id, "accept")}>{pt ? "Aceitar" : "Accept"}</button><button type="button" onClick={() => answerRequest(request.request_id, "decline")}>{pt ? "Recusar" : "Decline"}</button></div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {searchResults.length > 0 && (
                    <section className="social-panel">
                      <SocialSectionTitle eyebrow="SEARCH" title={pt ? "Resultados" : "Results"} description={`${searchResults.length}`} />
                      <div className="social-request-list compact">
                        {searchResults.map((person) => (
                          <article key={person.id}>
                            <button type="button" className="social-person-main" onClick={() => inspectProfile(person)}><SocialAvatar person={person} /><span><strong>{personName(person)}</strong><small>@{person.username}</small></span></button>
                            <div className="social-row-actions">
                              {person.relation_status === "accepted" ? <span className="social-relation-label">{pt ? "Amigo" : "Friend"}</span> : person.relation_status === "pending" ? <span className="social-relation-label">{pt ? "Pendente" : "Pending"}</span> : <button type="button" onClick={() => requestFriend(person.id)}>{pt ? "Adicionar" : "Add friend"}</button>}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="social-panel social-manage-friends">
                    <SocialSectionTitle eyebrow="FRIEND LIST" title={pt ? "Sua lista" : "Your list"} description={`${friends.length} ${pt ? "amigos" : "friends"}`} action={<input className="social-inline-filter" value={friendFilter} onChange={(event) => setFriendFilter(event.target.value)} placeholder={pt ? "Filtrar amigos..." : "Filter friends..."} />} />
                    <div className="social-friend-grid">
                      {[...friends].filter((friend) => personName(friend).toLowerCase().includes(friendFilter.toLowerCase()) || String(friend.username || "").toLowerCase().includes(friendFilter.toLowerCase())).sort((a,b) => Number(Boolean(b.is_favorite))-Number(Boolean(a.is_favorite)) || Number(Boolean(b.is_online))-Number(Boolean(a.is_online)) || personName(a).localeCompare(personName(b))).map((friend) => (
                        <article key={personId(friend)}>
                          <button type="button" className="social-person-main" onClick={() => inspectProfile(friend)}><SocialAvatar person={friend} /><span><strong>{friend.is_favorite ? "★ " : ""}{personName(friend)}</strong><small>{friend.custom_status || presenceLabel(friend, pt)}</small></span></button>
                          <div className="social-friend-quick-actions"><button type="button" className={friend.is_favorite ? "active" : ""} title={pt ? "Favorito" : "Favorite"} onClick={() => changeFriendPreference(friend,{ favorite: !friend.is_favorite })}>★</button><button type="button" className={friend.is_muted ? "active" : ""} title={pt ? "Silenciar" : "Mute"} onClick={() => changeFriendPreference(friend,{ muted: !friend.is_muted })}>◌</button><button type="button" className="social-message-shortcut" onClick={() => openChat(friend)}>✦</button></div>
                        </article>
                      ))}
                      {!friends.length && <div className="social-empty-inline">{pt ? "Nenhum amigo aceito ainda." : "No accepted friends yet."}</div>}
                    </div>
                  </section>

                  {requests.outgoing.length > 0 && <div className="social-pending-strip"><span>{pt ? "Pedidos enviados" : "Sent requests"}</span>{requests.outgoing.map((item) => <b key={item.request_id}>@{item.username}</b>)}</div>}
                </>
              )}
            </div>
          )}

          {section === "messages" && (
            <div className="social-view social-messages-view">
              <SocialSectionTitle eyebrow="DIRECT MESSAGES" title={pt ? "Mensagens privadas" : "Private messages"} description={pt ? "Conversas ficam no Social Hub e não usam o chat Socket.IO das partidas." : "Conversations stay in Social Hub and do not use the match Socket.IO chat."} />
              <div className="social-chat-layout">
                <aside className="social-conversation-list">
                  {conversations.map((friend) => (
                    <button type="button" key={personId(friend)} className={personId(selectedFriend) === personId(friend) ? "active" : ""} onClick={() => openChat(friend)}>
                      <SocialAvatar person={friend} size="small" /><span><strong>{friend.is_favorite ? "★ " : ""}{personName(friend)}{friend.is_muted ? " · ◌" : ""}</strong><small>{Number(friend.unread_count || 0) > 0 ? `${friend.unread_count} ${pt ? "não lidas" : "unread"}` : friend.last_message || friend.custom_status || presenceLabel(friend, pt)}</small></span>{friend.is_online && <i />}
                    </button>
                  ))}
                  {!conversations.length && <div className="social-empty-inline">{pt ? "Suas conversas aparecerão aqui." : "Your conversations will appear here."}</div>}
                </aside>

                <section className="social-chat-thread">
                  {selectedFriend ? (
                    <>
                      <header><SocialAvatar person={selectedFriend} /><div><strong>{personName(selectedFriend)}</strong><small>{typingFriend ? (pt ? "digitando…" : "typing…") : (selectedFriend.custom_status || `@${selectedFriend.username}`)}</small></div><button type="button" onClick={() => inspectProfile(selectedFriend)}>{pt ? "Perfil" : "Profile"}</button></header>
                      <div className="social-chat-messages">
                        {messages.map((message) => {
                          const mine = message.sender_id === sessionUser?.id;
                          return <article key={message.id} className={mine ? "mine" : "theirs"}><span>{message.text}</span><small>{formatTime(message.created_at, language)}{mine ? ` · ${message.read_at ? (pt ? "Lida" : "Read") : (pt ? "Enviada" : "Sent")}` : ""}</small></article>;
                        })}
                        {!messages.length && <div className="social-big-empty compact"><b>✦</b><strong>{pt ? "Comece a conversa" : "Start the conversation"}</strong></div>}
                      </div>
                      <form className="social-chat-compose" onSubmit={sendMessage}><input maxLength={1000} value={chatText} onChange={(event) => handleTypingChange(event.target.value)} placeholder={pt ? "Escreva uma mensagem..." : "Write a message..."} /><button type="submit">{pt ? "Enviar" : "Send"}</button></form>
                    </>
                  ) : <div className="social-big-empty"><b>✦</b><strong>{pt ? "Selecione um amigo" : "Select a friend"}</strong><span>{pt ? "A conversa privada aparecerá aqui." : "The private conversation will appear here."}</span></div>}
                </section>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="social-view social-notifications-view">
              <SocialSectionTitle eyebrow="NOTIFICATIONS" title={pt ? "Central de notificações" : "Notification center"} description={pt ? "Pedidos, amizades aceitas e novas mensagens aparecem aqui." : "Requests, accepted friendships and new messages appear here."} action={notifications.length ? <button type="button" className="social-text-button" onClick={async () => { await markAllNotificationsRead(); await refreshSocial(); }}>{pt ? "Marcar tudo como lido" : "Mark all read"}</button> : null} />
              <div className="social-notification-list">
                {notifications.map((notification) => {
                  const actor = relatedPeople.get(notification.actor_id);
                  const text = notification.type === "friend_request" ? (pt ? "enviou um pedido de amizade." : "sent you a friend request.") : notification.type === "friend_accepted" ? (pt ? "aceitou seu pedido de amizade." : "accepted your friend request.") : notification.type === "message" ? (pt ? "enviou uma nova mensagem." : "sent a new message.") : (pt ? "Nova atualização social." : "New social update.");
                  return <article key={notification.id} className={!notification.read_at ? "unread" : ""}><SocialAvatar person={actor || { display_name: "BS" }} /><div><strong>{actor ? personName(actor) : (pt ? "Battle Spirits" : "Battle Spirits")}</strong><span>{text}</span><small>{formatTime(notification.created_at, language)}</small></div></article>;
                })}
                {!notifications.length && <div className="social-big-empty"><b>◇</b><strong>{pt ? "Tudo tranquilo por aqui" : "All quiet here"}</strong><span>{pt ? "Novas atividades sociais aparecerão nesta central." : "New social activity will appear here."}</span></div>}
              </div>
            </div>
          )}

          {section === "mastery" && (
            <div className="social-view social-mastery-view">
              <SocialSectionTitle eyebrow="CARD MASTERY" title={pt ? "Maestria de cartas" : "Card Mastery"} description={pt ? "A v3.6.1 mantém a Maestria atual e calcula afinidade a partir da presença, quantidade e uso como capa nos seus decks salvos. Isso não lê informações das partidas Online." : "v3.6.1 keeps the current Mastery model and calculates affinity from presence, copies and cover-card use across your saved decks. It never reads Online match data."} />
              <div className="social-mastery-summary"><article><span>{pt ? "Líder" : "Leader"}</span><strong>{insights.masteryLeader?.name || "—"}</strong><small>{insights.masteryLeader ? formatMasteryLabel(insights.masteryLeader.level, language) : "—"}</small></article><article><span>{pt ? "Cartas rastreadas" : "Tracked cards"}</span><strong>{insights.uniqueCards}</strong><small>{pt ? "nos decks salvos" : "in saved decks"}</small></article><article><span>{pt ? "Cor dominante" : "Dominant color"}</span><strong>{insights.primaryColor?.toUpperCase() || "—"}</strong><small>{pt ? "afinidade de construção" : "deckbuilding affinity"}</small></article></div>
              <div className="social-mastery-grid">
                {insights.topCards.map((entry) => <MasteryCard key={entry.id} entry={entry} language={language} />)}
                {!insights.topCards.length && <div className="social-big-empty"><b>◆</b><strong>{pt ? "Maestria ainda vazia" : "Mastery is empty"}</strong><span>{pt ? "Salve decks para começar a construir seu perfil de cartas." : "Save decks to start building your card profile."}</span></div>}
              </div>
            </div>
          )}

          {section === "privacy" && (
            <div className="social-view social-privacy-view">
              <SocialSectionTitle eyebrow="PRIVACY & SAFETY" title={pt ? "Privacidade do jogador" : "Player privacy"} description={pt ? "Defina quem pode ver e interagir com seu perfil social. Essas opções não alteram o payload das partidas Online." : "Choose who can see and interact with your social profile. These options do not alter Online match payloads."} />

              <div className="social-privacy-grid">
                <section className="social-panel">
                  <h3>{pt ? "Visibilidade e contato" : "Visibility & contact"}</h3>
                  <PrivacySelect title={pt ? "Visibilidade do perfil" : "Profile visibility"} description={pt ? "Controla bio, banner e detalhes públicos." : "Controls bio, banner and public details."} value={privacy.profileVisibility} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, profileVisibility: value } })} options={[{ value: "public", label: pt ? "Público" : "Public" }, { value: "friends", label: pt ? "Somente amigos" : "Friends only" }, { value: "private", label: pt ? "Privado" : "Private" }]} disabled={!schema.ready && accountsEnabled} />
                  <PrivacySelect title={pt ? "Pedidos de amizade" : "Friend requests"} description={pt ? "Quem pode enviar novos pedidos." : "Who may send new requests."} value={privacy.friendRequestPolicy} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, friendRequestPolicy: value } })} options={[{ value: "everyone", label: pt ? "Todos" : "Everyone" }, { value: "mutuals", label: pt ? "Amigos em comum" : "Mutual friends" }, { value: "nobody", label: pt ? "Ninguém" : "Nobody" }]} disabled={!schema.ready && accountsEnabled} />
                  <PrivacySelect title={pt ? "Mensagens privadas" : "Private messages"} description={pt ? "Quem pode iniciar uma conversa com você." : "Who may start a conversation with you."} value={privacy.messagePolicy} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, messagePolicy: value } })} options={[{ value: "friends", label: pt ? "Somente amigos" : "Friends only" }, { value: "everyone", label: pt ? "Todos" : "Everyone" }, { value: "nobody", label: pt ? "Ninguém" : "Nobody" }]} disabled={!schema.ready && accountsEnabled} />
                </section>

                <section className="social-panel">
                  <h3>{pt ? "Dados exibidos" : "Displayed data"}</h3>
                  <ToggleRow title={pt ? "Aparecer nas buscas" : "Appear in search"} description={pt ? "Permite que outros jogadores encontrem seu @usuário." : "Allows other players to find your @username."} checked={privacy.discoverable} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, discoverable: value } })} disabled={!schema.ready && accountsEnabled} />
                  <ToggleRow title={pt ? "Mostrar status Online" : "Show Online status"} description={pt ? "Amigos podem ver quando você está no Social Hub." : "Friends can see when you are in Social Hub."} checked={privacy.showOnlineStatus} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, showOnlineStatus: value } })} disabled={!schema.ready && accountsEnabled} />
                  <ToggleRow title={pt ? "Mostrar estatísticas" : "Show statistics"} checked={privacy.showStats} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, showStats: value } })} disabled={!schema.ready && accountsEnabled} />
                  <ToggleRow title={pt ? "Mostrar decks" : "Show decks"} checked={privacy.showDecks} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, showDecks: value } })} disabled={!schema.ready && accountsEnabled} />
                  <ToggleRow title={pt ? "Mostrar Maestria" : "Show Mastery"} checked={privacy.showMastery} onChange={(value) => setProfile({ ...profile, privacy: { ...privacy, showMastery: value } })} disabled={!schema.ready && accountsEnabled} />
                </section>
              </div>

              <section className="social-safety-card"><div><span>MATCH ISOLATION</span><h3>{pt ? "Social Hub separado das partidas" : "Social Hub isolated from matches"}</h3><p>{pt ? "Perfis sociais, banner, bio, lista de amigos, notificações, privacidade e mensagens não são enviados pelo Socket.IO das partidas. O Online continua usando a camada src/online/publicProfile.js, que cria um perfil mínimo e compacto." : "Social profiles, banners, bios, friends, notifications, privacy and messages are never sent through match Socket.IO. Online play still uses src/online/publicProfile.js to build a tiny public match profile."}</p></div><strong>✓</strong></section>

              {blocked.length > 0 && <section className="social-panel social-blocked-panel"><h3>{pt ? "Jogadores bloqueados" : "Blocked players"}</h3>{blocked.map((person) => <article key={personId(person)}><SocialAvatar person={person} size="small" /><span><strong>{personName(person)}</strong><small>@{person.username}</small></span><button type="button" onClick={() => handleUnblock(person)}>{pt ? "Desbloquear" : "Unblock"}</button></article>)}</section>}
              <footer className="social-view-actions"><span>{schema.ready ? `Social Hub ${schema.version || "3.6"}` : (pt ? "Modo local/legado" : "Local/legacy mode")}</span><button type="button" className="eternal-menu-action active" onClick={savePrivacy}>{pt ? "Salvar privacidade" : "Save privacy"}</button></footer>
            </div>
          )}
        </section>

        <FriendDock friends={friends} pt={pt} onChat={openChat} onManage={() => setSection("friends")} />
      </section>

      {remoteProfile && (
        <div className="social-profile-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRemoteProfile(null)}>
          <section className="social-profile-preview" style={remoteProfile.banner ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.22),rgba(0,0,0,.92)),url(${remoteProfile.banner})` } : undefined}>
            <button type="button" className="social-profile-preview-close" onClick={() => setRemoteProfile(null)}>×</button>
            <SocialAvatar person={remoteProfile} size="hero" />
            <span>{remoteProfile.can_view === false ? (pt ? "PERFIL PRIVADO" : "PRIVATE PROFILE") : "PLAYER PROFILE"}</span>
            <h2>{personName(remoteProfile)}</h2>
            <small>@{remoteProfile.username}</small>
            <p>{remoteProfile.bio || (remoteProfile.can_view === false ? (pt ? "Este jogador limitou a visualização do perfil." : "This player limited profile visibility.") : "")}</p>
            <div className="social-profile-preview-actions">
              {(remoteProfile.is_friend || remoteProfile.can_message) && <button type="button" onClick={() => { openChat(remoteProfile); setRemoteProfile(null); }}>{pt ? "Mensagem" : "Message"}</button>}
              {remoteProfile.is_friend && <button type="button" onClick={() => handleRemoveFriend(remoteProfile)}>{pt ? "Remover amigo" : "Remove friend"}</button>}
              <button type="button" className="danger" onClick={() => handleBlock(remoteProfile)}>{pt ? "Bloquear" : "Block"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
