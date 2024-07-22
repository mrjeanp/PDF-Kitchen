const nextConfig = require('../../next.config');

export default function basePath() {
  return nextConfig.basePath as string;
}
