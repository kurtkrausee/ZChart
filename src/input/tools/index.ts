// input/tools/index.ts
// Version: 1.0.0 | Updated: 2026-06-07 | By: Agent
//
// Barrel module for the Tool Registry. Re-exports the registry API and
// triggers tool registration via side-effect imports.
//
// Consumers MUST import from './tools' (not directly from './tools/registry'),
// so that the registry's internal `toolRegistry` Map is fully initialized
// BEFORE any registerTool() call runs. This avoids the TDZ ReferenceError
// that occurs when side-effect imports are placed inside registry.ts itself.

export * from './registry';

// Side-effect imports — registry must be fully evaluated above before these run.
import './singleClickTools';
import './twoClickTools';
import './multiClickTools';
import './twoStepDialogTools';
import './specialTools';
