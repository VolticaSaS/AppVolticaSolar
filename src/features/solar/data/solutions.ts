import type { SolarSolution } from "@/types/solar";

export const solarSolutions: SolarSolution[] = [
  {
    name: "On-Grid",
    icon: "☼",
    description: "Produce energía solar y complementa el consumo de la red con un sistema conectado a la red eléctrica.",
  },
  {
    name: "Híbrido con baterías",
    icon: "◉",
    description: "Combina la red, tus paneles y almacenamiento para aprovechar la energía solar día y noche.",
  },
  {
    name: "Off-Grid",
    icon: "⌁",
    description: "Almacena energía en baterías y crea una solución autónoma para espacios sin conexión a la red.",
  },
];
