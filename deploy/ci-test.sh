#!/bin/bash
# Backend tests against a throwaway Postgres (never the production DB). Run from the repo root.
set -euo pipefail
N=tichi-ci-$$
sudo docker network create $N >/dev/null
trap 'sudo docker rm -f $N-db >/dev/null 2>&1 || true; sudo docker network rm $N >/dev/null 2>&1 || true' EXIT
sudo docker run -d --name $N-db --network $N -e POSTGRES_PASSWORD=ci -e POSTGRES_USER=ci -e POSTGRES_DB=ci postgres:16-alpine >/dev/null
for i in $(seq 1 30); do sudo docker exec $N-db pg_isready -U ci -d ci >/dev/null 2>&1 && break; sleep 1; done
sudo docker run --rm --network $N -e GOPROXY=https://go.cloudinative.com -e GOSUMDB=off \
  -e TEST_DATABASE_URL="postgres://ci:ci@$N-db:5432/ci?sslmode=disable" \
  -v "$PWD/backend":/src -v tichi-gocache:/root/.cache -v tichi-gomod:/go/pkg -w /src golang:1.26-alpine \
  sh -c "go vet ./... && go test -count=1 -p 1 ./..."
