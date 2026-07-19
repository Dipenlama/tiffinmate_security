import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-orange-50">
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-100">
          About TiffinMate
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900">Home-style meals, crafted with care</h1>
        <p className="text-base text-neutral-600 max-w-2xl mx-auto">
          TiffinMate connects busy people with wholesome, reliable meals. We partner with trusted kitchens to deliver
          balanced tiffins, day after day, so you can focus on what matters.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {[{
          title: "Fresh, reliable kitchens",
          body: "We onboard kitchens that meet our hygiene checks and can serve consistent quality on time.",
        }, {
          title: "Flexible meal plans",
          body: "Pick from veg, non-veg, mixed, and premium plans or book a one-off special when you need it.",
        }, {
          title: "Friendly support",
          body: "Need to pause, swap, or update preferences? Our support team keeps your routine smooth.",
        }].map((item) => (
          <article key={item.title} className="h-full rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">{item.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr,0.9fr] items-center rounded-2xl border border-neutral-200 bg-gradient-to-r from-orange-100 via-white to-white p-8 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-neutral-900">Why people choose us</h2>
          <ul className="space-y-3 text-sm text-neutral-700 list-disc list-inside">
            <li>Chef-curated menus that rotate through the week to avoid monotony.</li>
            <li>Clear delivery slots so you always know when food will arrive.</li>
            <li>Transparent pricing with no surprise fees.</li>
            <li>Simple booking and easy cancellations when plans change.</li>
          </ul>
          <div className="flex gap-3 pt-2">
            <Link href="/menu" className="px-4 py-2 rounded-full bg-orange-600 text-white text-sm font-semibold hover:-translate-y-0.5 transition">See today&apos;s menu</Link>
            <Link href="/bookings" className="px-4 py-2 rounded-full border border-neutral-300 text-sm text-neutral-800 bg-white hover:border-orange-200 transition">View bookings</Link>
          </div>
        </div>
        <div className="rounded-xl bg-white border border-neutral-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900">A day with TiffinMate</h3>
          <dl className="mt-4 space-y-3 text-sm text-neutral-700">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-orange-600" aria-hidden />
              <div>
                <dt className="font-semibold text-neutral-900">Morning prep</dt>
                <dd className="text-neutral-600">Kitchens receive orders and cook fresh portions for each slot.</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-orange-600" aria-hidden />
              <div>
                <dt className="font-semibold text-neutral-900">On-time dispatch</dt>
                <dd className="text-neutral-600">Orders leave in insulated carriers with clear tracking updates.</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-orange-600" aria-hidden />
              <div>
                <dt className="font-semibold text-neutral-900">Easy follow-up</dt>
                <dd className="text-neutral-600">If you need to adjust a delivery, support is just a message away.</dd>
              </div>
            </div>
          </dl>
        </div>
      </section>
      </main>
    </div>
  );
}
