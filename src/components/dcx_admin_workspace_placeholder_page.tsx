/**
 * CONTEXT:
 * Generic placeholder surface for admin sections that are planned and already mapped in the
 * information architecture, but whose detailed workflows are not yet implemented.
 * It gives the client and internal team a believable route target without pretending the
 * underlying mechanics already exist.
 */

type Props = {
  eyebrow: string
  title: string
  description: string
  currentShapeTitle: string
  currentShapeItems: string[]
}

export function DcxAdminWorkspacePlaceholderPage(props: Props) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="space-y-3 border-b border-black/6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {props.eyebrow}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{props.title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{props.description}</p>
        </div>

        <div className="pt-5">
          <p className="text-sm leading-6 text-slate-600">
            This route is already part of the admin information architecture, so the shell,
            navigation, and cross-workspace handoff are in place before the deeper mechanics land.
          </p>
        </div>
      </article>

      <article className="border border-black/6 bg-white px-6 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)]">
        <div className="space-y-3 border-b border-black/6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Current shape
          </p>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            {props.currentShapeTitle}
          </h3>
        </div>

        <ul className="space-y-3 pt-5">
          {props.currentShapeItems.map((item) => (
            <li
              key={item}
              className="border border-black/6 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}
