import { withErrorHandling } from "@/lib/api/errors";
import { requestOrigin } from "@/lib/api/request";
import { proposalService } from "@/lib/proposals/service";

export const POST = withErrorHandling(
  async (request: Request, { params }: RouteContext<"/api/proposals/[id]/send">) => {
    const { id } = await params;
    return Response.json(
      await proposalService.sendProposal(id, { baseUrl: requestOrigin(request) }),
    );
  },
);
