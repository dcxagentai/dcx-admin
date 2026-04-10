/**
 * CONTEXT:
 * First shared auth login page for the DCX admin frontend.
 * It exists so internal users with valid credentials can establish the shared DCX browser session
 * before the backend applies role checks to admin routes.
 */
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import dcxLogo from "@prompteoai/dcx-branding/assets/dcx_logo.png"

type Props = {
  isPending: boolean
  errorMessage: string | null
  onSubmit: (email: string, password: string) => void
  onForgotPassword: () => void
}

export function DcxAdminAuthLoginPage(props: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    props.onSubmit(email.trim(), password)
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <article className="w-full border border-black/6 bg-[#0f172a] px-6 py-8 text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={dcxLogo} alt="DCX logo" className="h-11 w-11 bg-[#fbfaf7] p-1.5" />
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                DCX Admin
              </p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in</h1>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                placeholder="you@dcxagent.ai"
                disabled={props.isPending}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300"
                placeholder="Enter your password"
                disabled={props.isPending}
              />
            </label>

            {props.errorMessage ? (
              <p className="text-sm leading-6 text-red-300">{props.errorMessage}</p>
            ) : null}

            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="submit"
                className="h-11 w-full bg-white text-slate-950 hover:bg-slate-100"
                disabled={props.isPending || email.trim() === "" || password === ""}
              >
                {props.isPending ? "Signing in..." : "Sign in"}
              </Button>
              <button
                type="button"
                className="text-left text-sm font-medium text-sky-300 transition hover:text-sky-200"
                onClick={props.onForgotPassword}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </article>
      </section>
    </main>
  )
}
