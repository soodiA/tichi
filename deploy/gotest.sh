#!/bin/bash
# runs on the VM: create throwaway db, go vet + go test against it
set -e
cd ~/build/backend
sudo docker exec tichi-db-1 psql -U tichi -d postgres -qc "DROP DATABASE IF EXISTS tichi_test" -c "CREATE DATABASE tichi_test"
PW=$(grep ^POSTGRES_PASSWORD /srv/tichi/.env | cut -d= -f2)
sudo docker run --rm --network tichi_default -e GOPROXY=https://go.cloudinative.com -e GOSUMDB=off \
  -e TEST_DATABASE_URL="postgres://tichi:$PW@db:5432/tichi_test?sslmode=disable" \
  -v $PWD:/src -v tichi-gocache:/root/.cache -v tichi-gomod:/go/pkg -w /src golang:1.26-alpine sh -c "go mod tidy && go vet ./... && go test -count=1 -v ./... 2>&1"
