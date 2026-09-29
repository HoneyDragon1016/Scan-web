// Copyright (c) 2026 HoneyDragon1016
//
// This file is part of scan-web.
//
// scan-web is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 3.
//
// COMMERCIAL USE:
// If you wish to use this software in a closed-source or commercial
// project, you must contact the author for a commercial license.
// Contact: service@honeychen.uk

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
