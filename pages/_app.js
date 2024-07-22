import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'emotion-theming';
import Head from 'next/head';
import React from 'react';

import theme from '../src/constants/theme';

import App from 'next/app';

// Global styles
require('../public/styles/index.css');

const config = require("../app")

class MyApp extends App {
  render() {
    const { Component, pageProps, _router } = this.props;

    return (
      <>
        <Head>
          <title>{config.title}</title>
          <meta name='description' content={config.description} />
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
