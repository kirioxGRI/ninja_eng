import { signOut } from "@/auth";

import styles from "./TopbarUserMenu.module.css";

type TopbarUserMenuProps = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
};

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((token) => token[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TopbarUserMenu({
  email,
  image,
  name,
}: TopbarUserMenuProps) {
  const initials = getInitials(name, email);
  const displayName = name?.trim() || "Usuario";

  return (
    <details className={styles.menu}>
      <summary className={styles.trigger} aria-label="Abrir menú de usuario">
        {image ? (
          <img
            alt={displayName}
            className={styles.avatarImage}
            referrerPolicy="no-referrer"
            src={image}
          />
        ) : (
          <span className={styles.avatar}>{initials}</span>
        )}
      </summary>

      <div className={styles.panel}>
        <div className={styles.identity}>
          {image ? (
            <img
              alt={displayName}
              className={styles.avatarImage}
              referrerPolicy="no-referrer"
              src={image}
            />
          ) : (
            <span className={styles.avatar}>{initials}</span>
          )}

          <div className={styles.identityText}>
            <div className={styles.name}>{displayName}</div>
            <div className={styles.email}>{email || "Sin correo"}</div>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className={styles.logoutForm}
        >
          <button className={styles.logoutButton} type="submit">
            Cerrar sesión
          </button>
        </form>
      </div>
    </details>
  );
}
