# ── 開発ステージ（air によるホットリロード）──────────────────
FROM golang:1.25-alpine AS dev

WORKDIR /app

RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

EXPOSE 8080
CMD ["air"]

# ── ビルドステージ ──────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# ── 実行ステージ（本番）────────────────────────────────────
FROM alpine:3.21

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
