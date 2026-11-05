import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/payload-types.ts",
      "src/app/(payload)/admin/importMap.js",
    ],
  },
];

export default eslintConfig;
