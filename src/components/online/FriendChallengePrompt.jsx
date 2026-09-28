export default function FriendChallengePrompt({ challenge, busy = false, onAccept, onDecline }) {
  if (!challenge) return null;
  const profile = challenge.challengerProfile || {};
  const name = profile.name || profile.displayName || "Jogador";
  return (
    <div className="friend-challenge-overlay" role="dialog" aria-modal="true" aria-label="Desafio de amigo">
      <section className="friend-challenge-card">
        <span className="friend-challenge-kicker">FRIEND CHALLENGE</span>
        <div className="friend-challenge-identity">
          <div className="friend-challenge-avatar">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{String(name).slice(0, 1).toUpperCase()}</span>}
          </div>
          <div>
            <strong>{name}</strong>
            <small>{profile.username ? `@${profile.username}` : "Amigo Online"}</small>
          </div>
        </div>
        <p>quer desafiar você para uma partida privada.</p>
        <div className="friend-challenge-actions">
          <button type="button" disabled={busy} onClick={onDecline}>Recusar</button>
          <button type="button" className="primary" disabled={busy} onClick={onAccept}>{busy ? "Preparando..." : "Aceitar desafio"}</button>
        </div>
      </section>
    </div>
  );
}
