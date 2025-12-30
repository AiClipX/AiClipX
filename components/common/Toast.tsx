import { createRoot } from "react-dom/client";

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

export function showToast(message: string, duration = 1000) {
  if (!container) {
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "24px";
    container.style.right = "24px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  root.render(
    <div
      style={{
        background: "#1f2937",
        color: "white",
        padding: "10px 14px",
        borderRadius: 6,
        fontSize: 13,
        boxShadow: "0 10px 20px rgba(0,0,0,.35)",
      }}
    >
      {message}
    </div>
  );

  setTimeout(() => {
    root?.unmount();
    root = null;
    container?.remove();
    container = null;
  }, duration);
}
