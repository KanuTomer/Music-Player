import railYatra from "@/assets/theme-rail-yatra-real.jpg";
import barbershop from "@/assets/theme-deluxe-salon-real.jpg";
import nightBus from "@/assets/theme-night-bus-real.jpg";
import sarkariDaftar from "@/assets/theme-sarkari-daftar-real.jpg";
import doordarshan from "@/assets/theme-doordarshan-real.jpg";
import chayaKada from "@/assets/scene-chaya-kada.jpg";
import paraAdda from "@/assets/scene-para-adda.jpg";
import punjabiDhaba from "@/assets/theme-sainik-dhaba-real.jpg";
import ganpatiPandal from "@/assets/scene-ganpati-pandal.jpg";
import tamilSaloon from "@/assets/scene-tamil-saloon.jpg";
import chaiKiTapri from "@/assets/theme-chai-tapri-real.jpg";
import rajMistri from "@/assets/theme-raj-mistri-real.jpg";
import bhojpuriyaDevara from "@/assets/theme-bhojpuriya-devara-real.jpg.asset.json";
import corporateMajdoor from "@/assets/theme-corporate-majdoor-real.jpg";

export const sceneArt: Record<string, string> = {
  "rail-yatra": railYatra,
  barbershop,
  "night-bus": nightBus,
  "sarkari-daftar": sarkariDaftar,
  doordarshan,
  "chaya-kada": chayaKada,
  "para-adda": paraAdda,
  "punjabi-dhaba": punjabiDhaba,
  "ganpati-pandal": ganpatiPandal,
  "tamil-saloon": tamilSaloon,
  "chai-ki-tapri": chaiKiTapri,
  "raj-mistri": rajMistri,
  "bhojpuriya-devara": bhojpuriyaDevara.url,
  "corporate-majdoor": corporateMajdoor,
};

export function artFor(key: string): string {
  return sceneArt[key] ?? railYatra;
}
