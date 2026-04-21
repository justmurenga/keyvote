import { Html, Head, Main, NextScript } from 'next/document';

// This file exists solely to populate the pages-manifest so that
// `next build` page-data collection does not fail with
// "PageNotFoundError: Cannot find module for page: /_document".
// The App Router (src/app) is the real entry for this app.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
