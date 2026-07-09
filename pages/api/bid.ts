// =============================================================================
// DirtBid AI — Bid Calculation API Endpoint
// =============================================================================
// REST endpoint for calculating bids. Accepts a BidRequest JSON body
// and returns a full BidResponse with costs, line items, and breakdown.

import { generateBid, BidRequest } from '../../lib/engine/orchestrator';

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export function handleBidCalculation(bidRequest: BidRequest): ApiResponse {
  try {
    const result = generateBid(bidRequest);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error calculating bid' };
  }
}

export type { BidRequest } from '../../lib/engine/orchestrator';

// Example usage for testing:
// const exampleRequest: BidRequest = { ... }; // see test fixtures
// const response = handleBidCalculation(exampleRequest);
// console.log(JSON.stringify(response, null, 2));
