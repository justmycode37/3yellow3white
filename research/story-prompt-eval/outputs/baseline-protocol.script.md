# Why retrying can charge twice

## Beat 1 — A reply disappears

Content needed: A schematic client/server request-response trace: payment amount $20, one server commit, lost success response, client timeout. Establish separate request and response arrows. No key or safe-retry answer yet.

Narration: Your app sends a payment request. The server charges twenty dollars, but its reply disappears. The app times out. Can it retry without charging the customer twice?

## Beat 2 — One timeout, two histories

Content needed: Compare alternate histories of the same $20 purchase: request lost before arrival with zero committed charges; request arrives and commits once but response is lost. Both produce the same client timeout. Extend each history with an unkeyed retry, yielding one versus two committed charges. These are alternatives, not successive purchases.

Narration: A timeout tells the app that no response arrived before its deadline. It does not say what happened on the server. Compare two histories: in the first, the request never arrives, so no charge happens. In the second, the server commits the charge, but the response is lost. The app sees exactly the same timeout in both. Giving up can leave the first purchase unpaid. Sending an ordinary payment request again can charge twice in the second history. We need the server to recognize that another attempt can belong to the same purchase.

## Beat 3 — Give the purchase a durable identity

Content needed: Explicitly replay the same purchase under an idempotency protocol. Client creates and retains key K1 before sending. Show payload $20 for purchase A, server entry K1 with matching payload and success result R1, and payment P1. Charge and key/payload/result association share an atomic durability boundary in the simplified service. A concurrent same-key attempt cannot execute the charge independently. Compare stored-result replay after response loss with first execution after initial request loss. External charging needs equivalent coordination beyond a local transaction.

Narration: Replay that purchase with an identity attached. Before the first attempt, the app creates a unique idempotency key and keeps it for retries. The server associates that key with the payment details and the result. In our simplified payment service, recording the charge and that association commit together: either both become durable, or neither does. Otherwise, a crash after charging but before saving the key could let a retry charge again. Concurrent attempts must also coordinate so only one performs the operation; another waits or receives an in-progress response. Now the lost reply is harmless to retry: the same key and details find the stored success, and the server returns it without another charge. If the first request never arrived, there is no stored entry, so the retry performs the purchase and records its result. An external payment provider needs equivalent coordination; a local database transaction alone cannot make its charge atomic.

## Beat 4 — Reuse the identity, within its limits

Content needed: Use K1 for a retry of purchase A; use distinct key K2 for new purchase B, also $20. Reject changed amount $25 under existing K1. Demonstrate that the K1 record is effective only within the defined account/operation scope and while retained. End on the retained K1 association and the replay route; do not imply global or permanent exactly-once delivery.

Narration: The key identifies an intended purchase, not a network attempt. Retry the same purchase with the same key. A genuinely new purchase gets a new key, even if it also costs twenty dollars. Reusing a key with changed payment details must be rejected, rather than silently returning the old result or charging the changed amount. This protection lasts only within the service's defined key scope and retention period. Once a record expires, the same key may be treated as new. A timeout still leaves the outcome unknown, but a correctly implemented, retained key lets the server resolve that uncertainty without repeating the purchase.