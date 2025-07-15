// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "cdn.sanity.io",
      // add any other domains you use for images
    ],
  },
  // ...other config
};

module.exports = nextConfig;