export default function ArenaChatPanel({ messages = [], enabled = true }) {
  return (
    <section className="arena-redesign-utility-section arena-redesign-chat" aria-label="Arena chat">
      <header className="arena-redesign-utility-title">Chat</header>
      {!enabled ? (
        <div className="arena-redesign-utility-empty">Chat unavailable</div>
      ) : messages.length ? (
        <div className="arena-redesign-chat-messages">
          {messages.map((message) => (
            <article key={message.id} className={message.own ? "is-own" : ""}>
              <strong>{message.author}</strong>
              <span>{message.text}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="arena-redesign-utility-empty">No messages</div>
      )}
    </section>
  );
}
