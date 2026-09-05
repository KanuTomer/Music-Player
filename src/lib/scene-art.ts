import barbershop from "@/assets/finalsalon.webp";
import nightBus from "@/assets/finalbustime.webp";
import doordarshan from "@/assets/finalpapakegaane.webp";
import punjabiDhaba from "@/assets/finallsanikdhaba.webp";
import bartanTime from "@/assets/finalbartantime.webp";
import rajMistri from "@/assets/finalrajumistri.webp";
import corporateMajdoor from "@/assets/finalfinalcorporate majdoor.webp";

export const sceneArt: Record<string, string> = {
  barbershop,
  "nai-ki-dukaan": barbershop,
  "bus-driver": nightBus,
  "bartan-time": bartanTime,
  "papa-ke-gaane": doordarshan,
  "doordarshan-shaam": doordarshan,
  "punjabi-dhaba": punjabiDhaba,
  "sainik-dhaba": punjabiDhaba,
  "raj-mistri": rajMistri,
  "corporate-majdoor": corporateMajdoor,
};

export function artFor(key: string): string {
  return sceneArt[key] ?? punjabiDhaba;
}
