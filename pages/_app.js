import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'emotion-theming';
import Head from 'next/head';
import React from 'react';

import theme from '../src/constants/theme';

import pkg from '../package.json';

// Global styles
require('../public/styles/index.css');


import App from 'next/app';

class MyApp extends App {
  render() {
    const { Component, pageProps, _router } = this.props;

    const getTitle = () => {
      return pkg.name.replace('pdf',"PDF").split("-").map((v, i) => v.charAt(0).toUpperCase() + v.slice(1)).join(" ").concat(" | ", pkg.description)
    }

    return (
      <>
        <Head>
          <title>{getTitle()}</title>
          <meta name='description' content={pkg.description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

          <ThemeProvider theme={theme}>
            <Component {...pageProps} />
          </ThemeProvider>

        <Analytics />
      </>
    );
  }
}

export default MyApp;
