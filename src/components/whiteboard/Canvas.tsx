// Compatibility shim — the real Canvas now lives in ./Canvas/. Older imports
// keep working via this re-export while feature modules migrate to the folder.
export { WhiteboardCanvas } from "./Canvas/index";
