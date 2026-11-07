# Dependencies and build integrity

## Applicability

Adding/updating dependencies, CI/release code, install hooks, artifact delivery and build identity.
Existing controls remain authoritative. New controls follow the actual trust boundary, not
mandatory profiles, attestations or a compliance score.

## Checks

### BUILD1 — Admit authentic, suitable dependencies

Apply [simplicity](simplicity.md) before adding a dependency. Verify its real package/source,
version/API, maintenance, relevant advisories and transitive footprint using current primary
sources. AI-suggested names may be nonexistent or malicious. Use locked/frozen resolution and
appropriate integrity checks; reproducibility alone does not establish trust. Private namespaces
must not resolve unexpectedly to public packages. Review install-time code/plugins and allow
needed execution deliberately. Release cooldowns may help but are not universal or a reason to
blindly delay necessary security fixes.

### BUILD2 — Build inputs and credentials have controlled authority

Treat workflows and agent/build instructions as privileged inputs. Use immutable identities for
consequential third-party actions/images/tools; runtime downloads need comparable trust/integrity.
Scope workflow tokens/secrets to the jobs that need them. Do not interpolate untrusted event
strings into shell code. Outside-contributor code must not run with privileged credentials/write
scope; check checkout refs, approval boundaries and caches/artifacts crossing trust levels.

### BUILD3 — Release identity is constrained

Prefer supported short-lived workload identity to broad static keys. Bind federation to the
intended repository and ref/environment, not only the organization. Scope/rotate unavoidable
static credentials. Review who can publish and what code they cause to run. Do not silently
replace the project's authorized release process with a preferred platform architecture.

### BUILD4 — Verify artifacts when trust depends on provenance

Where consumers rely on signatures/provenance, bind verification to the artifact digest and
expected signer/issuer, and reject missing required evidence or mismatches. Dependency inventories, if required, derive
from the resolved artifact. Do not impose an SBOM/signing program on every small app merely to
satisfy this guide. On a build compromise, assess affected published artifacts and all credentials
reachable by the compromised runner, not only the ones known to have been used. Treat those
credentials as exposed and revoke/rotate them; rebuild affected artifacts from trusted inputs.

## Source

[OpenSSF dependency evaluation](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html)
