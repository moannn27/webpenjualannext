export function getFloatingControlBottom(hasBottomBar: boolean, control: "chat" | "back-to-top") {
  if (!hasBottomBar) return control === "chat" ? "bottom-5" : "bottom-22";
  if (control === "chat") return "bottom-[calc(68px_+_env(safe-area-inset-bottom)_+_0.75rem)]";
  return "bottom-[calc(68px_+_env(safe-area-inset-bottom)_+_0.75rem_+_3.5rem_+_0.75rem)]";
}
