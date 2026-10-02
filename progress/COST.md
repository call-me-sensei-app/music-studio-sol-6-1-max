# Usage and API-equivalent cost

Model: gpt-6.1-sol · reasoning: max · requested speed: Standard / no Fast

Usage as of 2026-10-02T04:04:55.340Z (UTC). Snapshot created 2026-10-02T04:05:54.368Z.

Active build time: 14.45 hours · total elapsed: 21.36 hours · excluded idle: 6.91 hours.

Union of logged task_started → task_complete / turn_aborted intervals. Overlapping agents count once; waiting within an active task is included. This is logged active-task time, not a claim of continuous code editing.

| Counter | Measured tokens |
|---|---:|
| Input (total) | 150988821 |
| Cached input (subset) | 147452800 |
| Cache write (subset) | 0 |
| Output (includes reasoning) | 1116158 |
| Reasoning (subset of output) | 718388 |

**API-equivalent estimate: $43.0310 USD. Not an invoice.**

Includes 2 measured sources:

| Source | Model | Input | Cached input | Output | USD equivalent |
|---|---|---:|---:|---:|---:|
| Main studio agent | gpt-6.1-sol | 129128398 | 126259840 | 1017342 | $36.5620 |
| reference_cat | gpt-6.1-sol | 21860423 | 21192960 | 98816 | $6.4690 |

Rates verified October 2, 2026 from [official pricing](https://developers.openai.com/api/docs/pricing). Cache-aware rates applied per completed prompt, including the long-context threshold if reached. Subagent counters are independent and deduplicated by source ID. Full steps in usage.json. In-flight responses are not yet recorded.

**ImageGen reference-sheet charges are not exposed by these logs and are excluded, not assumed free.** Hidden policy-review/provider charges are also not inferred.

Refresh with `npm run usage` inside this chat’s environment.
