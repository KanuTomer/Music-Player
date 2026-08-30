import barbershop from "@/assets/new_salon.webp";
import nightBus from "@/assets/newdrivernew.webp";
import doordarshan from "@/assets/new_doordarshan.webp";
import punjabiDhaba from "@/assets/newsanik.webp";
import bartanTime from "@/assets/new_bartantime.webp";
import rajMistri from "@/assets/new_rajmistri.webp";
import corporateMajdoor from "@/assets/new_corporatemajdoor.webp";

export const sceneArt: Record<string, string> = {
  barbershop,
  "bus-driver": nightBus,
  "bartan-time": bartanTime,
  "papa-ke-gaane": doordarshan,
  "punjabi-dhaba": punjabiDhaba,
  "raj-mistri": rajMistri,
  "corporate-majdoor": corporateMajdoor,
};

export function artFor(key: string): string {
  return sceneArt[key] ?? punjabiDhaba;
}
