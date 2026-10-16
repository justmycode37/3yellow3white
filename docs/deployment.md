# Docker deployment

The app repository owns `.github/workflows/ci.yml`, `Dockerfile`, `compose.yaml`,
and `scripts/*release*`. GitHub Actions builds and tests a Linux x86_64 Docker
image and saves a release artifact on `main`. Deployment to the VM is manual;
GitHub Actions does not connect to the VM. No container registry, GitHub
credentials on the VM, or infrastructure repository is required.

## After merging to main

Pull requests run the library, frontend, backend, and deployment configuration
checks. They also build the image and run the container lifecycle test. A push to
`main` runs those checks and saves the tested image as a `release-COMMIT_SHA`
artifact for three days. **Run workflow** on `main` repeats the checks and artifact
upload. No workflow run activates production. Use the manual procedure below to
transfer and activate a tested release.

The multistage Dockerfile builds the frontend/shared library with Node, then ships
only the backend, built assets, production dependencies, and the lockfile's Bun
runtime in a Debian image. Base images are pinned by digest. Runtime secrets and
local databases are excluded from the Docker build context.

Newly generated scenes pass a mandatory image review before publication. The
runtime also ships Node, native `webgpu`, and Mesa Vulkan drivers for headless
rendering. Vulkan drivers come from Debian's signed `bookworm-backports` repository
([package](https://packages.debian.org/bookworm-backports/mesa-vulkan-drivers));
Bookworm's original Mesa 22 driver lacks dynamic indexing required by native WebGPU.
The image build runs `node shared/animlib/tools/smoke-frames.mjs` as the
application user: both 16:9 and 4:3 must contain real rendered pixels. A missing
adapter or incompatible native dependency fails the build rather than deploying
a server that cannot review scenes. Local development needs Node and a compatible
WebGPU adapter; the same smoke command checks it without model calls.

The lifecycle test uses a unique Compose project, temporary data directories, and
an automatically allocated **loopback-only** port. It checks compilation, routes,
built assets, identity headers, owner isolation, stored video/WAV audio, literal
environment values, a non-root process, a read-only app filesystem, clean shutdown,
stop/start with an unfinished job, crash recovery, and removal/recreation with
persistent SQLite, narration, and agent files. It imports Pi under Bun without
external inference, ElevenLabs calls, or production data.

The VM must have Docker Engine running and enabled at boot, **Docker Compose
2.30.0 or newer**, SSH, Bash, tar, curl, Python 3, and flock. The existing `deploy`
user needs passwordless sudo; it does not need Docker group membership or Node.
On the inspected `team-11` VM (Ubuntu 26.04), Docker Engine 29.9.0 and Compose
5.6.0 were already installed, and Docker was enabled at boot.

## Activation and rollback

SSH uploads `release.tar.gz`, its checksum, and `scripts/deploy-release.sh`. The
archive contains the saved Docker image, Compose file, revision, and validation
scripts. The VM streams the saved image directly from the upload into Docker,
avoiding a second saved-image file on disk. It verifies the image's revision label
and repeats the isolated container lifecycle test **before stopping production**.

The first Docker activation stops the old `3yellow3white` systemd service, starts
the `3yellow3white` Compose project on `0.0.0.0:8080`, waits for Docker health, and
verifies `/healthz` reports the expected commit. Only after that does it disable
the old app unit at boot and atomically update
`/srv/apps/3yellow3white-actions/docker-current`. Docker's `unless-stopped`
restart policy handles crashes and reboot recovery. The old systemd unit and its
release are retained for recovery.

Later deployments replace the Compose container after the candidate passes.
If activation fails, the script removes the failed container and starts the
previous Docker release; during first migration it restarts the old systemd
service instead. This switch has a short interruption. There is only one writer
for each database/narration directory. Rollback restores application code and
configuration; it does not undo database changes.
If the failed container cannot be removed, rollback retains its recovery files
and leaves the previous application stopped (and legacy systemd disabled at boot)
to prevent competing database writers.

The public address remains <https://11.hackathon.ethz.ch>. VISCon handles TLS and
access control and forwards to VM port 8080. Deployment does not install a new
reverse proxy or change SSH settings. Docker publishes the same application port.

## Deployment access

Manual uploads require SSH access as the VM's `deploy` user. GitHub Actions no
longer uses the `production` environment, VM SSH secrets, or VM host/user variables.
Configure runtime secrets on the VM or supply a private `deployment.env` beside
the uploaded archive as described below.

## Runtime configuration and storage

Settings are read from `/srv/apps/3yellow3white/.env`, then
`/etc/3yellow3white/environment` (later values win). An optional private
`deployment.env` beside the uploaded archive takes precedence over both VM files.
GitHub Actions does not supply runtime secrets. Keep secrets outside the Docker
image and uploaded build artifact, and remove temporary upload copies after
deployment. Each release retains its mode-600 runtime file for restart and rollback.
Use one `KEY=value` per line;
whole values can be single/double quoted. Root-owned files are read through sudo
without logging their values. Shell commands and `$` references are
never executed/interpolated; single-line backslash escapes follow systemd's
EnvironmentFile rules. Multiline values are rejected before activation. Each release
stores a translated `runtime.env` with mode 600 in its mode-700 directory.
Compose uses `format: raw` so literal dollars and quotes survive. Managed
`NODE_ENV`, `HOST`, `PORT`, `APP_REVISION`, storage paths, and
`NARRATION_ALLOW_LOCAL=0` override runtime-file values.

The container runs as the host `deploy` UID/GID with its application filesystem
read-only, capabilities dropped, and a small writable `/tmp`. Bind mounts retain
host ownership and persist across replacement:

- SQLite: `/srv/apps/3yellow3white-actions/data/videos.sqlite` by default, mounted
  with its whole directory (including WAL/SHM files). An existing absolute
  `VIDEO_DB_PATH` in the runtime files is honored by mounting its parent.
- Model GLBs: `/data/videos/models` inside the container, using the same video
  bind mount. `MODEL_ASSET_DIR` is set by Compose; no additional host directory
  or mount is needed. Model files remain shared when individual videos are deleted.
- Narration: `/var/lib/3yellow3white/narration` by default, or the existing absolute
  `NARRATION_DATA_DIR`. Mounted at `/data/narration` inside the container.
- Pi: `/srv/apps/3yellow3white-actions/agents` by default, or absolute
  `AGENT_STATE_DIR`. Mounted at `/data/agents`, holding private credentials in
  `pi/` and generated scripts/scenes in `jobs/`. New directories use mode 700.
  See [agent login, API-key switching, and remote disconnect](agents.md).

The three data directories must be separate, without nesting. Paths must be outside release directories and use letters, numbers, `/`, `_`,
`.`, or `-`. Missing data directories are created for `deploy`; existing directory
ownership is not changed. Configured paths should match those used by the old
service before migration.

Configure `NARRATION_PUBLIC_ORIGIN=https://11.hackathon.ethz.ch` for both video
and narration origin validation behind the gateway, along with
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and `ELEVENLABS_MODEL_ID`. Supply these
values in `deployment.env` beside the archive or in the VM runtime files.
Never run a second writer
or the narration CLI against the active data directory. See [narration](narration.md).

## Build and verify without activating production

On a machine with Docker, Compose >=2.30, and Python 3:

```sh
bash scripts/package-release.sh "$(git rev-parse HEAD)" /tmp/aha-release
```

This builds the image and runs the isolated lifecycle test. Alternatively, download
and extract the `release-COMMIT_SHA` artifact from a successful `main` workflow run.
Transfer `release.tar.gz`, `release.sha256`, and `scripts/deploy-release.sh` to a
temporary VM directory using the deployment key. From that directory, as `deploy`:

```sh
sha256sum --check release.sha256
bash deploy-release.sh release.tar.gz COMMIT_SHA --check
```

`--check` loads/tests the image and removes its candidate release directory. It
never stops production or mounts production data. The loaded image is retained.
Omitting `--check` activates production; only do that when ready to switch.

## Start, stop, inspect, and recover

After Docker migration, run on the VM:

```sh
cd /srv/apps/3yellow3white-actions/docker-current
sudo docker compose -p 3yellow3white --env-file compose.env ps
sudo docker compose -p 3yellow3white --env-file compose.env logs --tail 100
sudo docker compose -p 3yellow3white --env-file compose.env stop
sudo docker compose -p 3yellow3white --env-file compose.env up -d --wait
curl --fail http://127.0.0.1:8080/healthz
```

`stop` leaves the container and data in place and keeps it stopped across reboots.
`down` removes the container/network; the bind-mounted data remains. `up -d --wait`
recreates it. Logs rotate at 10 MB, keeping three files per container.

For a manual Docker rollback, stop the current project, follow its
`previous-docker` link, then run the same `up -d --wait` command with that release's
`compose.env` and update `docker-current` to that release. Verify `/healthz`.

To return to systemd after the first migration, stop/down the Compose project,
then `sudo systemctl enable --now 3yellow3white` and check health. Move
`docker-current` aside before a future migration, because it identifies the
active Docker deployment. Never start both services on port 8080 or against the
same data directories.

The legacy `/srv/apps/3yellow3white-actions/current` pointer is retained. Docker
release directories and previous-release links are retained as recovery metadata.
Image retention keeps the current release and its two immediate predecessors,
plus images referenced by any container (including stopped containers). Older
release metadata does **not** guarantee that its image is still present.

Before loading a release and after successful activation, `cleanup-images.py`
removes obsolete images from the `3yellow3white` repository. It shares the
deployment lock, protects the incoming image before activation, skips untagged
images and images tagged for other repositories, and never uses force deletion.
Broken rollback references or missing retained images stop cleanup. `--check`
only reports cleanup candidates; it never deletes images.

Before image loading, deployment requires at least 8 GiB free, or four times the
compressed upload size plus 2 GiB, whichever is larger. It checks the application
filesystem, DockerRootDir, and `/var/lib/containerd` when present. This is a
conservative headroom check, not a guarantee for arbitrarily compressible images.
An insufficient-space failure occurs before production is stopped. Cleanup after
successful activation reports errors without rolling back the healthy service.

The VM also runs hourly retention independently of deployments. To install or
update it from a reviewed checkout:

```sh
sudo install -d -m 755 /usr/local/lib/3yellow3white
sudo install -m 644 scripts/cleanup-images.py /usr/local/lib/3yellow3white/cleanup-images.py
sudo install -m 644 scripts/3yellow3white-image-retention.service scripts/3yellow3white-image-retention.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now 3yellow3white-image-retention.timer
```

The timer skips a run when deployment holds the lock. Inspect its results with
`journalctl -u 3yellow3white-image-retention.service` and its schedule with
`systemctl list-timers 3yellow3white-image-retention.timer`. Preview cleanup with
`sudo -u deploy python3 /usr/local/lib/3yellow3white/cleanup-images.py`; add
`--apply` to execute. This cleanup never deletes database, narration, agent data,
volumes, containers, other projects, or release directories. Build cache and legacy
release directories are small secondary consumers and are left alone. Do not use
`docker system prune` as part of deployment.

## Verification performed

On 2026-10-10, the image and saved-image release passed lifecycle tests on the
actual VM, both as `viscon` with Docker access and as `deploy` through sudo.
The production deployment script passed `--check`. Isolated integration tests
also verified failed first migration → systemd recovery, successful migration,
and failed Docker upgrade → previous healthy container. Test services, containers,
networks, and data were removed. These validation runs did not activate production.
Independent review also checked environment translation against actual systemd
using synthetic escaped values and a private root-owned file, and verified that
failed candidate removal prevents a competing writer and retains recovery files.

The repeatable migration/rollback test is `scripts/test-docker-deployment.py`.
Run it as `deploy`, supplying the archive, its SHA, and an existing legacy Bun
release directory. It creates its own loopback port, temporary unit/project,
and data directories. It uses modified copies of deployment paths/configuration
and injects a container crash after candidate validation; it never stops the
production unit. It requires the legacy Bun release to remain available.
