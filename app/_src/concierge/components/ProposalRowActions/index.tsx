"use client";

import { Copy, ExternalLink, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiRequest, errorMessage } from "@/app/_src/common/utils/api-client";
import { copyText } from "@/app/_src/common/utils/copy-text";
import { memberLink } from "@/app/_src/concierge/utils/member-link";
import { Button } from "@/app/_src/common/components/Button";
import type { ProposalStatus } from "@/domain/proposals/status";

type Props = { proposalId: string; status: ProposalStatus; memberName: string };

export function ProposalRowActions({ proposalId, status, memberName }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function copyLink() {
    const link = memberLink(proposalId);
    if (await copyText(link)) {
      toast.success("Member link copied");
    } else {
      toast.info("Copy this link", { description: link });
    }
  }

  async function send() {
    setSending(true);
    try {
      await apiRequest(`/api/proposals/${proposalId}/send`, { method: "POST" });
      toast.success(`Sent to ${memberName}`);
      router.refresh();
    } catch (error) {
      toast.error("Couldn't send the proposal", {
        description: errorMessage(error),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {status === "draft" && (
        <Button type="button" size="sm" onClick={send} disabled={sending}>
          <Send aria-hidden />
          {sending ? "Sending…" : "Send"}
        </Button>
      )}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={copyLink}
        aria-label="Copy member link"
        title="Copy member link"
      >
        <Copy aria-hidden />
      </Button>
      <Button size="icon-sm" variant="ghost" asChild>
        <a
          href={`/proposal/${proposalId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open as member (new tab)"
          title="Open as member"
        >
          <ExternalLink aria-hidden />
        </a>
      </Button>
    </div>
  );
}
