import { matchesFilter } from "../lib/filter.ts";

const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-filter]")];
const cards = [...document.querySelectorAll<HTMLElement>("[data-family]")];

for (const button of buttons) {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter ?? "all";
    for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
    for (const card of cards) card.hidden = !matchesFilter(card.dataset.family ?? "", filter);
  });
}
