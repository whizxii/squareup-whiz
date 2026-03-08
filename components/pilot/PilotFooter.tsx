"use client";

export default function PilotFooter() {
  return (
    <footer
      className="border-t border-neutral-200 bg-cream pt-8 sm:pt-10"
      style={{
        paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="max-w-[800px] mx-auto px-5 sm:px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <img
              src="/su_wordmark_transparent.svg"
              alt="Square Up"
              className="h-7 w-auto opacity-50"
            />
            <span className="text-[12px] text-maze-gray">
              &copy; 2026 Square Up
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="mailto:hello@joinsquareup.com"
              className="text-[12px] text-maze-gray hover:text-maze-black transition-colors"
            >
              hello@joinsquareup.com
            </a>
            <a
              href="https://www.linkedin.com/company/joinsquareup/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-maze-gray hover:text-maze-black transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
