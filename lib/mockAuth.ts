// Mock authentication for development
export const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiZW1haWwiOiJkZXZAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.mock-signature";

export const MOCK_USER = {
  id: "1234567890",
  email: "dev@example.com",
  name: "Dev User"
};

// Enable mock mode in development
export const MOCK_MODE = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

export function setMockAuth() {
  if (typeof window !== "undefined") {
    localStorage.setItem("aiclipx_token", MOCK_TOKEN);
    console.log("🔧 Mock auth enabled - token set");
  }
}

export function clearMockAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("aiclipx_token");
    console.log("🔧 Mock auth cleared");
  }
}