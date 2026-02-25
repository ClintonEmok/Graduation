import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-[#f5f5f7] [font-family:SF_Pro_Display,SF_Pro_Text,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-12%,rgba(58,76,120,0.42),rgba(12,13,17,0.94)_36%,rgba(5,5,7,1)_72%)]" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-14 pt-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <p className="text-sm font-medium tracking-tight text-[#f5f5f7]">
            Quiet Tiger
          </p>
          <span className="rounded-full border border-[#3a3a3c] bg-black/40 px-3 py-1 text-xs font-medium text-[#d2d2d7] backdrop-blur-sm">
            Version 1.1
          </span>
        </header>

        <div className="mx-auto mt-20 flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center sm:mt-16">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#f5f5f7] sm:text-6xl lg:text-7xl">
            Adaptive Time Scaling for Bursty Data
          </h1>

          <div className="mt-11 flex w-full max-w-md flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/timeline-test"
              className="inline-flex min-w-[220px] items-center justify-center rounded-full bg-[#0071e3] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#0077ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
            >
              Open timeline test
            </Link>
            <span className="text-sm text-[#8e8e93]">Built for current QA cycle.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
