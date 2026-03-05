# Fix: Double API Call on Mount (Audit #19)

This doc explains **why** the legal compliance hook was firing the same fetch twice on mount, **what** that cost (extra load and possible race conditions), and **how** we fixed it by keeping a single “load on mount” effect.

---

## 1. What was the problem?

In **MuseBar/src/hooks/useLegalCompliance.ts**, the hook exposes `loadComplianceData()` to fetch compliance status from `/legal/compliance/status`. To load that data when the component using the hook first mounts, the code used **two separate `useEffect` hooks** that did the same thing:

| Location   | Comment                         | Effect body        | Dependencies     |
|-----------|----------------------------------|--------------------|------------------|
| Lines 103–106 | “Auto-load compliance data on component mount” | `loadComplianceData()` | `[loadComplianceData]` |
| Lines 152–155 | “Load initial compliance data”       | `loadComplianceData()` | `[loadComplianceData]` |

Both effects run after the first render. Because `loadComplianceData` is stable (wrapped in `useCallback` with `[]`), both effect dependency arrays are identical and neither effect re-runs later. So on mount, **each effect runs once** → **`loadComplianceData()` is called twice** → **two identical requests** to the same endpoint.

**Result:** Double API call every time a component using `useLegalCompliance` mounts: wasted bandwidth, extra server load, and potential for race conditions (e.g. two in-flight requests, second response overwriting the first in state).

---

## 2. Why this matters

- **Performance and cost:** One fetch is enough to show compliance status. A second request doubles load on the client, network, and backend with no benefit.
- **Predictability:** With two requests, the order of responses is not guaranteed. Depending on timing, the “last” response wins in state; that can be confusing when debugging or if the backend ever returns different data for rapid duplicate calls.
- **React usage:** “Load once on mount” should be expressed by a **single** `useEffect` with the right dependencies. Duplicate effects with the same dependency array are almost always a mistake (copy-paste or merge) and should be removed.

So the fix is: **keep one “load on mount” effect** and remove the duplicate.

---

## 3. What we changed

- **Removed** the second `useEffect` (the one around lines 152–155 with the comment “Load initial compliance data”).
- **Kept** the first `useEffect` (lines 103–106, “Auto-load compliance data on component mount”) as the only place that runs `loadComplianceData()` on mount.

No change to `loadComplianceData` itself, to the returned state/actions, or to any other behaviour. Callers can still call `loadComplianceData()` manually (e.g. after an action) if needed.

---

## 4. How to verify

1. **Network:** Open the app, navigate to the screen that uses `useLegalCompliance` (e.g. legal compliance / conformity), and check the network tab. You should see **one** request to the compliance status endpoint (e.g. `/legal/compliance/status` or equivalent) on mount, not two.
2. **Behaviour:** Compliance status still loads and displays as before; only the duplicate request is gone.

---

## 5. Takeaway

- **One intent, one effect:** If the goal is “run this once when the component mounts,” use a single `useEffect` with the appropriate dependency array (e.g. `[loadComplianceData]` for a stable callback). Duplicate effects with the same dependencies cause duplicate runs.
- **Review after copy-paste or merges:** When adding “load on mount” logic, check that there isn’t already another effect doing the same thing elsewhere in the same hook or component.
- **Stable dependencies:** Because `loadComplianceData` is created with `useCallback` and an empty dependency array, it’s stable across renders, so the single effect runs only once on mount and doesn’t re-run unnecessarily.
