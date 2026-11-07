# AI product features

## Applicability

Products that call models, retrieve context, expose tools, generate executable content or use
agent workflows implemented by the product. Using an agent to write ordinary application code
does not by itself make these checks applicable or require adding AI to the product.

## Checks

### AI1 — Untrusted content does not grant authority

Treat retrieved documents, user content and tool outputs as untrusted data. Separating instructions
and data helps but does not eliminate injection. Keep secrets and authorization decisions out
of prompts. Tool code independently authenticates, scopes resources, validates arguments and
bounds effects even under attacker-chosen arguments. Use trusted confirmation or independently
enforced preauthorization for consequential actions; another model turn alone is not a trust
boundary. Bind authorization to the exact validated operation, destination, scope and relevant
cost, then check that binding at execution; model-asserted approval has no authority. Preserve
prior bounded authorization rather than repeatedly prompting by ritual.

### AI2 — Outputs meet the consuming boundary

Validate structured outputs/tool arguments against the real schema and business constraints.
Render safely, constrain fetched model-supplied URLs and verify cited sources against retrieved
material. Generated executable content runs only in an appropriately isolated environment with
bounded filesystem/network/credentials/resources. Plausible text is not proof of correctness.

### AI3 — Retrieval and egress respect identity

Authorize retrieval before disclosing content to the model or user. Check provider retention,
training, residency and third-party egress against the actual data requirements. Minimize inputs
and telemetry; avoid sending credentials or unnecessary personal data. Disclose AI use where
the product contract requires it. [Privacy](data-protection.md) owns lifecycle obligations.

### AI4 — Paid execution and streams are bounded

Bound relevant input/output tokens, steps, retries, spend and concurrency before paid work.
Enforce shared caps atomically where concurrent callers can exceed them. Anonymous/public paid
surfaces need abuse-resistant cap identity and an aggregate spend ceiling; creating another
session must not reset the service's total protection. An ambiguous timeout
may already be billed; use provider idempotency/reconciliation where supported. Streaming needs
idle/total deadlines and cancellation handling; explicitly distinguish partial from completed
output. Partial text may be displayed as incomplete but cannot become an authorized completed
action. Durable side effects retain a completion/recovery owner after a client disconnect.

### AI5 — Evaluate meaningful behavior and adversarial failures

Keep deterministic wrapper/tool tests and representative/adversarial evaluations for material
model/prompt/tool changes. Derive expected behavior independently. Include unauthorized tool
requests, hostile retrieved content, malformed/partial output and consequential cost/failure
paths. Sample nondeterminism enough for the risk, without a universal repeat count or scoring
floor. Record actual model/configuration and limitations; changes in model behavior can invalidate
old evidence. Do not add an evaluation platform when a small maintained corpus suffices.
