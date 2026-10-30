import { connection } from "next/server";
import { withErrorHandling } from "@/lib/api/errors";
import { parseBody } from "@/lib/api/request";
import { proposalService } from "@/domain/proposals/service";
import { createProposalSchema } from "@/domain/proposals/validation";

export const GET = withErrorHandling(async () => {
  await connection(); // DB read: always render at request time, never prerender
  return Response.json(await proposalService.listProposals());
});

export const POST = withErrorHandling(async (request: Request) => {
  const input = await parseBody(request, createProposalSchema);
  const proposal = await proposalService.createProposal(input);
  return Response.json(proposal, {
    status: 201,
    headers: { Location: `/api/proposals/${proposal.id}` },
  });
});
