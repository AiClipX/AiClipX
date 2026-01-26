import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/common/LanguageSelector";

export default function LoginPage() {
  const [email, setEmail] = useState("test.stg9.staging.1768316110@test.com");
  const [password, setPassword] = useState("TestStg9.Pass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const auth = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
      const url = `${apiBase}/api/auth/signin`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('login.error') + ` (${response.status})`);
      }

      const data = await response.json();
      const token = data.access_token || data.token;

      if (!token) {
        throw new Error(t('login.noToken'));
      }

      localStorage.setItem("aiclipx_token", token);
      await auth.login(token);
      // AuthContext will handle redirect to /dashboard
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      
      <div className="w-full max-w-md p-8 bg-neutral-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-white">{t('login.title')}</h1>
        
        <form onSubmit={handleSubmit}>
          <label className="block mb-4">
            <div className="text-sm text-neutral-300 mb-1">{t('login.email')}</div>
            <input
              className="w-full border border-neutral-700 bg-neutral-900 text-white p-2 rounded focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={loading}
            />
          </label>
          
          <label className="block mb-4">
            <div className="text-sm text-neutral-300 mb-1">{t('login.password')}</div>
            <input
              className="w-full border border-neutral-700 bg-neutral-900 text-white p-2 rounded focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              disabled={loading}
            />
          </label>
          
          {error && (
            <div className="text-red-400 mb-4 p-3 bg-red-900/30 rounded border border-red-700 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? t('login.signingIn') : t('login.submit')}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700 text-xs text-blue-300">
          <div className="font-semibold mb-1">{t('login.testAccount')}</div>
          <div>{t('login.email')}: test.stg9.staging.1768316110@test.com</div>
          <div>{t('login.password')}: TestStg9.Pass123</div>
        </div>
      </div>
    </div>
  );
}
