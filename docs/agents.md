# Pi agents

The optional `VIDEO_GENERATOR=pi` backend uses pinned Pi 1.1.0 to write storyline Markdown and animlib scene
JavaScript. The host sends the script to ElevenLabs, then gives each scene agent
its narration timing and the animlib API reference. Each task gets a separate
conversation and only a `validate_output` tool. Shell, file access, discovered
extensions, skills, and local instructions are disabled. Scene validation uses
the existing QuickJS compiler with memory and execution limits.

One model runtime owns credentials. Pi persists subscription refreshes with file
locking. The host saves scripts, narration IDs, and validated scene sources per
video under `AGENT_DATA_DIR`; completed stages are reused on restart. Each completed narration scene becomes available immediately; scene code generation
overlaps later speech. Code agents run sequentially with the previous scene’s evaluated
end-state. Scenes are published progressively with audio, word timings, and captions.

The default workspace generator is now `astra`, producing the [private scene-script ZIP](story-orchestration.md). Set `VIDEO_GENERATOR=pi` explicitly to use this separate rendered-video harness.

## Local setup

Use Node >=22.19 for npm tooling; the repository supplies Bun 1.4.2.

1. Run `npm ci`.
2. Copy `backend/.env.example` to `backend/.env.local` and configure ElevenLabs.
3. Keep `AGENT_AUTH_MODE=subscription` and run `npm run agents:login`.
4. Open the printed URL, complete **Sign in with ChatGPT**, and, if needed, paste
   the final redirect URL into the terminal. The app identifies itself as
   **Aha Demo <host-id prefix>**. Verify that registration in ChatGPT Settings.
5. Run `npm run agents:check`. This makes a small real inference request and
   consumes some account usage. `npm run agents:status` only checks local config.
6. With `VIDEO_GENERATOR=pi`, run `npm run backend:dev` and create a video normally.

These npm commands run from `backend/`, so Bun reads the same `.env.local` for
login and the server. Credentials default to `~/.aha/pi/auth.json`, outside the
checkout. To override this, use the same absolute `PI_CODING_AGENT_DIR` for every
command. Each developer logs in separately. A persistent `host-id` identifies
each installation. Select Pi explicitly with `VIDEO_GENERATOR=pi`, or set `VIDEO_GENERATOR=simulated` to use the existing
simulated generator. Queued simulated jobs retain that generator after enabling Pi.
Login refuses to overwrite a saved registration: stop the backend and log out
before logging in again, so an old remote session is not left behind.

## Reuse an existing local Pi login

If this machine is already logged into Pi using its `openai-codex` provider,
set these values in the ignored `backend/.env.local`:

```dotenv
AGENT_AUTH_MODE=subscription
AGENT_PROVIDER=openai-codex
PI_CODING_AGENT_DIR=/home/your-user/.pi/agent
```

The backend uses Pi's supported provider and the original credential file directly,
including its locked refresh handling. It does not copy tokens or fall back to an
OpenAI API key. Run `npm run agents:status` and `npm run agents:check` to verify this
configuration. Aha's login/logout commands do not replace or remove a shared Pi
registration; manage that login through Pi or ChatGPT Settings.

`AGENT_PROVIDER` defaults to `openai` for new Aha registrations. API-key mode uses
that provider. Select an ElevenLabs voice available in the account owning the
configured key; the example Alexander voice may belong to a different account.

## Switch to an API key

Set the following server-only configuration, restart, and run `agents:check`:

```dotenv
AGENT_AUTH_MODE=api-key
OPENAI_API_KEY=your-key
```

API-key mode holds the key in memory and ignores saved OAuth credentials.
Subscription mode requires OAuth and cannot fall back to an API key. Changing
modes does not revoke the previous subscription registration.

`AGENT_MODEL` defaults to `gpt-6.1-sol`, `AGENT_THINKING` to `medium`, and
`AGENT_TIMEOUT_MS` to 300000 per script/scene including repairs. The model must
exist in the pinned catalog and be available to your account; `agents:check`
verifies inference. Runs allow twelve agent turns and three final-output
validation attempts. Provider retries and automatic compaction are disabled.

## Demo server

Compose mounts a private persistent directory at `/data/agents`. Its `pi/`
subdirectory holds credentials/host identity, and `jobs/` holds generated work.
On the VM it defaults to `/srv/apps/3yellow3white-actions/agents`. Override it
using `AGENT_STATE_DIR` in the existing runtime environment file. Deployment
creates it for `deploy` with mode 700, outside releases. Compose manages the
container's `PI_CODING_AGENT_DIR` and `AGENT_DATA_DIR` values.

Set `VIDEO_GENERATOR=pi`, `AGENT_AUTH_MODE=subscription`, model settings and the
existing ElevenLabs configuration in the VM runtime environment. After deploying:

```sh
cd /srv/apps/3yellow3white-actions/docker-current
sudo docker compose -p 3yellow3white --env-file compose.env exec app bun backend/src/agents/cli.ts login
sudo docker compose -p 3yellow3white --env-file compose.env exec app bun backend/src/agents/cli.ts check
```

Login needs an interactive terminal. Open its URL on your computer and paste the
final redirect URL when asked; Docker needs no exposed OAuth callback port.
Give the VM its own login and host identity. Avoid concurrently using a copied
refresh token on both laptop and server. Credentials stay out of images and CI.

## End the demo

Disconnect the VM's **Aha Demo <host-id prefix>** in ChatGPT Settings from your browser, even if
you have lost VM access. Confirm that you can identify the registration during
setup and test disconnect/reconnect before relying on it. Disconnecting a shared
registration may affect other installations; do not assume instantaneous cutoff
of already-issued access tokens.

For local cleanup, stop the backend and run `npm run agents:logout`. It calls
OpenAI's discovered revocation endpoint and requires success before deleting the
saved credential. On failure it retains the credential and directs you to
ChatGPT Settings. The host ID is retained. Deleting `auth.json` or Pi's local
logout alone does not prove remote revocation. Revoke API keys separately.

On the VM, stop generation first and use the same persistent mount:

```sh
sudo docker compose -p 3yellow3white --env-file compose.env stop
sudo docker compose -p 3yellow3white --env-file compose.env run --rm --no-deps app backend/src/agents/cli.ts logout
```

Revocation does not erase documents, scripts, audio, or scenes on the VM.

## Failures and verification

Authentication failures, limits, timeouts, and invalid output fail the video job
with a safe message; completed scenes remain playable. Shutdown cancels the
active agent and leaves unfinished videos resumable. Video restart recovery resumes interrupted narration using cached chunks; the last
unsaved speech request may be billed again. Failed narration still needs explicit retry. Failed video jobs do not automatically retry.

Backend tests exercise real Pi sessions with an injected model stream and fake
speech. They cover auth isolation, revocation failure, tool restrictions,
validation repair, cancellation, audio IDs, and reuse of saved generation.
They also check that repeated tool calls stop at the turn limit.
Container smoke tests import Pi under Bun and verify persistent state across
replacement, without external inference or speech calls.

References: [Pi SDK](https://pi.dev/docs/latest/sdk),
[OpenAI revocation](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions),
[VM credentials](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms).
