import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  getProfile,
  saveProfile
} from "../services/storage.js";

import {
  accountsEnabled
} from "../services/supabase.js";

import {
  loadDirectMessages,
  loadFriends,
  searchProfiles,
  sendDirectMessage,
  sendFriendRequest,
  syncProfileToCloud
} from "../services/socialService.js";

import {
  useLanguage
} from "../i18n.jsx";

import "../styles/profile.css";


function readImage(
  file,
  max,
  done
) {
  if (!file) {
    return;
  }

  if (
    file.size >
    max
  ) {
    alert(
      `Imagem muito grande. Máximo: ${
        Math.round(
          max /
          1_000_000
        )
      } MB.`
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload =
    () =>
      done(
        reader.result
      );

  reader.readAsDataURL(
    file
  );
}


function getInitials(
  value
) {
  const parts =
    String(
      value ||
      "Player"
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) {
    return "P";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}


function SocialPersonRow({
  person,
  actionLabel,
  onAction
}) {
  const name =
    person.display_name ||
    person.displayName ||
    person.name ||
    person.username ||
    "Player";

  const username =
    person.username ||
    "";

  const avatar =
    person.avatar ||
    null;

  return (
    <div className="profile-v2-person-row">

      <div className="profile-v2-mini-avatar">
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
                name
              )}
            </span>
          )}
      </div>


      <div className="profile-v2-person-copy">
        <strong>
          {name}
        </strong>

        <small>
          {username
            ? `@${username}`
            : ""}
        </small>
      </div>


      <button
        type="button"
        onClick={
          onAction
        }
      >
        {actionLabel}
      </button>

    </div>
  );
}


