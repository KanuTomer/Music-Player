import barbershop from "@/assets/new_salon.webp";
import nightBus from "@/assets/new_bus.webp";
import doordarshan from "@/assets/new_doordarshan.webp";
import punjabiDhaba from "@/assets/sanik dhaba.webp";
import chaiKiTapri from "@/assets/new_chaiimage.webp";
import rajMistri from "@/assets/new_rajmistri.webp";
import corporateMajdoor from "@/assets/new_corporatemajdoor.webp";

export const sceneArt: Record<string, string> = {
  barbershop,
  "night-bus": nightBus,
  doordarshan,
  "punjabi-dhaba": punjabiDhaba,
  "chai-ki-tapri": chaiKiTapri,
  "raj-mistri": rajMistri,
  "corporate-majdoor": corporateMajdoor,
};

export function artFor(key: string): string {
  return sceneArt[key] ?? punjabiDhaba;
}
