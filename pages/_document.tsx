import { extractCritical } from 'emotion-server';
import Document, { Html, Head, Main, NextScript } from 'next/document';
import { uri } from '../src/lib/path';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const styles = extractCritical(initialProps.html);
    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          <style
            data-emotion-css={styles.ids.join(' ')}
            dangerouslySetInnerHTML={{ __html: styles.css }}
          />
        </>
      ),
    };
  }

  render() {
    return (
      <Html>
        <Head>
          {/* <link
            rel="stylesheet"
            href="https://unpkg.com/codemirror@5.39.2/lib/codemirror.css"
          /> */}
          {/* <link rel="stylesheet" href="/_next/static/style.css" /> */}
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href={uri('/favicons/apple-touch-icon.png?v=qABAGbMGwd')}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href={uri('/favicons/favicon-32x32.png?v=qABAGbMGwd')}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href={uri('/favicons/favicon-16x16.png')}
          />
          <link rel="manifest" href={uri('/favicons/site.webmanifest')} />
          <link
            rel="mask-icon"
            href={uri('/favicons/safari-pinned-tab.svg?v=qABAGbMGwd')}
            color="#8d1602"
          />
          <link
            rel="shortcut icon"
            href={uri('/favicons/favicon.ico?v=qABAGbMGwd')}
          />
          <meta name="msapplication-TileColor" content="#fafafa" />
          <meta
            name="msapplication-config"
            content={uri('/favicons/browserconfig.xml?v=qABAGbMGwd')}
          />
          <meta name="theme-color" content="#ffffff" />

          {/* OG Tags */}
          <meta property="og:title" content="PDF Kitchen" />
          <meta
            property="og:description"
            content="React renderer for creating PDF files on the browser and server"
          />
          <meta property="og:image" content={uri('/images/og-banner.png')} />
          <meta property="og:image:width" content="950" />
          <meta property="og:image:height" content="650" />
          {/* <meta property="og:url" content="http://react-pdf.org" /> */}
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
