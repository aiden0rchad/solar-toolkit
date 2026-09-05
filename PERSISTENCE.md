# Saved calculator inputs

Inputs survive tool navigation and page reloads in the same browser tab by default, using sessionStorage. Closing the tab normally clears that session; browser session-restore settings can retain it. If storage is blocked or full, navigation still preserves inputs in memory, but a reload may lose changes.

Select **Remember inputs on this device** to also save inputs and proposal/client data in localStorage. Use this only on a private device. Unchecking it removes the persistent copy and keeps the current session. **Reset to defaults** clears only the active tool; resetting Proposal clears its client name and exported sections. Reset does not change the remember preference.

No calculator inputs are uploaded. Free and Pro use separate storage namespaces. Pro imports a valid legacy proposal into its own session once when no Pro app state exists; the legacy record remains untouched. Free never reads that legacy proposal. To remove an old legacy copy, clear site data in your browser.

## Implementation

Solar Savings also remembers the selected guided/full experience, the current guided step, and explicit location confirmation. Switching paths keeps the same calculator values. Reset returns to the two-choice welcome screen and clears the guide’s progress along with that tool’s inputs.

Tool components use `useToolState('fieldName', defaultValue, optionalValidator)` inside the app's `ToolStateContext`. Stable names, not hook order, address fields. Reset clears the scope and remounts the active component, including derived state. App-level proposal data uses the `app` scope.

Version 1 envelopes contain `{ version: 1, tools: { toolId: { fieldName: value } } }`. Restore checks version, size, nesting, JSON-safe values, and field types/shapes. Invalid fields fall back to current defaults. Nullable and empty-array fields supply explicit validators. Saved defaults are not written until changed, so new defaults take effect for untouched fields. Bump the schema version when changing incompatible field meanings.

Run `npx vitest run src/state/inputStore.test.js` for storage restoration, navigation scopes, reset, migration, and failure checks.
