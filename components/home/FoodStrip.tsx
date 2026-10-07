import Image from "next/image";

/**
 * The moving row of food pictures under the hero, right to left (founder,
 * 2026-10-07: "pictures pass a better message" than a row of names).
 *
 * Every picture is a free Unsplash photo that was looked at before use, and
 * every name says only what is plainly in the picture. The dot is that food's
 * own colour in data/foods.json (baseVerdict), so the strip can never show a
 * different answer from the app. Two photos were dropped rather than mislabel
 * them: a "grilled fish" where plantain hid the fish, and a fried rice that was
 * not the Nigerian kind.
 */
const FOODS: { src: string; name: string; v: "green" | "yellow" | "red"; alt: string }[] = [
  { src: "/img/foods/egusi-soup.jpg", name: "Egusi soup", v: "green", alt: "A bowl of egusi soup with assorted meat" },
  { src: "/img/foods/jollof-rice.jpg", name: "Jollof rice", v: "yellow", alt: "A tray of jollof rice" },
  { src: "/img/foods/okra.jpg", name: "Okra", v: "green", alt: "A bowl of fresh okra" },
  { src: "/img/foods/fried-plantain.jpg", name: "Fried plantain", v: "red", alt: "Fried plantain with a fork" },
  { src: "/img/foods/pepper-soup.jpg", name: "Pepper soup", v: "green", alt: "A bowl of chicken pepper soup" },
  { src: "/img/foods/boli.jpg", name: "Boli", v: "yellow", alt: "Plantain roasting on a grill" },
  { src: "/img/foods/vegetable-soup.jpg", name: "Vegetable soup", v: "green", alt: "A plate of vegetable soup with swallow on the side" },
  { src: "/img/foods/rice-and-stew.jpg", name: "Rice and stew", v: "yellow", alt: "White rice with stew and beef" },
  { src: "/img/foods/okra-soup.jpg", name: "Okra soup", v: "green", alt: "A dish of okra soup with fish" },
];

const DOT = { green: "bg-verdict-green", yellow: "bg-verdict-yellow", red: "bg-verdict-red" } as const;

export default function FoodStrip() {
  return (
    // Same blue as the bottom of the hero, so the strip reads as part of it.
    <div className="relative -mt-10 bg-[#1b5faa] pb-14 pt-2 sm:-mt-14">
      {/* The fade sits on the inner row, so the edges fade into the blue,
          not into the white page behind it. */}
      <div className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <ul className="marquee-track flex w-max gap-4" aria-label="Some of the Nigerian foods in GluFloat">
        {[...FOODS, ...FOODS].map((f, i) => (
          <li
            key={i}
            aria-hidden={i >= FOODS.length}
            className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_18px_36px_-18px_rgba(6,26,50,0.7)] sm:w-52"
          >
            <Image
              src={f.src}
              alt={i < FOODS.length ? f.alt : ""}
              width={560}
              height={420}
              sizes="208px"
              className="h-32 w-full object-cover sm:h-36"
            />
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-ink">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[f.v]}`} />
              {f.name}
            </p>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
