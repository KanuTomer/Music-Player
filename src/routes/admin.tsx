import { createFileRoute, Outlet } from "@tanstack/react-router";
import { buildSeoMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: buildSeoMeta({
      title: "Admin — Sainik Dhaba",
      robots: "noindex, nofollow",
    }),
  }),
  component: AdminLayout,
});

function AdminLayout() {
  // Room pages lock document scrolling; admin pages need their own scroll area.
  return (
    <div className="h-dvh overflow-x-hidden overflow-y-auto">
      <Outlet />
    </div>
  );
}
