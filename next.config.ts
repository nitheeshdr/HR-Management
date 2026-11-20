import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The employee form PDF template is read from disk at request time
  outputFileTracingIncludes: {
    '/api/employees/[id]/form-pdf': ['./assets/employee-form-template.pdf'],
  },
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
