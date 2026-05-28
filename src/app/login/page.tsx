import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { getUserForCurrentSession } from "@/app/actions/user-actions";

import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await auth();
  const user = await getUserForCurrentSession();

  if (session?.user?.email && user) {
    redirect("/dashboard/aprender");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>Auth.js</span>
        <h1 className={styles.title}>Iniciar sesión</h1>
        <p className={styles.description}>Accede con tu cuenta de Google</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard/aprender" });
          }}
        >
          <button className={styles.button} type="submit">
            Entrar con Google
          </button>
        </form>
      </section>
    </main>
  );
}
