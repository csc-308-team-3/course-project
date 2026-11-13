import { request } from './api';

function householdPath(householdId, path) {
  return `/api/households/${householdId}${path}`;
}

export function getIncomingChoreSwapRequests(householdId) {
  return request(householdPath(householdId, '/chore-swap-requests'));
}

export function getOutgoingChoreSwapRequests(householdId) {
  return request(householdPath(householdId, '/chore-swap-requests/outgoing'));
}

export function createChoreSwapRequest(householdId, instanceId, recipientId) {
  return request(
    householdPath(
      householdId,
      `/chore-instances/${instanceId}/chore-swap-requests`,
    ),
    {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    },
  );
}

export function respondToChoreSwapRequest(householdId, requestId, action) {
  return request(
    householdPath(householdId, `/chore-swap-requests/${requestId}/respond`),
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
  );
}

export function cancelChoreSwapRequest(householdId, requestId) {
  return request(
    householdPath(householdId, `/chore-swap-requests/${requestId}/cancel`),
    { method: 'POST' },
  );
}
