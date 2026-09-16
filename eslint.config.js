import path from 'node:path';
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

const featureOf = (file) => file.match(/\/features\/(admin\/[^/]+|[^/]+)\//)?.[1];
const publicDependencies = {
  search: ['jobs'],
  profile: ['auth'],
  hires: ['auth'],
  comments: ['auth'],
  discovery: ['taxonomy'],
  'admin/users': ['auth', 'profile'],
  'admin/jobs': ['auth', 'jobs', 'taxonomy'],
  'admin/taxonomy': ['auth', 'taxonomy'],
  'admin/hires': ['auth', 'hires'],
};

const importBoundaries = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { boundary: '{{reason}}' },
  },
  create(context) {
    const file = context.filename.replaceAll('\\', '/');
    function inspect(node) {
      if (!node.source || typeof node.source.value !== 'string') return;
      const specifier = node.source.value;
      const target = specifier.startsWith('.')
        ? path.resolve(path.dirname(context.filename), specifier).replaceAll('\\', '/')
        : specifier;
      const report = (reason) => context.report({ node, messageId: 'boundary', data: { reason } });
      if (specifier.startsWith('@/'))
        report('Use relative imports until an alias is explicitly configured.');
      if (
        file.includes('/src/') &&
        (/^(msw|vitest|@testing-library\/|@playwright\/)/.test(specifier) ||
          target.includes('/tests/') ||
          /\.test\.[tj]sx?$/.test(target))
      )
        report('Production source must not import test tools, fixtures or mocks.');
      if (file.includes('/src/shared/') && target.includes('/features/')) {
        report('Shared code must not import features.');
      }
      if (file.includes('/src/infrastructure/') && /\/(app|features)\//.test(target)) {
        report('Infrastructure must not import app or feature code.');
      }
      if (
        file.includes('/src/') &&
        file.endsWith('.tsx') &&
        (specifier === 'axios' ||
          target.includes('/infrastructure/http/') ||
          /\/features\/.*\/api\//.test(target))
      ) {
        report('Views must use application models and hooks, not transport or endpoint DTOs.');
      }
      const sourceFeature = featureOf(file);
      const targetFeature = featureOf(target + '/');
      if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
        const isPublic = /\/public(?:\.[tj]s)?$/.test(target);
        if (!isPublic || !publicDependencies[sourceFeature]?.includes(targetFeature)) {
          report('Cross-feature imports require the frozen public interface allowlist.');
        }
      }
    }
    return {
      ImportDeclaration: inspect,
      ExportNamedDeclaration: inspect,
      ExportAllDeclaration(node) {
        context.report({
          node,
          messageId: 'boundary',
          data: { reason: 'Use deliberate named public exports.' },
        });
      },
      ImportExpression(node) {
        inspect({ ...node, source: node.source });
      },
    };
  },
};

export default defineConfig(
  globalIgnores([
    'dist/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'node_modules/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        XMLHttpRequest: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { architecture: { rules: { 'import-boundaries': importBoundaries } } },
    rules: { 'architecture/import-boundaries': 'error', 'no-console': 'error' },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'HTTP belongs in infrastructure and endpoint adapters.' },
      ],
    },
  },
  prettier,
);
