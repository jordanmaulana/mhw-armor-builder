import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Seliana day, then night, then round again. The files are not in the repo.
const TRACKS = ["/audio/seliana-day.mp3", "/audio/seliana-night.mp3"];
const VOLUME = 0.4; // background level; full volume drowns the page out

export function SoundToggle() {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [track, setTrack] = useState(0);

  // also runs when a track ends: a new src stays silent until play() is called again
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.volume = VOLUME;
    if (on) el.play().catch(() => setOn(false)); // missing file or blocked: show it as off
    else el.pause();
  }, [on, track]);

  return (
    <>
      {/* floats bottom-left, over the equipment's label column or the set search's number
          gutter, whichever is on the left: never on a tap target or the Summary's numbers.
          Its own dark fill, like SlotButton: it sits bare on the backdrop */}
      <button
        type="button"
        aria-label="Music"
        aria-pressed={on}
        onClick={() => setOn(!on)}
        className={`fixed bottom-4 left-4 z-10 grid size-11 place-items-center rounded-sm border border-seam bg-hide hover:border-hunt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hunt ${
          on ? "text-brass" : "text-moss"
        }`}
      >
        {on ? (
          <Volume2 aria-hidden className="size-5" />
        ) : (
          <VolumeX aria-hidden className="size-5" />
        )}
      </button>
      <audio
        ref={audio}
        src={TRACKS[track]}
        preload="none"
        onEnded={() => setTrack((track + 1) % TRACKS.length)}
      />
    </>
  );
}
