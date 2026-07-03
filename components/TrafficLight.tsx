type Props = {
  active?: "green" | "yellow" | "red" | "cycle";
  size?: "sm" | "lg";
};

export default function TrafficLight({ active = "cycle", size = "lg" }: Props) {
  const lamp = size === "lg" ? "h-14 w-14 md:h-16 md:w-16" : "h-6 w-6";
  const pad = size === "lg" ? "p-4 gap-4" : "p-1.5 gap-1.5";

  const cls = (c: "red" | "yellow" | "green") => {
    if (active === "cycle") return `lamp-${c}`;
    return active === c
      ? "opacity-100 shadow-[0_0_24px_4px_rgba(0,0,0,0.15)]"
      : "opacity-20";
  };

  return (
    <div
      aria-hidden
      className={`inline-flex flex-col items-center rounded-full bg-ink ${pad}`}
    >
      <span className={`${lamp} rounded-full bg-verdict-red ${cls("red")}`} />
      <span className={`${lamp} rounded-full bg-verdict-yellow ${cls("yellow")}`} />
      <span className={`${lamp} rounded-full bg-verdict-green ${cls("green")}`} />
    </div>
  );
}
