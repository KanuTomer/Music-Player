import { supabase } from "@/integrations/supabase/client";
import {
  createRoomPresenceController,
  type RoomPresenceClient,
} from "@/lib/room-presence";

export const roomPresenceController = createRoomPresenceController(
  supabase as unknown as RoomPresenceClient,
);
