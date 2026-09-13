import { stepIndex } from "../lib/hall.ts";

interface HallItem {
  title: string;
  makerYear: string;
  summary: string;
  href: string;
  image: string;
  alt: string;
}

const data = document.getElementById("hall-data");
if (data) {
  const items = JSON.parse(data.textContent ?? "[]") as HallItem[];
  const image = document.getElementById("featured-image") as HTMLImageElement;
  const title = document.getElementById("featured-title") as HTMLElement;
  const makerYear = document.getElementById("featured-maker-year") as HTMLElement;
  const summary = document.getElementById("featured-summary") as HTMLElement;
  const visit = document.getElementById("visit") as HTMLAnchorElement;
  const strip = [...document.querySelectorAll<HTMLButtonElement>("[data-hall-index]")];
  let index = 0;

  const show = (next: number) => {
    index = stepIndex(next, 0, items.length);
    const item = items[index];
    image.src = item.image;
    image.alt = item.alt;
    title.textContent = item.title;
    makerYear.textContent = item.makerYear;
    summary.textContent = item.summary;
    visit.href = item.href;
    for (const button of strip) button.setAttribute("aria-current", String(Number(button.dataset.hallIndex) === index));
    strip[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  document.getElementById("previous")?.addEventListener("click", () => show(index - 1));
  document.getElementById("next")?.addEventListener("click", () => show(index + 1));
  for (const button of strip) button.addEventListener("click", () => show(Number(button.dataset.hallIndex)));
}
