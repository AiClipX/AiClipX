// Temporary hardcoded token for development
// Replace this with real token from backend when available
export const DEV_TOKEN = "paste-your-real-token-here";

// Auto-login in development
export function autoLoginDev() {
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const existing = localStorage.getItem("aiclipx_token");
    if (!existing && DEV_TOKEN && DEV_TOKEN !== "paste-your-real-token-here") {
      localStorage.setItem("aiclipx_token", DEV_TOKEN);
      console.log("🔧 Auto-login with dev token");
      window.location.reload();
    }
  }
}