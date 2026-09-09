import { useLanguage } from "../i18n.jsx";

export default function Modal({
  title,
  children,
  onClose,
  className = ""
}) {
  const {
    language
  } = useLanguage();

  return (
    <div
      className="modal-backdrop"
      onMouseDown={
        onClose
      }
    >
      <section
        className={
          `modal ${className}`.trim()
        }

        onMouseDown={
          (e) =>
            e.stopPropagation()
        }
      >
        <header>
          <h2>
            {title}
          </h2>

          {onClose && (
            <button
              className="ghost"
              onClick={
                onClose
              }
            >
              {language === "en"
                ? "Close"
                : "Fechar"}
            </button>
          )}
        </header>

        {children}
      </section>
    </div>
  );
}
