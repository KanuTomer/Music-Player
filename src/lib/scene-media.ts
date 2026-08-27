import corporateMajdoorVideo from "@/assets/theme-corporate-majdoor-moving-fixed.mp4.asset.json";
import chaiTapriVideo from "@/assets/theme-chai-tapri-moving.mp4.asset.json";
import deluxeSalonVideo from "@/assets/theme-deluxe-salon-moving.mp4.asset.json";
import doordarshanVideo from "@/assets/theme-doordarshan-moving.mp4.asset.json";
import nightBusVideo from "@/assets/theme-night-bus-moving-fixed.mp4.asset.json";
import railYatraVideo from "@/assets/theme-rail-yatra-moving.mp4.asset.json";
import rajMistriVideo from "@/assets/theme-raj-mistri-moving.mp4.asset.json";
import sainikDhabaVideo from "@/assets/theme-sainik-dhaba-moving.mp4.asset.json";
import sarkariDaftarVideo from "@/assets/theme-sarkari-daftar-moving.mp4.asset.json";

const sceneVideos: Record<string, string> = {
  "sainik-dhaba": sainikDhabaVideo.url,
  "nai-ki-dukaan": deluxeSalonVideo.url,
  "chai-ki-tapri": chaiTapriVideo.url,
  "raj-mistri": rajMistriVideo.url,
  "raat-ki-bus": nightBusVideo.url,
  "sarkari-daftar": sarkariDaftarVideo.url,
  "doordarshan-shaam": doordarshanVideo.url,
  "rail-yatra": railYatraVideo.url,
  "corporate-majdoor": corporateMajdoorVideo.url,
};

export function videoForScene(slug: string): string | undefined {
  return sceneVideos[slug];
}
