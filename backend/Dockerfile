FROM --platform=$BUILDPLATFORM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -buildvcs=false -trimpath -ldflags="-s -w" -o collabboard ./cmd/server

FROM gcr.io/distroless/static-debian12 AS runtime

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

WORKDIR /app
COPY --from=builder /app/collabboard /usr/local/bin/collabboard

COPY --from=builder /app/internal/db/migrations /app/migrations

ENV API_PORT=8080
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/collabboard"]
