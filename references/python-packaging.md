# Python packaging and execution

## Applicability

Python environments, manifests, installation and distribution. Respect the existing manager and
layout; neither uv nor a src/ migration is mandatory.

## Checks

### PYPKG1 — Runtime and dependency resolution agree

Declare supported interpreters and keep checker/formatter targets compatible with them. Use an
isolated venv/container or equivalent and reproducible resolution/integrity. Verify a frozen
install also catches manifest/lock drift as required by the selected tool; consult its actual
version's semantics. Review install hooks and dependency trust using [build integrity](supply-chain-and-build-integrity.md).

### PYPKG2 — The delivered artifact works

Test relevant imports/entrypoints from an installed wheel/package when source-tree execution
can hide missing files or dependencies. Account for native wheels, OS/architecture/ABI and system
libraries. Production installation must not accidentally rely on development-only dependencies.
A src/ layout can help; changing a functioning layout is not itself a correctness improvement.

### PYPKG3 — Process and concurrency assumptions hold

Where relevant, verify the actual interpreter's threading/GIL mode and multiprocessing start
behavior. Avoid relying on inherited process state or incidental interpreter locking for shared
resource correctness. Keep command vocabulary discoverable and equivalent locally and in CI;
do not invent a second task runner merely for naming uniformity.
