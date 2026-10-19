import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/generated/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Fastify route generics occasionally use `any` for request bodies.
      '@typescript-eslint/no-explicit-any': 'off',
      // Fastify handlers must keep the (request, reply) arity even when
      // one of the arguments is unused.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
