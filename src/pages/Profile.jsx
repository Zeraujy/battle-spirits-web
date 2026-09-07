import { useEffect, useState } from "react";
import { getProfile, saveProfile } from "../services/storage.js";
import { accountsEnabled } from "../services/supabase.js";
import { loadDirectMessages, loadFriends, searchProfiles, sendDirectMessage, sendFriendRequest, syncProfileToCloud } from "../services/socialService.js";
import { useLanguage } from "../i18n.jsx";

function readImage(file, max, done) {
  if (!file) return;
  if (file.size > max) return alert(`Imagem muito grande. Máximo: ${Math.round(max/1_000_000)} MB.`);
  const reader = new FileReader(); reader.onload = () => done(reader.result); reader.readAsDataURL(file);
}

export default function Profile({ onBack }) {
  const { language } = useLanguage(); const pt = language !== "en";
  const [profile, setProfile] = useState(getProfile()); const [saved, setSaved] = useState(false);
  const [tab,setTab] = useState("profile"); const [query,setQuery] = useState(""); const [results,setResults] = useState([]); const [friends,setFriends] = useState([]);
  const [friend,setFriend] = useState(null); const [messages,setMessages] = useState([]); const [chatText,setChatText] = useState("");
  useEffect(()=>{ if (accountsEnabled) loadFriends().then(setFriends); },[]);
  async function save() {
    const next = { ...profile, username:String(profile.username||"").trim().toLowerCase(), displayName:String(profile.displayName||profile.name||"").trim() || (pt?"Jogador":"Player") };
    next.name = next.displayName; saveProfile(next); setProfile(next); setSaved(true); setTimeout(()=>setSaved(false),1800);
    if (accountsEnabled) syncProfileToCloud(next).catch(()=>{});
  }
  async function doSearch() { setResults(await searchProfiles(query)); }
  async function addFriend(id) { await sendFriendRequest(id); setFriends(await loadFriends()); }
  async function openChat(f) { setFriend(f); setMessages(await loadDirectMessages(f.friend_id || f.id)); setTab("chat"); }
  async function sendMessage(e) { e.preventDefault(); if (!friend || !chatText.trim()) return; const id=friend.friend_id||friend.id; const r=await sendDirectMessage(id,chatText); if(r.ok){setChatText("");setMessages(await loadDirectMessages(id));} }
  return <main className="standard-page profile-social-page">
    <header className="page-header"><button className="ghost" onClick={onBack}>{pt?"← Voltar":"← Back"}</button><div><span className="eyebrow">PLAYER PROFILE</span><h1>{pt?"Meu perfil":"My profile"}</h1></div></header>
    <section className="panel social-profile-shell">
      <div className="profile-banner" style={profile.banner?{backgroundImage:`linear-gradient(0deg,rgba(4,9,16,.55),rgba(4,9,16,.08)),url(${profile.banner})`}:undefined}>
        <label className="banner-edit">✦ {pt?"Trocar banner":"Change banner"}<input hidden type="file" accept="image/*" onChange={(e)=>readImage(e.target.files?.[0],4_000_000,(banner)=>setProfile({...profile,banner}))}/></label>
        <div className="profile-avatar-social">{profile.avatar?<img src={profile.avatar} alt="Avatar"/>:<span>{(profile.displayName||profile.name||"J").slice(0,1).toUpperCase()}</span>}<label className="avatar-edit">✎<input hidden type="file" accept="image/*" onChange={(e)=>readImage(e.target.files?.[0],2_000_000,(avatar)=>setProfile({...profile,avatar}))}/></label></div>
      </div>
      <div className="profile-social-heading"><div><h2>{profile.displayName||profile.name||"Jogador"}</h2><span>@{profile.username||"username"}</span></div><div className="profile-tabs"><button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>{pt?"Perfil":"Profile"}</button><button className={tab==="friends"?"active":""} onClick={()=>setTab("friends")}>{pt?"Amigos":"Friends"}</button>{friend&&<button className={tab==="chat"?"active":""} onClick={()=>setTab("chat")}>Chat</button>}</div></div>
      {tab==="profile"&&<div className="profile-edit-grid"><label>{pt?"Nome de exibição":"Display name"}<input maxLength={40} value={profile.displayName||profile.name||""} onChange={(e)=>setProfile({...profile,displayName:e.target.value,name:e.target.value})}/></label><label>{pt?"Nome de usuário":"Username"}<input maxLength={24} value={profile.username||""} onChange={(e)=>setProfile({...profile,username:e.target.value.replace(/[^a-zA-Z0-9_.-]/g,"")})}/></label><label className="bio-field">Bio<textarea maxLength={240} value={profile.bio||""} onChange={(e)=>setProfile({...profile,bio:e.target.value})} placeholder={pt?"Conte um pouco sobre você...":"Tell other players about yourself..."}/></label><div className="row-actions"><button className="primary-btn" onClick={save}>{pt?"Salvar perfil":"Save profile"}</button>{saved&&<span className="success-text">{pt?"Perfil salvo.":"Profile saved."}</span>}</div></div>}
      {tab==="friends"&&<div className="friends-layout">{accountsEnabled?<><div className="friend-search"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={pt?"Buscar @usuário ou nome...":"Search @username or name..."}/><button onClick={doSearch}>{pt?"Buscar":"Search"}</button></div>{results.length>0&&<div className="social-list">{results.map((p)=><div key={p.id}><div className="mini-avatar">{p.avatar?<img src={p.avatar}/>:<span>{(p.display_name||p.username||"J")[0]}</span>}</div><div><b>{p.display_name}</b><small>@{p.username}</small></div><button onClick={()=>addFriend(p.id)}>+ {pt?"Amigo":"Friend"}</button></div>)}</div>}<h3>{pt?"Meus amigos":"My friends"}</h3><div className="social-list">{friends.length?friends.map((f)=><div key={f.friend_id||f.id}><div className="mini-avatar">{f.avatar?<img src={f.avatar}/>:<span>{(f.display_name||f.username||"J")[0]}</span>}</div><div><b>{f.display_name}</b><small>@{f.username}</small></div><button onClick={()=>openChat(f)}>CHAT</button></div>):<p className="muted">{pt?"Nenhum amigo ainda.":"No friends yet."}</p>}</div></>:<div className="notice-text">{pt?"Amigos online e mensagens ficam disponíveis quando o Supabase da conta estiver configurado. Seu perfil visual funciona normalmente offline.":"Online friends and messages become available when account Supabase is configured. Your visual profile still works offline."}</div>}</div>}
      {tab==="chat"&&friend&&<div className="direct-chat"><header><b>{friend.display_name}</b><span>@{friend.username}</span></header><div className="direct-messages">{messages.map((m)=><div key={m.id} className="direct-message"><small>{new Date(m.created_at).toLocaleString()}</small><p>{m.text}</p></div>)}</div><form onSubmit={sendMessage}><input value={chatText} onChange={(e)=>setChatText(e.target.value)} maxLength={1000} placeholder={pt?"Mensagem...":"Message..."}/><button className="primary-btn">{pt?"Enviar":"Send"}</button></form></div>}
    </section>
  </main>;
}
