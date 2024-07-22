import appConfig from '../../app';

const path = require('path');

export function uri(subpath: string) {
  return path.join(appConfig.basePath, subpath);
}
