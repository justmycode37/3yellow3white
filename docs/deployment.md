# Deployment

The app repository owns `.github/workflows/ci.yml` and `scripts/*release*`.
Deployment uses SSH directly; it does not check out or run another infrastructure
repository.

## After merging to main

Pull requests run the library, frontend, and backend checks, build the site, and
smoke-test a production release. A push to `main` runs those same checks and then
deploys their release artifact. `workflow_dispatch` can redeploy the current
`main`. Other branches never deploy. Superseded main revisions are skipped, and
only one production deployment runs at a time.

The artifact contains the built frontend, shared library, backend, locked
production dependencies, and the Bun binary installed from the root lockfile.
It is built for Linux x86_64 on Ubuntu 24.04. The VM needs SSH, Bash, tar, curl,
Python 3, flock, and systemd; it does not need a Node installation or GitHub token.
The existing `deploy` user must have passwordless sudo.

SSH uploads the archive, checksum, and deployment script. The script extracts a
fresh directory under `/srv/apps/3yellow3white-actions/releases`, checks its
revision, compiles a sample scene, and tests HTTP routes/assets on a temporary
loopback port. Only after these checks does it replace the `3yellow3white`
systemd unit and restart the app on `0.0.0.0:8080`. It verifies both health and
commit SHA, restoring the previous unit if activation fails. The existing
`/srv/apps/3yellow3white` checkout is retained for migration rollback.

The managed public address remains <https://11.hackathon.ethz.ch>. VISCon handles
TLS and access control; deployment does not change the VM firewall or SSH login
settings.

## GitHub configuration

In this app repository's **Settings → Secrets and variables → Actions**, set:

- Secret `VM_SSH_PRIVATE_KEY`: the dedicated deployment private key.
- Secret `VM_SSH_KNOWN_HOSTS`: the verified SSH host-key line for the VM.
- Variable `VM_HOST`: `11-direct.viscon-hackathon.ch`.
- Variable `VM_SSH_USER`: `deploy`.

The matching public key belongs in `/home/deploy/.ssh/authorized_keys`. Use the
`restrict` prefix to disable forwarding and PTY allocation for that key. Keep
existing keys in place. The shared VM password is not needed by the workflow.

The deployment job uses the GitHub `production` environment. Repository secrets
are available to it. A repository administrator may restrict that environment to
`main`; the workflow already limits deployment to that branch.

Optional runtime configuration can live in `/etc/3yellow3white/environment` on
the VM. The legacy `/srv/apps/3yellow3white/.env` is also read if it exists. Do not
set `APP_REVISION` in either file: it is supplied by the deployment unit.

## Manual verification and recovery

After running the build/test commands, package a release:

```sh
bash scripts/package-release.sh "$(git rev-parse HEAD)" /tmp/aha-release
```

Transfer `release.tar.gz`, `release.sha256`, and `scripts/deploy-release.sh` to a
temporary directory on the VM using the deployment key. From that directory,
logged in as `deploy`, run:

```sh
sha256sum --check release.sha256
bash deploy-release.sh release.tar.gz COMMIT_SHA --check
```

`--check` removes its candidate directory and leaves the running service alone.
Omitting it activates the release. Keep the checksum and commit SHA together.

Inspect the running app with `systemctl status 3yellow3white`,
`journalctl -u 3yellow3white`, and `curl http://127.0.0.1:8080/healthz`.
Successful deployments update `/srv/apps/3yellow3white-actions/current`. Each
release saves the unit it replaced as `previous.service`; to roll back manually,
install that saved unit at `/etc/systemd/system/3yellow3white.service`, run
`systemctl daemon-reload`, and restart `3yellow3white`. Check `/healthz` afterward.
Release directories are retained for recovery; remove older unused releases
only after checking which paths the current and rollback units reference.
