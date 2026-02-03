#!/usr/bin/env bash
set -euo pipefail
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/CN=localhost"

echo "Generated certs in ./certs"
