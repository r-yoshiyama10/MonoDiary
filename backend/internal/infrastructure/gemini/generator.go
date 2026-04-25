package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"monodiary/internal/usecase"
)

const systemInstruction = `あなたは日記を読んで一言コメントを添える友人のような存在です。
ユーザーが LINE で送った日記（日常のメモや出来事）を読み、
その内容に対して 1〜2 文の短いコメントを日本語で返してください。

【コメントのスタイル】
- 書いた人の気持ちに寄り添う、温かみのある口調にしてください
- 共感・ねぎらい・小さな気づきなどを含めると自然です
- 説教や過度なアドバイスはしないでください
- 「ですます」調でも「だよね」「だね」調でも、自然な方でよいです
- 日付・見出しは付けず、コメント本文のみ出力してください

【禁止事項】
- 原文の書き換えや要約はしないでください
- 内容の捏造・補完はしないでください
- マークダウン記法は使わないでください`

var _ usecase.DiaryGenerator = (*Generator)(nil)

type Generator struct {
	apiKey  string
	model   string
	client  *http.Client
	baseURL string
}

func NewGenerator(apiKey, model string) *Generator {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &Generator{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 20 * time.Second},
		baseURL: "https://generativelanguage.googleapis.com/v1beta",
	}
}

func (g *Generator) GenerateComment(ctx context.Context, source string) (string, error) {
	if strings.TrimSpace(source) == "" {
		return "", fmt.Errorf("empty source")
	}
	text, err := g.generateOnce(ctx, source)
	if err == nil && strings.TrimSpace(text) != "" {
		return stripMarkdownish(text), nil
	}
	log.Printf("gemini: attempt 1 failed: err=%v text=%q", err, text)

	// コンテキストがキャンセル済みの場合はすぐに失敗
	select {
	case <-ctx.Done():
		return "", usecase.ErrGenerationFailed
	case <-time.After(time.Second):
	}

	text, err2 := g.generateOnce(ctx, source)
	if err2 == nil && strings.TrimSpace(text) != "" {
		return stripMarkdownish(text), nil
	}
	log.Printf("gemini: attempt 2 failed: err=%v text=%q", err2, text)
	return "", usecase.ErrGenerationFailed
}

func (g *Generator) generateOnce(ctx context.Context, source string) (string, error) {
	url := fmt.Sprintf("%s/models/%s:generateContent", g.baseURL, g.model)
	body := generateRequest{
		SystemInstruction: &contentPayload{
			Parts: []part{{Text: systemInstruction}},
		},
		Contents: []contentMessage{
			{Role: "user", Parts: []part{{Text: source}}},
		},
		GenerationConfig: genConfig{
			Temperature:     0.9,
			MaxOutputTokens: 1024,
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", g.apiKey)

	resp, err := g.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
		return "", fmt.Errorf("gemini status %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini status %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}
	var out generateResponse
	if err := json.Unmarshal(respBody, &out); err != nil {
		return "", err
	}
	if len(out.Candidates) == 0 {
		return "", fmt.Errorf("no candidates")
	}
	var b strings.Builder
	for _, p := range out.Candidates[0].Content.Parts {
		b.WriteString(p.Text)
	}
	return b.String(), nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

func stripMarkdownish(s string) string {
	t := strings.TrimSpace(s)
	if strings.HasPrefix(t, "```") {
		t = strings.TrimPrefix(t, "```")
		t = strings.TrimSpace(t)
		if i := strings.IndexByte(t, '\n'); i >= 0 {
			t = strings.TrimSpace(t[i+1:])
		}
	}
	if i := strings.LastIndex(t, "```"); i >= 0 {
		t = strings.TrimSpace(t[:i])
	}
	return strings.TrimSpace(t)
}

type generateRequest struct {
	SystemInstruction *contentPayload   `json:"systemInstruction,omitempty"`
	Contents          []contentMessage `json:"contents"`
	GenerationConfig  genConfig        `json:"generationConfig"`
}

type contentPayload struct {
	Parts []part `json:"parts"`
}

type contentMessage struct {
	Role  string `json:"role"`
	Parts []part `json:"parts"`
}

type part struct {
	Text string `json:"text"`
}

type genConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
}

type generateResponse struct {
	Candidates []struct {
		Content struct {
			Parts []part `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}
