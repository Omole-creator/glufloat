"use client";

import { motion } from "framer-motion";

interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    text: "For years I was scared of my own food. Now I check my eba before I eat, take a smaller size, and my sugar stays calm. I enjoy my food again.",
    image: "/img/pic1.jpg",
    name: "Grace Adeyemi",
    role: "Lagos State",
  },
  {
    text: "I did not want to give up rice. Glufloat showed me to eat it small, with vegetables and fish. My last test came back better than before.",
    image: "/img/pic2.jpg",
    name: "Hauwa Bello",
    role: "Kaduna State",
  },
  {
    text: "I cook for my father who has diabetes. Before I serve, I check the meal. No more guessing, and we all eat the same food together.",
    image: "/img/pic3.jpg",
    name: "Emeka Okafor",
    role: "Anambra State",
  },
  {
    text: "The colours are so easy. Green, I eat. Red, I leave it. My wife and I check our food every evening before dinner. Simple for both of us.",
    image: "/img/pic4.jpg",
    name: "Tunde Bakare",
    role: "Oyo State",
  },
  {
    text: "I thought a person with diabetes could not enjoy our food. This app proved me wrong. I still eat jollof, just the right size and the right way.",
    image: "/img/pic5.jpg",
    name: "Amina Yusuf",
    role: "Abuja, FCT",
  },
];

function Card({ t }: { t: Testimonial }) {
  return (
    <motion.figure
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="group flex w-[19rem] shrink-0 flex-col rounded-3xl border border-line bg-white p-7 shadow-[0_12px_30px_-16px_rgba(12,42,71,0.25)] sm:w-[22rem]"
    >
      <div className="mb-4 flex gap-0.5 text-verdict-yellow" aria-hidden>
        {"★★★★★".split("").map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
      <blockquote className="flex-1 text-[15px] leading-relaxed text-ink">
        “{t.text}”
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <img
          src={t.image}
          alt={t.name}
          width={48}
          height={48}
          loading="lazy"
          className="h-12 w-12 rounded-full object-cover ring-2 ring-line transition-all group-hover:ring-brand/40"
        />
        <div>
          <p className="font-display font-semibold leading-5 text-ink">
            {t.name}
          </p>
          <p className="text-sm text-ink-soft">{t.role}</p>
        </div>
      </figcaption>
    </motion.figure>
  );
}

export function Testimonials() {
  const loop = [...testimonials, ...testimonials];

  return (
    <section className="overflow-hidden bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf-deep">
          Real people
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink sm:text-4xl">
          People eating their food again, with peace of mind.
        </h2>
        <p className="mx-auto mt-4 max-w-md font-display text-lg text-ink-soft">
          Nigerians living with diabetes, and the people who cook for them.
        </p>
      </div>

      <div className="marquee group relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track flex w-max gap-6 group-hover:[animation-play-state:paused]">
          {loop.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
