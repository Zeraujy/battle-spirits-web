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
import { loadMatchHistory, summarizeMatchHistory } from "../services/matchHistoryService.js";
import { loadCardMastery, reconcileMasteryFromHistory, summarizeCardMastery } from "../services/cardMasteryService.js";
import { loadFriendRankedIdentities, loadPublicRankedIdentity, loadRankedHistory, loadRankedProfile, summarizeRankedHistory } from "../services/rankedService.js";
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

function MasteryCard({ entry, language, onClick }) {
  if (!entry) return null;
  const label = formatMasteryLabel(entry.level, language);
  return (
    <PointerTiltSurface className="social-mastery-tilt" maxTilt={6} glare>
      <article className="social-mastery-card" role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={() => onClick?.(entry)} onKeyDown={(event) => { if (onClick && (event.key === "Enter" || event.key === " ")) onClick(entry); }}>
        <div className="social-mastery-art">
          {entry.image ? <img src={entry.image} alt="" /> : <span>{getInitials(entry.name)}</span>}
          <div className="social-mastery-shade" />
        </div>
        <div className="social-mastery-copy">
          <span>{label}</span>
          <strong title={entry.name}>{entry.name}</strong>
          <small>{entry.xp ?? entry.points} XP · {entry.matches ?? entry.deckCount ?? 0} {language === "en" ? "matches" : "partidas"}</small>
        </div>
      </article>
    </PointerTiltSurface>
  );
}

