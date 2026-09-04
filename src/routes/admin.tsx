import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  // Room pages lock document scrolling; admin pages need their own scroll area.
  return (
    <div className="h-dvh overflow-x-hidden overflow-y-auto">
      <Outlet />
    </div>
  );
}
