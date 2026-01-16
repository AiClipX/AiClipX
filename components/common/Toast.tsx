import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

type ToastType = "success" | "error" | "warning";

let root: ReturnType<typeof createRoot> | null = null;
let container: HTMLDivElement | null = null;

export function showToast(
  message: string,
  type: ToastType = "success",
  duration = 1500
) {
  if (!container) {
    container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.zIndex = "9999";
    container.style.pointerEvents = "none"; // không chặn click
    document.body.appendChild(container);
  }

  if (!root) {
    root = createRoot(container);
  }

  const Toast = () => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }, []);

    let bgColor = "#1f2937";
    let Icon = CheckCircleIcon;
    let iconColor = "#22c55e";

    switch (type) {
      case "success":
        bgColor = "#22c55e"; // xanh đậm
        Icon = CheckCircleIcon;
        iconColor = "#ffffff";
        break;
      case "error":
        bgColor = "#ef4444"; // đỏ đậm
        Icon = XCircleIcon;
        iconColor = "#ffffff";
        break;
      case "warning":
        bgColor = "#f59e0b"; // vàng đậm
        Icon = ExclamationTriangleIcon;
        iconColor = "#ffffff";
        break;
    }

    return (
      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: "transform 0.3s, opacity 0.3s",
          transform: visible ? "scale(1)" : "scale(0.9)",
          background: bgColor,
          color: "#ffffff",
          padding: "18px 28px",
          borderRadius: 12,
          fontSize: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          fontWeight: 600,
          minWidth: 320,
          maxWidth: 500,
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
        }}
      >
        <Icon style={{ width: 24, height: 24, color: iconColor, flexShrink: 0, marginTop: 2 }} />
        <span style={{ whiteSpace: "pre-line", textAlign: "left", flex: 1 }}>{message}</span>
      </div>
    );
  };

  root.render(<Toast />);

  setTimeout(() => {
    root?.unmount();
    root = null;
    container?.remove();
    container = null;
  }, duration + 300);
}

// Helpers
export const toastSuccess = (msg: string) => showToast(msg, "success");
export const toastError = (msg: string) => showToast(msg, "error");
export const toastWarning = (msg: string) => showToast(msg, "warning");
