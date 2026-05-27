import { signOut } from "@/auth";

import styles from "./LogoutButton.module.css";

export default function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button className={styles.button} type="submit">
        Cerrar sesión
      </button>
    </form>
  );
}
