# VIScon user identity

Aha uses the [VIScon 2026 managed reverse proxy](https://hackathon.ethz.ch/events/viscon-2026/documentation#user-headers)
for participant, mentor, and staff sign-in. There is no separate Aha registration,
password, login page, session cookie, or user allowlist. Open the managed app URL
(currently `https://11.hackathon.ethz.ch`); the proxy completes login and forwards
the authenticated request to the Bun server over HTTP on `0.0.0.0:8080`.

`backend/src/identity.ts` reads the proxy's `X-User-Id` as the stable user ID
(an email address; ETH addresses are normalized by the proxy). It decodes
`X-User-Name` once with percent decoding to display names such as `Zoë Müller`.
A missing name falls back to the ID; malformed percent encoding cannot crash the
request. A missing, blank, or ambiguous ID returns `null`, never a fake signed-in
user. The application does not infer identity from a cookie, query parameter,
browser storage, or the display name.

`GET /api/me` returns `{ "user": { "id": "reviewer@ethz.ch", "name": "VIScon Reviewer" } }`.
`/api/hello` includes the same user. Both responses are private and non-cacheable.
The navigation drawer fetches `/api/me` when opened and displays “Signed in via
VIScon” with the name. Browser requests use the same origin and do not construct
the identity headers themselves. No account setup is required for judges.

## Shared library and local development

Proxy identity and lesson storage are separate: videos and narration still use
the existing shared library, including older jobs. Signing in as a staff member
does not hide the team's demo material. Courses and other browser-local preferences
retain their current storage behavior. AI-provider credentials and `agents:login`
are server setup for generation, unrelated to visitor authentication.

Without the proxy (local development, standalone previews, or disabled gateway
authentication), `/api/me` returns `{ "user": null }` and the drawer omits the
signed-in label. The app and `/healthz` still work. Aha relies on the proxy for
access control; the backend does not reject anonymous requests to the shared
library. The source frontend's Vite `/api` proxy continues to use port 8080.

To check the identity API locally, with the backend running:

```sh
curl http://localhost:8080/api/me \
  -H 'X-User-Id: reviewer@ethz.ch' \
  -H 'X-User-Name: Zo%C3%AB M%C3%BCller'
```

## Deployment trust boundary

Keep the portal's managed ingress and an authenticated access-control mode enabled.
The default “Authentication & authorization” mode permits the team, mentors, and
hackathon staff. Keep port 8080 reachable only through the managed proxy and local
VM access using the provided firewall rules. **Do not expose the backend port
directly to the internet or other teams:** direct callers can supply these headers.
“Disabled” access control supplies no user headers and makes the app public.

The existing Docker bind address, health checks, same-origin API paths, origin
checks, and SSE video stream remain compatible with managed ingress. No WebSocket
or extra authentication service is required. `scripts/check-container-http.py`
checks proxy identity, Unicode names, anonymous local access, and shared library
behavior during the deployment lifecycle tests.
