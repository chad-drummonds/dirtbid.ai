import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import PdfProposalBuilder from "~/components/PdfProposalBuilder";

export const Route = createFileRoute("/proposals")({
  component: ProposalsPage,
});

function ProposalsPage() {
  return (
    <div className="min-h-dvh bg-gray-50 pt-20">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-lg font-bold text-white">
              DB
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proposal Builder</h1>
              <p className="text-sm text-gray-500">
                Generate a professional branded PDF proposal in one click
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <PdfProposalBuilder />
      </div>
    </div>
  );
}
