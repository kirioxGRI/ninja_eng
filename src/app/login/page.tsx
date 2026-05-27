import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.email) {
    redirect("/dashboard");
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
            await signIn("google");
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
