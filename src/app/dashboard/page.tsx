import { redirect } from "next/navigation";

import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>Dashboard de prueba</h1>
        <p className={styles.description}>
          Esta pantalla confirma que la autenticación con Google pasó por Auth.js y
          por la autorización existente en base de datos.
        </p>

        <div className={styles.dataList}>
          <div className={styles.dataRow}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{session.user.email}</span>
          </div>

          <div className={styles.dataRow}>
            <span className={styles.label}>Nombre</span>
            <span className={styles.value}>{session.user.name ?? "Sin nombre"}</span>
          </div>
        </div>

        <LogoutButton />
      </section>
    </main>
  );
}
