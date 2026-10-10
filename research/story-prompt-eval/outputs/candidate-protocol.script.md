# Why retrying can charge twice

## Beat 1 — A payment succeeds, but the client cannot tell

Content needed: Client and payment-server lifelines; downward time is schematic. Purchase P is one book for $20. Show the server commit charge C17 before sending its success response. Lose the response, then show the client's timeout. BLUE means purchase request, GOLD means committed payment, GREEN means success result, and RED marks delivery failure.

Narration: Your app sends a payment request: buy one book for twenty dollars. The server commits the payment and sends back a success response, including charge identifier C seventeen. But that response disappears on the way back. Your app waits, then reports a timeout. Look at the server's ledger: the charge already exists. The timeout tells the client that it did not receive a response in time. It does not tell the client whether the payment happened.

## Beat 2 — One symptom, two histories

Content needed: Compare the existing lost-response history with an alternative where the first request never reaches the server. These are possible histories, not simultaneous purchases. Both client observations are timeouts; only the first ledger contains a charge. Show hypothetical ordinary retry consequences, then clear them and return to the original history.

Narration: Now compare another possible history. This time, the outgoing request never reaches the server. No payment happens, but the client still sees a timeout. From that timeout alone, these histories are indistinguishable. In one, retrying needs to create the payment. In the other, creating it again could charge twice. Simply treating every arriving request as a new purchase cannot handle both cases safely. We need the server to recognize another attempt at the same intended purchase.

## Beat 3 — Give the operation a remembered identity

Content needed: Reconstruct the original example with protection from the first attempt, not by adding a record after the old commit. Client selects key K7 before sending. Show one atomic commit boundary containing charge C17 and the association K7 → payload P, result C17. Lose the response, retry with K7 and unchanged P, compare the record, and return C17 with no ledger addition. Atomicity includes coordination of concurrent attempts. Contrast an absent record only where the first attempt never arrived.

Narration: Before its first attempt, the client assigns this purchase an idempotency key, K seven. Every retry sends that same key. The server atomically commits the payment together with a record linking the key, the request's payload, and the result. They become committed together; saving the key later would leave a gap where a retry could repeat the charge. When the response is lost, the retry finds that record and returns C seventeen without another payment. If the first request never arrived, there is no record, so the retry performs the operation for the first time. Concurrent attempts must also be coordinated so they cannot both create a payment.

## Beat 4 — The key's promise has boundaries

Content needed: Sequentially compare same purchase P with K7, new intended purchase P2 with K8 even for identical goods, and a changed $25 payload with K7. Reject the changed payload. Show a service-defined key scope and retention interval without inventing a duration; record expiry does not erase the charge. Classic playback only; no pauses or interactions.

Narration: Another attempt at this purchase keeps K seven. A new intended purchase gets a new key, even if it buys the same book for the same price. Reusing K seven with a changed payload must be rejected: one identity cannot mean two different operations. Check the service's key scope and retention period, too. Outside that scope, or after the record expires, the old key may no longer prevent another charge. Within those boundaries, a matching retry recovers the remembered outcome instead of repeating the purchase.
