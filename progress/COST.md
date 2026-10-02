# Usage and API-equivalent cost

Model: gpt-6.1-sol · reasoning: max · requested speed: Standard / no Fast

Usage as of 2026-10-02T04:11:51.682Z (UTC). Snapshot created 2026-10-02T04:12:34.305Z.

Active build time: 14.56 hours · total elapsed: 21.47 hours · excluded idle: 6.91 hours.

Union of logged task_started → task_complete / turn_aborted intervals. Overlapping agents count once; waiting within an active task is included. This is logged active-task time, not a claim of continuous code editing.

| Counter | Measured tokens |
|---|---:|
| Input (total) | 152640249 |
| Cached input (subset) | 149098368 |
| Cache write (subset) | 0 |
| Output (includes reasoning) | 1120581 |
| Reasoning (subset of output) | 722277 |

**API-equivalent estimate: $43.4499 USD. Not an invoice.**

Includes 2 measured sources:

| Source | Model | Input | Cached input | Output | USD equivalent |
|---|---|---:|---:|---:|---:|
| Main studio agent | gpt-6.1-sol | 130779826 | 127905408 | 1021765 | $36.9809 |
| reference_cat | gpt-6.1-sol | 21860423 | 21192960 | 98816 | $6.4690 |

Rates verified October 2, 2026 from [official pricing](https://developers.openai.com/api/docs/pricing). Cache-aware rates applied per completed prompt, including the long-context threshold if reached. Subagent counters are independent and deduplicated by source ID. Full steps in usage.json. In-flight responses are not yet recorded.

**ImageGen reference-sheet charges are not exposed by these logs and are excluded, not assumed free.** Hidden policy-review/provider charges are also not inferred.

Refresh with `npm run usage` inside this chat’s environment.
