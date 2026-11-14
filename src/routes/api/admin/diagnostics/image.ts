import { createFileRoute } from "@tanstack/react-router";

import { runImageDiagnostics } from "@/features/uploads/diagnostics-service";
import { withApi } from "@/lib/api/with-api";

const handlePost = withApi({ access: "admin" }, async ({ actor }) => ({
  data: await runImageDiagnostics(actor),
}));

export const Route = createFileRoute("/api/admin/diagnostics/image")({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
});

export { handlePost as POST };
