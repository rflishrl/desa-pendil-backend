import { createFileRoute } from "@tanstack/react-router";

import { logout } from "@/features/auth/service";
import { withApi } from "@/lib/api/with-api";

const handlePost = withApi({ access: "session" }, async () => ({
  data: await logout(),
}));

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
});

export { handlePost as POST };
