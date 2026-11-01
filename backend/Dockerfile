FROM golang:1.26-alpine AS build
WORKDIR /src
ARG GOPROXY=https://go.cloudinative.com
ARG GOSUMDB=off
ENV GOPROXY=${GOPROXY} GOSUMDB=${GOSUMDB}
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o /out/tichi-api ./cmd/server && CGO_ENABLED=0 go build -ldflags "-s -w" -o /out/tichi-import ./cmd/import

FROM alpine:3.20
RUN adduser -D -u 10001 tichi && mkdir -p /data/audio && chown tichi /data/audio
USER tichi
COPY --from=build /out/tichi-api /out/tichi-import /usr/local/bin/
ENTRYPOINT ["tichi-api"]
