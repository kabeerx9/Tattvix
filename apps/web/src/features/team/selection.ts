import type { TeamUser } from "@tattvix/contracts";

type State = { search: string; selected: TeamUser | null };
type Action = { type: "select"; user: TeamUser | null } | { type: "input"; value: string; reason: string };
export function teamUserSelection(state: State, action: Action): State {
  if (action.type === "select") return { search: action.user?.email ?? "", selected: action.user };
  // Base UI also fires input callbacks while applying a selection. Only real
  // input/clear actions may invalidate the identity the user just chose.
  if (!["input-change", "input-clear", "clear-press"].includes(action.reason)) return state;
  return { search: action.value, selected: action.value === state.selected?.email ? state.selected : null };
}
