import { connection } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { parseBody, requestOrigin } from "@/lib/api/request";
import { proposalService } from "@/lib/proposals/service";
import { updateProposalSchema } from "@/lib/proposals/validation";

type Context = RouteContext<"/api/proposals/[id]">;

export const GET = withErrorHandling(async (_request: Request, { params }: Context) => {
  await connection(); // DB read: always render at request time, never prerender
  const { id } = await params;
  return Response.json(await proposalService.getProposal(id));
});

export const PATCH = withErrorHandling(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const { status, ...changes } = await parseBody(request, updateProposalSchema);

  const proposal = status
    ? await proposalService.changeStatus(id, status, { baseUrl: requestOrigin(request) })
    : await proposalService.updateDraft(id, changes);
  return Response.json(proposal);
});
