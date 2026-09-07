import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/room/$slug")({
  component: RoomLayout,
});

function RoomLayout() {
  return <Outlet />;
}
