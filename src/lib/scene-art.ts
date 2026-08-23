import railYatra from "@/assets/scene-rail-yatra.jpg";
import barbershop from "@/assets/scene-barbershop.jpg";
import nightBus from "@/assets/scene-night-bus.jpg";
import sarkariDaftar from "@/assets/scene-sarkari-daftar.jpg";
import doordarshan from "@/assets/scene-doordarshan.jpg";
import chayaKada from "@/assets/scene-chaya-kada.jpg";
import paraAdda from "@/assets/scene-para-adda.jpg";
import punjabiDhaba from "@/assets/scene-punjabi-dhaba.jpg";
import ganpatiPandal from "@/assets/scene-ganpati-pandal.jpg";
import tamilSaloon from "@/assets/scene-tamil-saloon.jpg";
import chaiKiTapri from "@/assets/scene-chai-ki-tapri.jpg";
import rajMistri from "@/assets/scene-raj-mistri.jpg";

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
};

export function artFor(key: string): string {
  return sceneArt[key] ?? railYatra;
}

/** Which procedural ambience layers each room runs. */
export const sceneAmbience: Record<string, string[]> = {
  "rail-yatra": ["train", "chatter", "fan"],
  "nai-ki-dukaan": ["fan", "chatter", "snip"],
  "raat-ki-bus": ["engine", "wind"],
  "sarkari-daftar": ["fan", "paper", "chatter"],
  "doordarshan-shaam": ["hum", "chatter"],
  "chaya-kada": ["rain", "chatter", "kettle"],
  "para-adda": ["chatter", "street"],
  "highway-dhaba": ["night", "fire", "truck"],
  "sainik-dhaba": ["night", "fire", "truck"],
  "chai-ki-tapri": ["kettle", "chatter", "street"],
  "raj-mistri": ["chatter", "street", "fan"],
  "ganpati-pandal": ["crowd", "dhol"],
  "tamil-saloon": ["fan", "street", "snip"],
};
