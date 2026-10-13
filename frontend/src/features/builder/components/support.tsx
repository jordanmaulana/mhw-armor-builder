import { useId } from "react";
import { Heart } from "lucide-react";

// Where a tip can go. The second line is what tells the two apart: how each is paid.
const PLATFORMS = [
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/jordanmaulana",
    how: "Card or PayPal",
  },
  {
    name: "Saweria",
    url: "https://saweria.co/jordanmaulana",
    how: "QRIS or e-wallet, in rupiah",
  },
];

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt";

// One control for the two platforms: a second one beside the heart would cost the title a line,
// on a 320px phone and from 679 to 710px. A native popover gives the toggle, Esc, the tap outside
// and the focus back to the heart for free.
export function Support() {
  const id = useId();
  const titleId = useId();

  return (
    <>
      {/* the word only from md: the title holds one line beside it from 740px up.
          -m-2 p-2 is the tap area, kept off "Clear set", which has no undo */}
      <button
        type="button"
        popoverTarget={id}
        aria-label="Support this tool"
        className={`-m-2 flex items-baseline gap-1.5 p-2 text-sm text-moss underline-offset-4 hover:text-bone hover:underline ${FOCUS}`}
      >
        {/* brass, not ember: alone on a phone, it has to hold 3:1 on the backdrop */}
        <Heart aria-hidden className="size-4 translate-y-0.5 text-brass" />
        <span className="hidden md:inline">Support</span>
      </button>
      {/* m-auto: the preflight zeroes the margin that centres a popover. hidden open:block: a
          browser without popovers gets a button that does nothing, not this in the header. */}
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-labelledby={titleId}
        className="m-auto hidden w-[min(20rem,calc(100vw-2rem))] bg-transparent p-0 text-bone backdrop:bg-black/70 open:block"
      >
        {/* the frame goes on this child, as in the picker: its `relative` would unseat the popover */}
        <div className="frame relative flex flex-col pb-2.5">
          <h2
            id={titleId}
            className="border-b border-dashed border-seam px-4 pt-5 pb-4 text-center font-serif text-2xl text-aqua"
          >
            Support this tool
          </h2>
          {PLATFORMS.map(({ name, url, how }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              // closed on the way out, so the page is as it was on the way back
              onClick={(e) =>
                e.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()
              }
              className="flex flex-col gap-0.5 border-b border-dashed border-seam/60 px-4 py-2.5 hover:bg-plate focus-visible:bg-plate focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hunt"
            >
              <span className="font-medium">
                {name}
                <span className="sr-only"> (opens in a new tab)</span>
              </span>
              <span className="text-sm text-moss">{how}</span>
            </a>
          ))}
          <button
            type="button"
            popoverTarget={id}
            popoverTargetAction="hide"
            className={`self-center px-4 py-2.5 text-sm text-moss underline-offset-4 hover:text-bone hover:underline ${FOCUS}`}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
