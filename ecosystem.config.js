module.exports = {
  apps: [
    {
      name: "scan-service",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