function FriendDock({ friends, friendRanks = {}, pt, onChat, onManage }) {
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
              <strong>{friend.is_favorite ? "★ " : ""}{personName(friend)} {friendRanks[personId(friend)]?.rank?.label && <em className={`social-rank-mini rank-${friendRanks[personId(friend)].rank.tier.toLowerCase()}`}>{friendRanks[personId(friend)].rank.label}</em>}</strong>
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
        <span>{pt ? "Jogue e converse com seus amigos" : "Play and chat with your friends"}</span>
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

export default function Profile({ onBack, initialUsername = null }) {
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
  const [matchHistory, setMatchHistory] = useState([]);
  const [historySource, setHistorySource] = useState("local");
  const [masteryRows, setMasteryRows] = useState([]);
  const [masterySource, setMasterySource] = useState("local");
  const [selectedMastery, setSelectedMastery] = useState(null);
  const [rankedProfile, setRankedProfile] = useState(null);
  const [rankedHistory, setRankedHistory] = useState([]);
  const [friendRanks, setFriendRanks] = useState({});
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
  const matchStats = useMemo(() => summarizeMatchHistory(matchHistory), [matchHistory]);
  const masteryStats = useMemo(() => summarizeCardMastery(masteryRows), [masteryRows]);
  const rankedStats = useMemo(() => summarizeRankedHistory(rankedHistory), [rankedHistory]);
  const rankedMatches = Number(rankedProfile?.wins || 0) + Number(rankedProfile?.losses || 0);
  const rankedWinRate = rankedMatches ? Math.round((Number(rankedProfile?.wins || 0) / rankedMatches) * 100) : 0;
  const rankTier = String(rankedProfile?.rank?.tier || "unranked").toLowerCase();

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
    let active = true;
    (async () => {
      const history = await loadMatchHistory({ limit: 120 });
      if (!active) return;
      setMatchHistory(history.rows || []);
      setHistorySource(history.source || "local");
      await reconcileMasteryFromHistory(history.rows || []);
      const mastery = await loadCardMastery({ limit: 100 });
      if (!active) return;
      setMasteryRows(mastery.rows || []);
      setMasterySource(mastery.source || "local");
    })();
    return () => { active = false; };
  }, [sessionUser, schema.version]);

  useEffect(() => {
    let active = true;
    if (!accountsEnabled || !sessionUser || !schema.ready) {
      setRankedProfile(null); setRankedHistory([]); setFriendRanks({});
      return () => { active = false; };
    }
    (async () => {
      const [profileResult, historyResult, ranks] = await Promise.all([
        loadRankedProfile(), loadRankedHistory({ limit: 40 }), loadFriendRankedIdentities()
      ]);
      if (!active) return;
      if (profileResult.ok) setRankedProfile(profileResult.profile);
      if (historyResult.ok) setRankedHistory(historyResult.rows || []);
      setFriendRanks(ranks || {});
    })();
    return () => { active = false; };
  }, [sessionUser, schema.version, schema.ready]);

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
    const [social, competitive] = await Promise.all([loadSocialProfile(id), loadPublicRankedIdentity(id)]);
    setRemoteProfile(social ? { ...social, ranked: competitive?.visible === false ? null : competitive } : null);
    setBusy(false);
  }

  const initialProfileOpenedRef = useRef(false);

  useEffect(() => {
    if (!initialUsername || !sessionUser || !schema.ready || initialProfileOpenedRef.current) return;
    initialProfileOpenedRef.current = true;
    (async () => {
      const normalized = String(initialUsername).replace(/^@/, "").trim().toLowerCase();
      const results = await searchProfiles(normalized);
      const exact = (results || []).find((row) => String(row.username || "").toLowerCase() === normalized);
      if (exact) await inspectProfile(exact);
      else flash(pt ? "Perfil do adversário não encontrado." : "Opponent profile not found.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUsername, sessionUser, schema.ready]);

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
    ["statistics", "▥", pt ? "Estatísticas" : "Statistics", 0],
    ["competitive", "♢", pt ? "Competitivo" : "Competitive", 0],
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

      {accountsEnabled && sessionUser && !schema.ready && (
        <div className="social-schema-notice">
          <strong>{pt ? "Alguns recursos sociais estão indisponíveis" : "Some social features are unavailable"}</strong>
          <span>{pt ? "Tente novamente mais tarde. Seu perfil local continua disponível." : "Try again later. Your local profile remains available."}</span>
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
            <span>{pt ? "PRIVACIDADE" : "PRIVACY"}</span>
            <p>{pt ? "Você escolhe quem pode ver seu perfil, enviar mensagens e interagir com você." : "You choose who can view your profile, message you and interact with you."}</p>
          </div>
        </aside>

        <section className="social-hub-content">
          {notice && <div className="social-toast">{notice}</div>}

          {section === "overview" && (
            <div className="social-view social-overview-view">
              <section className={`social-overview-hero social-ranked-frame rank-${rankTier}`} style={profile.banner ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.2),rgba(0,0,0,.82)),url(${profile.banner})` } : undefined}>
                <div className="social-overview-avatar"><SocialAvatar person={{ ...profile, display_name: displayName }} size="hero" /></div>
                <div className="social-overview-copy">
                  <span>{pt ? "DUELISTA" : "DUELIST"}</span>
                  <h2>{displayName}</h2>
                  <small>@{username}</small>
                  {rankedProfile && <div className={`social-rank-badge rank-${rankTier}`}><b>{rankedProfile.rank?.label}</b><span>{rankedProfile.rp} RP · Season 0</span></div>}
                  <p>{profile.bio || (pt ? "Adicione uma bio para contar um pouco sobre você à comunidade." : "Add a bio to tell the community a little about yourself.")}</p>
                </div>
                <div className="social-overview-actions">
                  <button type="button" className="eternal-menu-action" onClick={() => setSection("profile")}>{pt ? "Editar perfil" : "Edit profile"}</button>
                  <button type="button" className="eternal-menu-action" onClick={() => setSection("privacy")}>{pt ? "Privacidade" : "Privacy"}</button>
                </div>
              </section>

              <div className="social-stat-strip">
                <article><span>{pt ? "Partidas" : "Matches"}</span><strong>{matchStats.total}</strong><small>{matchStats.wins} {pt ? "vitórias" : "wins"}</small></article>
                <article><span>{pt ? "Taxa de vitória" : "Win rate"}</span><strong>{matchStats.total ? `${matchStats.winRate}%` : "—"}</strong><small>{matchStats.losses} {pt ? "derrotas" : "losses"}</small></article>
                <article><span>{pt ? "Deck favorito" : "Favorite deck"}</span><strong>{matchStats.favoriteDeck?.name || "—"}</strong><small>{matchStats.favoriteDeck ? `${matchStats.favoriteDeck.matches} ${pt ? "partidas" : "matches"}` : (pt ? "sem dados" : "no data")}</small></article>
                <article><span>{pt ? "Afinidade" : "Affinity"}</span><strong>{(matchStats.primaryColor || insights.primaryColor || "—").toUpperCase()}</strong><small>{matchStats.primaryColor ? (pt ? "baseada em partidas" : "based on matches") : (pt ? "baseada nos decks" : "based on decks")}</small></article>
              </div>

              <section className="social-overview-grid">
                <div className="social-panel social-overview-mastery">
                  <SocialSectionTitle eyebrow="CARD MASTERY" title={pt ? "Cartas em destaque" : "Featured cards"} description={pt ? "Maestria baseada na presença das cartas nos seus decks salvos." : "Mastery based on how strongly cards appear across your saved decks."} action={<button type="button" className="social-text-button" onClick={() => setSection("mastery")}>{pt ? "Ver tudo" : "See all"}</button>} />
                  <div className="social-mastery-row">
                    {masteryRows.slice(0, 3).map((entry) => <MasteryCard key={entry.id} entry={entry} language={language} onClick={setSelectedMastery} />)}
                    {!masteryRows.length && <div className="social-empty-inline">{pt ? "Finalize partidas com um deck salvo para começar sua Maestria." : "Finish matches with a saved deck to start your Mastery."}</div>}
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
              <SocialSectionTitle eyebrow="PLAYER IDENTITY" title={pt ? "Configuração do perfil" : "Profile setup"} description={pt ? "Personalize como sua identidade aparece para outros jogadores." : "Customize how your identity appears to other players."} action={<span className={`social-save-state ${saved ? "saved" : ""}`}>{saved ? (pt ? "SALVO" : "SAVED") : (pt ? "EDITANDO" : "EDITING")}</span>} />

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
                          <button type="button" className="social-person-main" onClick={() => inspectProfile(friend)}><SocialAvatar person={friend} /><span><strong>{friend.is_favorite ? "★ " : ""}{personName(friend)} {friendRanks[personId(friend)]?.rank?.label && <em className={`social-rank-mini rank-${friendRanks[personId(friend)].rank.tier.toLowerCase()}`}>{friendRanks[personId(friend)].rank.label}</em>}</strong><small>{friend.custom_status || presenceLabel(friend, pt)}</small></span></button>
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
              <SocialSectionTitle eyebrow="DIRECT MESSAGES" title={pt ? "Mensagens privadas" : "Private messages"} description={pt ? "Converse com seus amigos e acompanhe mensagens não lidas." : "Chat with friends and keep track of unread messages."} />
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

          {section === "statistics" && (
            <div className="social-view social-statistics-view">
              <SocialSectionTitle
                eyebrow="MATCH HISTORY"
                title={pt ? "Histórico & Estatísticas" : "History & Statistics"}
                description={pt ? "Acompanhe seu desempenho, decks mais usados e partidas recentes." : "Track your performance, most-used decks and recent matches."}
                action={<span className="social-history-source">{pt ? "ATUALIZADO" : "UPDATED"}</span>}
              />

              <div className="social-match-stat-grid">
                <article><span>{pt ? "Partidas" : "Matches"}</span><strong>{matchStats.total}</strong><small>{pt ? "resultados registrados" : "recorded results"}</small></article>
                <article><span>{pt ? "Vitórias" : "Wins"}</span><strong>{matchStats.wins}</strong><small>{matchStats.total ? `${matchStats.winRate}% ${pt ? "de aproveitamento" : "win rate"}` : "—"}</small></article>
                <article><span>{pt ? "Derrotas" : "Losses"}</span><strong>{matchStats.losses}</strong><small>{pt ? "histórico normal" : "normal history"}</small></article>
                <article><span>{pt ? "Duração média" : "Average duration"}</span><strong>{matchStats.averageDuration ? `${Math.floor(matchStats.averageDuration / 60)}m ${matchStats.averageDuration % 60}s` : "—"}</strong><small>{pt ? "tempo de duelo" : "duel time"}</small></article>
                <article><span>{pt ? "Deck mais usado" : "Most used deck"}</span><strong>{matchStats.favoriteDeck?.name || "—"}</strong><small>{matchStats.favoriteDeck ? `${matchStats.favoriteDeck.matches}x` : (pt ? "aguardando partidas" : "waiting for matches")}</small></article>
                <article><span>{pt ? "Cor mais usada" : "Most used color"}</span><strong>{matchStats.primaryColor?.toUpperCase() || "—"}</strong><small>{matchStats.favoriteMode ? `${pt ? "modo" : "mode"}: ${matchStats.favoriteMode.toUpperCase()}` : "—"}</small></article>
              </div>

              <section className="social-panel social-match-history-panel">
                <SocialSectionTitle eyebrow="RECENT MATCHES" title={pt ? "Partidas recentes" : "Recent matches"} description={pt ? "As partidas mais recentes registradas neste perfil." : "The most recent matches recorded on this profile."} />
                <div className="social-match-history-list">
                  {matchHistory.slice(0, 20).map((row) => (
                    <article key={row.match_uid}>
                      <span className={`social-match-result ${row.result === "win" ? "win" : "loss"}`}>{row.result === "win" ? (pt ? "VITÓRIA" : "WIN") : (pt ? "DERROTA" : "LOSS")}</span>
                      <div className="social-match-opponent">
                        <strong>{row.opponent_name || (pt ? "Oponente" : "Opponent")}</strong>
                        <small>{row.opponent_username ? `@${row.opponent_username} · ` : ""}{row.mode === "ai" ? "ETERNAL CPU" : row.mode === "online" ? "ONLINE" : (pt ? "LOCAL" : "LOCAL")}</small>
                      </div>
                      <div className="social-match-deck">
                        <strong>{row.deck_name || (pt ? "Deck não identificado" : "Unidentified deck")}</strong>
                        <small>{Array.isArray(row.deck_colors) && row.deck_colors.length ? row.deck_colors.map((color) => color.toUpperCase()).join(" · ") : (pt ? "sem cor registrada" : "no recorded color")}</small>
                      </div>
                      <div className="social-match-meta">
                        <strong>{Math.floor(Number(row.duration_seconds || 0) / 60)}:{String(Number(row.duration_seconds || 0) % 60).padStart(2, "0")}</strong>
                        <small>{row.turns || 1} {pt ? "turnos" : "turns"} · {formatTime(row.played_at, language)}</small>
                      </div>
                    </article>
                  ))}
                  {!matchHistory.length && <div className="social-big-empty"><b>▥</b><strong>{pt ? "Nenhuma partida registrada" : "No matches recorded"}</strong><span>{pt ? "Finalize uma partida Local, contra a Eternal CPU ou Online para começar seu histórico." : "Finish a Local, Eternal CPU or Online match to start your history."}</span></div>}
                </div>
              </section>

              <section className="social-safety-card"><div><span>{pt ? "HISTÓRICO" : "HISTORY"}</span><h3>{pt ? "Seu desempenho em um só lugar" : "Your performance in one place"}</h3><p>{pt ? "Veja resultados recentes, taxa de vitória, decks favoritos e outras estatísticas das suas partidas." : "See recent results, win rate, favorite decks and other match statistics."}</p></div><strong>✓</strong></section>
            </div>
          )}

          {section === "competitive" && (
            <div className="social-view social-competitive-view">
              <SocialSectionTitle eyebrow="RANKED · SEASON 0" title={pt ? "Identidade competitiva" : "Competitive identity"} description={pt ? "Acompanhe seu Rank, RP, melhor marca da temporada e histórico competitivo." : "Track your Rank, RP, season peak and competitive history."} />
              {rankedProfile ? <>
                <section className={`social-competitive-hero rank-${rankTier}`}>
                  <div className="social-rank-emblem"><span>{rankedProfile.rank?.tier?.slice(0,1) || "R"}</span></div>
                  <div><span>SEASON 0 / PRÉ-TEMPORADA</span><h2>{rankedProfile.rank?.label}</h2><p>{rankedProfile.rp} RP</p></div>
                  <aside><span>{pt ? "Pico da temporada" : "Season peak"}</span><strong>{rankedProfile.peak_rp}</strong><small>{rankedProfile.rank?.label}</small></aside>
                </section>
                <div className="social-match-stat-grid competitive">
                  <article><span>{pt ? "Partidas Ranked" : "Ranked matches"}</span><strong>{rankedMatches}</strong><small>Season 0</small></article>
                  <article><span>{pt ? "Vitórias" : "Wins"}</span><strong>{rankedProfile.wins || 0}</strong><small>{rankedWinRate}% win rate</small></article>
                  <article><span>{pt ? "Derrotas" : "Losses"}</span><strong>{rankedProfile.losses || 0}</strong><small>{pt ? "competitivo" : "competitive"}</small></article>
                  <article><span>{pt ? "Deck mais usado" : "Most used deck"}</span><strong>{rankedStats.favoriteDeck?.name || "—"}</strong><small>{rankedStats.favoriteDeck ? `${rankedStats.favoriteDeck.matches}x` : (pt ? "a partir da v3.7.1" : "from v3.7.1 onward")}</small></article>
                </div>
                <section className="social-panel social-ranked-history-panel">
                  <SocialSectionTitle eyebrow="COMPETITIVE HISTORY" title={pt ? "Histórico Ranked" : "Ranked history"} description={pt ? "Variação de RP e adversários das partidas competitivas recentes." : "RP changes and opponents from recent competitive matches."} />
                  <div className="social-ranked-history-list">
                    {rankedHistory.slice(0,20).map((row) => <article key={row.match_uid} className={row.result}>
                      <b>{row.result === "win" ? (pt ? "VITÓRIA" : "WIN") : (pt ? "DERROTA" : "LOSS")}</b>
                      <div><strong>{row.opponent_name || (pt ? "Oponente" : "Opponent")}</strong><small>{row.opponent_username ? `@${row.opponent_username}` : formatTime(row.played_at, language)}</small></div>
                      <div><strong>{row.deck_name || (pt ? "Deck não registrado" : "Deck not recorded")}</strong><small>{row.end_reason === "forfeit" ? (pt ? "abandono" : "forfeit") : "Season 0"}</small></div>
                      <em>{Number(row.rp_delta) >= 0 ? "+" : ""}{row.rp_delta} RP</em>
                    </article>)}
                    {!rankedHistory.length && <div className="social-big-empty"><b>♢</b><strong>{pt ? "Sem partidas Ranked ainda" : "No Ranked matches yet"}</strong><span>{pt ? "As próximas partidas da Season 0 aparecerão aqui." : "Your next Season 0 matches will appear here."}</span></div>}
                  </div>
                </section>
              </> : <div className="social-big-empty"><b>♢</b><strong>{pt ? "Identidade competitiva indisponível" : "Competitive identity unavailable"}</strong><span>{pt ? "Entre na sua conta para acessar seus dados competitivos." : "Sign in to access your competitive data."}</span></div>}
            </div>
          )}

          {section === "mastery" && (
            <div className="social-view social-mastery-view">
              <SocialSectionTitle eyebrow="CARD MASTERY 2.0" title={pt ? "Maestria de cartas" : "Card Mastery"} description={pt ? "Agora a progressão vem das cartas presentes no deck realmente usado em partidas finalizadas. Cada partida concede XP; vitórias e a carta de capa concedem bônus." : "Progress now comes from cards in the deck actually used in finished matches. Each match grants XP, with bonuses for wins and the deck cover card."} />
              <div className="social-mastery-summary"><article><span>{pt ? "Líder" : "Leader"}</span><strong>{masteryStats.leader?.name || "—"}</strong><small>{masteryStats.leader ? formatMasteryLabel(masteryStats.leader.level, language) : "—"}</small></article><article><span>{pt ? "Cartas rastreadas" : "Tracked cards"}</span><strong>{masteryStats.trackedCards}</strong><small>{masteryStats.totalXp} XP {pt ? "acumulado" : "earned"}</small></article><article><span>{pt ? "Maior nível" : "Highest level"}</span><strong>{masteryStats.maxLevel ? formatMasteryLabel(masteryStats.maxLevel, language) : "—"}</strong><small>{pt ? "progresso de Maestria" : "Mastery progress"}</small></article></div>
              <div className="social-mastery-rules"><span>XP</span><b>+40 {pt ? "por partida" : "per match"}</b><b>+20 {pt ? "por vitória" : "per win"}</b><b>+15 {pt ? "se for carta de capa" : "when used as cover"}</b><small>{pt ? "Uma carta recebe XP no máximo uma vez por partida, independentemente da quantidade de cópias no deck." : "A card receives XP at most once per match, regardless of how many copies are in the deck."}</small></div>
              <div className="social-mastery-grid">
                {masteryRows.map((entry) => <MasteryCard key={entry.id} entry={entry} language={language} onClick={setSelectedMastery} />)}
                {!masteryRows.length && <div className="social-big-empty"><b>◆</b><strong>{pt ? "Maestria ainda vazia" : "Mastery is empty"}</strong><span>{pt ? "Finalize uma partida usando um deck salvo para registrar as cartas e começar a ganhar XP." : "Finish a match using a saved deck to register its cards and start earning XP."}</span></div>}
              </div>
            </div>
          )}

          {section === "privacy" && (
            <div className="social-view social-privacy-view">
              <SocialSectionTitle eyebrow="PRIVACY & SAFETY" title={pt ? "Privacidade do jogador" : "Player privacy"} description={pt ? "Defina quem pode encontrar, ver e interagir com seu perfil." : "Choose who can find, view and interact with your profile."} />

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

              <section className="social-safety-card"><div><span>{pt ? "CONTROLE DE PRIVACIDADE" : "PRIVACY CONTROL"}</span><h3>{pt ? "Você decide o que compartilhar" : "You decide what to share"}</h3><p>{pt ? "Ajuste a visibilidade do perfil, mensagens, buscas, estatísticas, decks e Maestria a qualquer momento." : "Adjust profile visibility, messages, search, statistics, decks and Mastery at any time."}</p></div><strong>✓</strong></section>

              {blocked.length > 0 && <section className="social-panel social-blocked-panel"><h3>{pt ? "Jogadores bloqueados" : "Blocked players"}</h3>{blocked.map((person) => <article key={personId(person)}><SocialAvatar person={person} size="small" /><span><strong>{personName(person)}</strong><small>@{person.username}</small></span><button type="button" onClick={() => handleUnblock(person)}>{pt ? "Desbloquear" : "Unblock"}</button></article>)}</section>}
              <footer className="social-view-actions"><span>{pt ? "Suas preferências de privacidade" : "Your privacy preferences"}</span><button type="button" className="eternal-menu-action active" onClick={savePrivacy}>{pt ? "Salvar privacidade" : "Save privacy"}</button></footer>
            </div>
          )}
        </section>

        <FriendDock friends={friends} friendRanks={friendRanks} pt={pt} onChat={openChat} onManage={() => setSection("friends")} />
      </section>

      {remoteProfile && (
        <div className="social-profile-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRemoteProfile(null)}>
          <section className="social-profile-preview" style={remoteProfile.banner ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.22),rgba(0,0,0,.92)),url(${remoteProfile.banner})` } : undefined}>
            <button type="button" className="social-profile-preview-close" onClick={() => setRemoteProfile(null)}>×</button>
            <SocialAvatar person={remoteProfile} size="hero" />
            <span>{remoteProfile.can_view === false ? (pt ? "PERFIL PRIVADO" : "PRIVATE PROFILE") : "PLAYER PROFILE"}</span>
            <h2>{personName(remoteProfile)}</h2>
            <small>@{remoteProfile.username}</small>
            {remoteProfile.ranked && <div className={`social-rank-badge remote rank-${String(remoteProfile.ranked.rank?.tier || "unranked").toLowerCase()}`}><b>{remoteProfile.ranked.rank?.label}</b><span>{remoteProfile.ranked.rp} RP · Season 0</span></div>}
            <p>{remoteProfile.bio || (remoteProfile.can_view === false ? (pt ? "Este jogador limitou a visualização do perfil." : "This player limited profile visibility.") : "")}</p>
            <div className="social-profile-preview-actions">
              {(remoteProfile.is_friend || remoteProfile.can_message) && <button type="button" onClick={() => { openChat(remoteProfile); setRemoteProfile(null); }}>{pt ? "Mensagem" : "Message"}</button>}
              {remoteProfile.is_friend && <button type="button" onClick={() => handleRemoveFriend(remoteProfile)}>{pt ? "Remover amigo" : "Remove friend"}</button>}
              <button type="button" className="danger" onClick={() => handleBlock(remoteProfile)}>{pt ? "Bloquear" : "Block"}</button>
            </div>
          </section>
        </div>
      )}


      {selectedMastery && (() => {
        const next = selectedMastery.nextPoints;
        const currentFloor = Math.max(0, Number(selectedMastery.level > 1 ? [0,250,650,1300,2300,3800,6000][selectedMastery.level - 1] : 0));
        const progress = next ? Math.max(0, Math.min(100, ((selectedMastery.xp - currentFloor) / Math.max(1, next - currentFloor)) * 100)) : 100;
        const winRate = selectedMastery.matches ? Math.round((selectedMastery.wins / selectedMastery.matches) * 100) : 0;
        return <div className="social-profile-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMastery(null)}>
          <section className="social-mastery-detail">
            <button type="button" className="social-profile-preview-close" onClick={() => setSelectedMastery(null)}>×</button>
            <div className="social-mastery-detail-art">{selectedMastery.image ? <img src={selectedMastery.image} alt="" /> : <b>{getInitials(selectedMastery.name)}</b>}</div>
            <div className="social-mastery-detail-copy">
              <span>CARD MASTERY 2.0</span><h2>{selectedMastery.name}</h2><small>{selectedMastery.cardId}</small>
              <div className="social-mastery-level-line"><strong>{formatMasteryLabel(selectedMastery.level, language)}</strong><b>{selectedMastery.xp} XP</b></div>
              <div className="social-mastery-progress"><i style={{ width: `${progress}%` }} /></div>
              <p>{next ? `${next - selectedMastery.xp} XP ${pt ? "para o próximo nível" : "to the next level"}` : (pt ? "Nível máximo alcançado" : "Maximum level reached")}</p>
              <div className="social-mastery-detail-stats"><article><span>{pt ? "Partidas" : "Matches"}</span><strong>{selectedMastery.matches}</strong></article><article><span>{pt ? "Vitórias" : "Wins"}</span><strong>{selectedMastery.wins}</strong><small>{winRate}%</small></article><article><span>{pt ? "Carta de capa" : "Cover card"}</span><strong>{selectedMastery.coverMatches}</strong></article></div>
            </div>
          </section>
        </div>;
      })()}
    </main>
  );
}
