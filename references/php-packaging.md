# PHP packaging

## Applicability

Composer manifests/lockfiles, extensions, autoloading and production dependencies.

## Checks

### PHPPKG1 — Resolve reproducibly against the real runtime

Use install from the committed lockfile and verify manifest consistency. Composer config.platform
simulates a target; verify the actual production PHP/extensions too. Declare required extensions
and constrain trusted plugins/install hooks. Dependency identity and supply-chain risks follow
[build integrity](supply-chain-and-build-integrity.md).

### PHPPKG2 — Production installation and autoload work

Exercise no-dev production dependencies where dev tools could hide missing runtime imports.
Check case-sensitive autoload paths for the deployment filesystem. Optimized or authoritative
classmaps are options, not universally valid for runtime-generated classes. Keep tool/runtime
settings compatible and use the project's existing test/analyzer/formatter commands.
