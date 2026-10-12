// React lifts a rendered <title> into <head>, ahead of the one index.html has, and takes it out
// again when the page unmounts. So "/" renders none and keeps index.html's, which is also the
// one a link preview reads: those never run the script.
export function PageTitle({ children }: { children: string }) {
  return <title>{`${children} · MHW Armor Set Builder`}</title>;
}
