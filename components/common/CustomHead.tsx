import Head from 'next/head';

export default function CustomHead() {
  return (
    <Head>
      {/* Prevent bfcache to avoid extension port issues */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {process.env.NODE_ENV === 'development' && (
        <>
          {/* These meta tags help prevent bfcache in development */}
          <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
          <meta httpEquiv="Pragma" content="no-cache" />
          <meta httpEquiv="Expires" content="0" />
        </>
      )}
    </Head>
  );
}