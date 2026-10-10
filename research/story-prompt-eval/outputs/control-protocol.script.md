# Why retrying can charge twice

## Beat 1 — The missing response

Content needed: One intended purchase: one book for twenty US dollars. A client sends a payment request without an idempotency key. The server records one successful twenty-dollar charge, then its success response is lost. A timeout appears only after the response fails to reach the client. Keep the client's knowledge separate from the server's committed state.

Narration: You buy a book for twenty dollars. Your app sends the payment request, the server records a successful charge, and the reply starts its journey back. But that reply never reaches your app. Eventually, the app times out.

The customer sees a spinner and then an error. The server sees a completed payment. Those are different views of the same attempt.

If the app simply sends another ordinary payment request, the server might record another charge. One intended purchase has become two payments. The problem is that losing the response did not undo the first operation.

## Beat 2 — Two histories, one timeout

Content needed: Compare the completed-charge/lost-response history with a second history in which the initial request never reached the server. Both yield the same client timeout. An ordinary retry may create a duplicate in the first history but is needed to complete the purchase in the second. Introduce an idempotency key, K1, chosen before the first attempt and preserved for retries of that intended purchase.

Narration: Now consider a different failure. The request itself gets lost before it reaches the server. No payment happens, but the app still times out.

From the app's perspective, these two histories look identical. A timeout says that a reply did not arrive in time. It does not say whether the server completed the payment.

Always retrying can charge twice. Never retrying can leave the purchase unfinished. We need a retry that works in either history.

The app gives this intended purchase a unique label: an idempotency key. Call it K one. It sends that key with the first request and keeps the same key if it retries. The key identifies the purchase across attempts.

## Beat 3 — Remember the operation and its answer

Content needed: Revisit both histories using K1 from the first attempt. Use an idealized server whose payment ledger and idempotency record share a transaction. Atomically commit the twenty-dollar charge and a K1 record containing the original payload identity and stored successful result. Show a retry finding this record and returning its result without adding a charge. Then show the never-arrived history: no record, so the retry performs the operation and stores the association. Concurrent requests must be serialized per key; do not show an unsafe separate check and write.

Narration: Here is the server's side. In our simplified payment service, the charge record and the key's stored result commit together in one transaction. The stored entry links K one to the original request and its successful answer.

If the reply gets lost, that entry still exists. A retry with K one finds it, so the server returns the saved answer without creating another charge.

If the first request never arrived, there is no entry. The retry performs the payment and stores its answer.

This must be atomic. Two simultaneous attempts cannot both claim an unused key and independently charge. The server coordinates them so only one performs the operation. If charging happens through another service, that service needs equivalent protection; saving a local result afterward leaves a gap.

## Beat 4 — Same purchase, same key

Content needed: Retain the successful K1 association. Compare a matching retry, a changed-payload request with K1, and a genuinely new purchase with K2. Reject K1 with thirty dollars instead of twenty, even if the rest matches. Identify the stated account/operation scope and retention window as boundaries; illustrate a record expiring without specifying an unsupported real-provider duration. A later retry beyond retention is not promised duplicate protection.

Narration: The key follows intent, not each network attempt. Retrying that same book purchase uses K one again. Buying another copy as a new purchase gets a new key, even if the amount and other details are identical.

The server must also reject reuse of K one with a changed payload, such as thirty dollars instead of twenty. Otherwise, one label would refer to two different instructions.

Finally, check the service's key scope and retention window. A key may be recognized only within a particular account and operation. Once its stored record expires, replay protection may end.

An idempotency key does not tell the client which message was lost. It lets the server recognize the same intended operation and safely return its recorded outcome.