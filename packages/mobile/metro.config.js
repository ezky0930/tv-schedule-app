// Metro 번들러 설정 — 모노레포(workspaces)에서 @tv/shared 를 해석하도록 watchFolders 지정.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1) 워크스페이스 루트까지 감시 (packages/shared 변경 감지)
config.watchFolders = [workspaceRoot];

// 2) 모듈 해석 경로: 로컬 → 워크스페이스 루트 node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
