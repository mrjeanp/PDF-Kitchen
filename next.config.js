/** @type {import('next').NextConfig} */

const app = require('./app')

const path = require("path")

const nextConfig = {
  basePath: app.basePath,
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
};

module.exports = {
  ...nextConfig,
  webpack: (config, options) => {


    const patches = {
      "node_modules/@react-pdf/layout/lib/index.js": "src/patches/@react-pdf/layout/lib/index.js"
    }
    for (const [source, patch] of Object.entries(patches)) {
      config.resolve.alias[path.resolve(__dirname, source)] = path.resolve(__dirname, patch)
    }

    config.module.rules.push({
      test: /\.md/,
      use: [options.defaultLoaders.babel, '@mdx-js/loader'],
    });

    config.module.rules.push({
      test: /\.worker\.(min\.)?js$/,
      loader: 'file-loader',
      options: {
        name: "[contenthash].[ext]",
        publicPath: "_next/static/worker",
        outputPath: "static/worker"
      }
    });

    return config;
  },
};
