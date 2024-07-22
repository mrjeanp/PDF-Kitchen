/** @type {import('next').NextConfig} */

const path = require("path")



const nextConfig = {
  basePath: process.env.GITHUB_ACTIONS ? "/pdf-kitchen" : "", // TODO: make this dynamic
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
};

module.exports = {
  ...nextConfig,
  webpack: (config, options) => {


    const source = "node_modules/@react-pdf/layout/lib/index.js"
    const patch = "src/patches/@react-pdf/layout/lib/index.js"
    config.resolve.alias[path.resolve(__dirname, source)] = path.resolve(__dirname, patch)

    // const cjs = "node_modules/@react-pdf/layout/lib/index.cjs"
    // config.resolve.alias[path.resolve(__dirname, cjs)] = path.resolve(__dirname, to)

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