export default function Profile({
  onBack
}) {
  const {
    language
  } =
    useLanguage();

  const pt =
    language !== "en";

  const [
    profile,
    setProfile
  ] =
    useState(
      getProfile()
    );

  const [
    saved,
    setSaved
  ] =
    useState(
      false
    );

  const [
    tab,
    setTab
  ] =
    useState(
      "profile"
    );

  const [
    query,
    setQuery
  ] =
    useState(
      ""
    );

  const [
    results,
    setResults
  ] =
    useState(
      []
    );

  const [
    friends,
    setFriends
  ] =
    useState(
      []
    );

  const [
    friend,
    setFriend
  ] =
    useState(
      null
    );

  const [
    messages,
    setMessages
  ] =
    useState(
      []
    );

  const [
    chatText,
    setChatText
  ] =
    useState(
      ""
    );


  useEffect(
    () => {
      if (
        accountsEnabled
      ) {
        loadFriends()
          .then(
            setFriends
          );
      }
    },
    []
  );


  const displayName =
    profile.displayName ||
    profile.name ||
    (
      pt
        ? "Jogador"
        : "Player"
    );

  const username =
    profile.username ||
    "username";

  const avatar =
    profile.avatar ||
    null;

  const bioLength =
    String(
      profile.bio ||
      ""
    ).length;


  const profileModeLabel =
    accountsEnabled
      ? (
        pt
          ? "CLOUD PROFILE"
          : "CLOUD PROFILE"
      )
      : (
        pt
          ? "PERFIL LOCAL"
          : "LOCAL PROFILE"
      );


  const bannerStyle =
    useMemo(
      () =>
        profile.banner
          ? {
              backgroundImage:
                `linear-gradient(0deg,rgba(4,9,16,.72),rgba(4,9,16,.04) 68%),url(${profile.banner})`
            }
          : undefined,
      [
        profile.banner
      ]
    );


  async function save() {
    const next = {
      ...profile,

      username:
        String(
          profile.username ||
          ""
        )
          .trim()
          .toLowerCase(),

      displayName:
        String(
          profile.displayName ||
          profile.name ||
          ""
        )
          .trim() ||
        (
          pt
            ? "Jogador"
            : "Player"
        )
    };

    next.name =
      next.displayName;

    saveProfile(
      next
    );

    setProfile(
      next
    );

    setSaved(
      true
    );

    setTimeout(
      () =>
        setSaved(
          false
        ),
      1800
    );

    if (
      accountsEnabled
    ) {
      syncProfileToCloud(
        next
      ).catch(
        () => {}
      );
    }
  }


  async function doSearch() {
    setResults(
      await searchProfiles(
        query
      )
    );
  }


  async function addFriend(
    id
  ) {
    await sendFriendRequest(
      id
    );

    setFriends(
      await loadFriends()
    );
  }


  async function openChat(
    selectedFriend
  ) {
    setFriend(
      selectedFriend
    );

    setMessages(
      await loadDirectMessages(
        selectedFriend.friend_id ||
        selectedFriend.id
      )
    );

    setTab(
      "chat"
    );
  }


  async function sendMessage(
    event
  ) {
    event.preventDefault();

    if (
      !friend ||
      !chatText.trim()
    ) {
      return;
    }

    const id =
      friend.friend_id ||
      friend.id;

    const result =
      await sendDirectMessage(
        id,
        chatText
      );

    if (
      result.ok
    ) {
      setChatText(
        ""
      );

      setMessages(
        await loadDirectMessages(
          id
        )
      );
    }
  }


  return (
    <main className="standard-page profile-v2-page">

      <header className="profile-v2-topbar">

        <button
          className="ghost profile-v2-back"
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


        <div className="profile-v2-title">

          <span className="eyebrow">
            PLAYER PROFILE
          </span>

          <h1>
            {pt
              ? "Meu perfil"
              : "My profile"}
          </h1>

          <p>
            {pt
              ? "Personalize sua identidade e conecte-se com outros jogadores."
              : "Customize your identity and connect with other players."}
          </p>

        </div>


        <div
          className={
            `profile-v2-mode ${
              accountsEnabled
                ? "online"
                : "local"
            }`
          }
        >
          <i />

          <div>
            <span>
              PROFILE
            </span>

            <strong>
              {accountsEnabled
                ? "ONLINE"
                : "LOCAL"}
            </strong>
          </div>
        </div>

      </header>


      <section className="profile-v2-shell">

        <section
          className="profile-v2-hero"
          style={
            bannerStyle
          }
        >

          <div className="profile-v2-hero-overlay" />


          <label className="profile-v2-banner-edit">

            <span aria-hidden="true">
              ✦
            </span>

            {pt
              ? "Trocar banner"
              : "Change banner"}

            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(
                event
              ) =>
                readImage(
                  event
                    .target
                    .files?.[0],

                  4_000_000,

                  (
                    banner
                  ) =>
                    setProfile({
                      ...profile,
                      banner
                    })
                )
              }
            />

          </label>


          <div className="profile-v2-hero-copy">

            <span className="eyebrow">
              {profileModeLabel}
            </span>

            <h2>
              {displayName}
            </h2>

            <p>
              @{username}
            </p>

          </div>

        </section>


        <section className="profile-v2-identity-bar">

          <div className="profile-v2-avatar-wrap">

            <div className="profile-v2-avatar">
              {avatar
                ? (
                  <img
                    src={avatar}
                    alt="Avatar"
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


            <label className="profile-v2-avatar-edit">
              ✎

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(
                  event
                ) =>
                  readImage(
                    event
                      .target
                      .files?.[0],

                    2_000_000,

                    (
                      nextAvatar
                    ) =>
                      setProfile({
                        ...profile,

                        avatar:
                          nextAvatar
                      })
                  )
                }
              />
            </label>

          </div>


          <div className="profile-v2-identity-copy">

            <span>
              {pt
                ? "DUELISTA"
                : "DUELIST"}
            </span>

            <strong>
              {displayName}
            </strong>

            <small>
              @{username}
            </small>

          </div>


          <nav className="profile-v2-tabs">

            <button
              type="button"
              className={
                tab ===
                "profile"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "profile"
                )
              }
            >
              {pt
                ? "Perfil"
                : "Profile"}
            </button>


            <button
              type="button"
              className={
                tab ===
                "friends"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  "friends"
                )
              }
            >
              {pt
                ? "Amigos"
                : "Friends"}

              {friends.length >
                0 && (
                <span>
                  {friends.length}
                </span>
              )}
            </button>


            {friend && (
              <button
                type="button"
                className={
                  tab ===
                  "chat"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setTab(
                    "chat"
                  )
                }
              >
                Chat
              </button>
            )}

          </nav>

        </section>


        {tab ===
          "profile" && (
          <section className="profile-v2-content">

            <div className="profile-v2-section-heading">

              <div>
                <span className="eyebrow">
                  PROFILE SETTINGS
                </span>

                <h3>
                  {pt
                    ? "Informações do jogador"
                    : "Player information"}
                </h3>

                <p>
                  {pt
                    ? "Esses dados aparecem no seu perfil e nas áreas sociais."
                    : "This information appears on your profile and social areas."}
                </p>
              </div>


              <div className="profile-v2-save-state">
                <i />

                <span>
                  {saved
                    ? (
                      pt
                        ? "SALVO"
                        : "SAVED"
                    )
                    : (
                      pt
                        ? "EDITANDO"
                        : "EDITING"
                    )}
                </span>
              </div>

            </div>


            <div className="profile-v2-edit-grid">

              <label>
                <span>
                  {pt
                    ? "Nome de exibição"
                    : "Display name"}
                </span>

                <input
                  maxLength={40}
                  value={
                    profile.displayName ||
                    profile.name ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setProfile({
                      ...profile,

                      displayName:
                        event.target.value,

                      name:
                        event.target.value
                    })
                  }
                />
              </label>


              <label>
                <span>
                  {pt
                    ? "Nome de usuário"
                    : "Username"}
                </span>

                <div className="profile-v2-username-input">
                  <b>
                    @
                  </b>

                  <input
                    maxLength={24}
                    value={
                      profile.username ||
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      setProfile({
                        ...profile,

                        username:
                          event.target.value
                            .replace(
                              /[^a-zA-Z0-9_.-]/g,
                              ""
                            )
                      })
                    }
                  />
                </div>
              </label>


              <label className="profile-v2-bio-field">

                <div className="profile-v2-label-row">
                  <span>
                    Bio
                  </span>

                  <small>
                    {bioLength}/240
                  </small>
                </div>

                <textarea
                  maxLength={240}
                  value={
                    profile.bio ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    setProfile({
                      ...profile,

                      bio:
                        event.target.value
                    })
                  }
                  placeholder={
                    pt
                      ? "Conte um pouco sobre você..."
                      : "Tell other players about yourself..."
                  }
                />

              </label>

            </div>


            <footer className="profile-v2-profile-actions">

              <div>
                <span>
                  {accountsEnabled
                    ? (
                      pt
                        ? "As alterações também serão sincronizadas com a nuvem."
                        : "Changes will also sync to the cloud."
                    )
                    : (
                      pt
                        ? "As alterações serão salvas neste dispositivo."
                        : "Changes will be saved on this device."
                    )}
                </span>
              </div>


              <button
                className="primary-btn big profile-v2-save-button"
                onClick={
                  save
                }
              >
                <span>
                  {pt
                    ? "Salvar perfil"
                    : "Save profile"}
                </span>

                <b aria-hidden="true">
                  ✓
                </b>
              </button>

            </footer>

          </section>
        )}


        {tab ===
          "friends" && (
          <section className="profile-v2-content">

            {accountsEnabled ? (
              <>
                <section className="profile-v2-friends-search">

                  <div className="profile-v2-section-heading">

                    <div>
                      <span className="eyebrow">
                        SOCIAL
                      </span>

                      <h3>
                        {pt
                          ? "Encontrar jogadores"
                          : "Find players"}
                      </h3>

                      <p>
                        {pt
                          ? "Busque pelo nome de usuário ou nome de exibição."
                          : "Search by username or display name."}
                      </p>
                    </div>

                  </div>


                  <div className="profile-v2-search-row">

                    <input
                      value={
                        query
                      }
                      onChange={(
                        event
                      ) =>
                        setQuery(
                          event.target.value
                        )
                      }
                      placeholder={
                        pt
                          ? "Buscar @usuário ou nome..."
                          : "Search @username or name..."
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          doSearch();
                        }
                      }}
                    />


                    <button
                      className="primary-btn"
                      onClick={
                        doSearch
                      }
                    >
                      {pt
                        ? "Buscar"
                        : "Search"}
                    </button>

                  </div>

                </section>


                {results.length >
                  0 && (
                  <section className="profile-v2-social-block">

                    <header>
                      <span className="eyebrow">
                        {pt
                          ? "RESULTADOS"
                          : "RESULTS"}
                      </span>

                      <strong>
                        {results.length}
                      </strong>
                    </header>


                    <div className="profile-v2-people-list">

                      {results.map(
                        (
                          person
                        ) => (
                          <SocialPersonRow
                            key={
                              person.id
                            }
                            person={
                              person
                            }
                            actionLabel={
                              `+ ${
                                pt
                                  ? "Amigo"
                                  : "Friend"
                              }`
                            }
                            onAction={() =>
                              addFriend(
                                person.id
                              )
                            }
                          />
                        )
                      )}

                    </div>

                  </section>
                )}


                <section className="profile-v2-social-block">

                  <header>
                    <span className="eyebrow">
                      {pt
                        ? "MEUS AMIGOS"
                        : "MY FRIENDS"}
                    </span>

                    <strong>
                      {friends.length}
                    </strong>
                  </header>


                  {friends.length ? (
                    <div className="profile-v2-people-list">

                      {friends.map(
                        (
                          currentFriend
                        ) => (
                          <SocialPersonRow
                            key={
                              currentFriend.friend_id ||
                              currentFriend.id
                            }
                            person={
                              currentFriend
                            }
                            actionLabel="CHAT"
                            onAction={() =>
                              openChat(
                                currentFriend
                              )
                            }
                          />
                        )
                      )}

                    </div>
                  ) : (
                    <div className="profile-v2-empty-social">

                      <span>
                        ◇
                      </span>

                      <strong>
                        {pt
                          ? "Nenhum amigo ainda"
                          : "No friends yet"}
                      </strong>

                      <small>
                        {pt
                          ? "Use a busca acima para encontrar outros jogadores."
                          : "Use the search above to find other players."}
                      </small>

                    </div>
                  )}

                </section>
              </>
            ) : (
              <div className="profile-v2-offline-social">

                <span className="profile-v2-info-icon">
                  ◈
                </span>

                <div>
                  <h3>
                    {pt
                      ? "Recursos sociais offline"
                      : "Social features offline"}
                  </h3>

                  <p>
                    {pt
                      ? "Amigos online e mensagens ficam disponíveis quando o Supabase da conta estiver configurado. Seu perfil visual continua funcionando normalmente offline."
                      : "Online friends and messages become available when account Supabase is configured. Your visual profile still works offline."}
                  </p>
                </div>

              </div>
            )}

          </section>
        )}


        {tab ===
          "chat" &&
          friend && (
          <section className="profile-v2-chat">

            <header className="profile-v2-chat-header">

              <div className="profile-v2-mini-avatar large">
                {friend.avatar
                  ? (
                    <img
                      src={
                        friend.avatar
                      }
                      alt=""
                    />
                  )
                  : (
                    <span>
                      {getInitials(
                        friend.display_name ||
                        friend.username
                      )}
                    </span>
                  )}
              </div>


              <div>
                <span className="eyebrow">
                  DIRECT MESSAGE
                </span>

                <h3>
                  {friend.display_name}
                </h3>

                <p>
                  @{friend.username}
                </p>
              </div>

            </header>


            <div className="profile-v2-messages">

              {messages.length ? (
                messages.map(
                  (
                    message
                  ) => (
                    <div
                      key={
                        message.id
                      }
                      className="profile-v2-message"
                    >
                      <small>
                        {
                          new Date(
                            message.created_at
                          )
                            .toLocaleString()
                        }
                      </small>

                      <p>
                        {message.text}
                      </p>
                    </div>
                  )
                )
              ) : (
                <div className="profile-v2-empty-chat">

                  <span>
                    ✦
                  </span>

                  <strong>
                    {pt
                      ? "Comece a conversa"
                      : "Start the conversation"}
                  </strong>

                </div>
              )}

            </div>


            <form
              className="profile-v2-chat-compose"
              onSubmit={
                sendMessage
              }
            >

              <input
                value={
                  chatText
                }
                onChange={(
                  event
                ) =>
                  setChatText(
                    event.target.value
                  )
                }
                maxLength={1000}
                placeholder={
                  pt
                    ? "Mensagem..."
                    : "Message..."
                }
              />


              <button className="primary-btn">
                {pt
                  ? "Enviar"
                  : "Send"}
              </button>

            </form>

          </section>
        )}

      </section>

    </main>
  );
}
