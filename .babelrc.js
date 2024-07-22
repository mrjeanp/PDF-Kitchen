const env = require('./env-config.js')

module.exports = {
  presets: ['next/babel'],
  plugins: [
    "inline-react-svg",
    ["prismjs", {
        "languages": ["jsx", "bash"]
    }],
    ['transform-define', env]
  ]
}
