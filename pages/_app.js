// pages/_app.js
import "../styles/globals.css";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
// import đúng đường dẫn JS so với _app.js

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <VideoListProvider>
        <Component {...pageProps} />
      </VideoListProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
