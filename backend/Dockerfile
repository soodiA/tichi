FROM golang:1.26-alpine AS build
WORKDIR /src
ARG GOPROXY=https://go.cloudinative.com
ARG GOSUMDB=off
ENV GOPROXY=${GOPROXY} GOSUMDB=${GOSUMDB}
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -ldflags "-s -w -X main.version=${VERSION}" -o /out/tichi-api ./cmd/server

FROM alpine:3.20
RUN adduser -D -u 10001 tichi && mkdir -p /data/audio && chown tichi /data/audio
USER tichi
COPY --from=build /out/tichi-api /usr/local/bin/tichi-api
ENTRYPOINT ["tichi-api"]
