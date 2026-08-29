import corporateMajdoorVideo from "@/assets/theme-corporate-majdoor-moving-fixed.mp4.asset.json";
import chaiTapriVideo from "@/assets/theme-chai-tapri-moving.mp4.asset.json";
import deluxeSalonVideo from "@/assets/theme-deluxe-salon-moving.mp4.asset.json";
import doordarshanVideo from "@/assets/theme-doordarshan-moving.mp4.asset.json";
import nightBusVideo from "@/assets/theme-night-bus-moving-fixed.mp4.asset.json";
import rajMistriVideo from "@/assets/theme-raj-mistri-moving.mp4.asset.json";

const sceneVideos: Record<string, string> = {};

export function videoForScene(slug: string): string | undefined {
  return sceneVideos[slug];
}
