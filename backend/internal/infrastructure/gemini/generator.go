package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"monodiary/internal/usecase"
)

const (
	systemInstruction = `あなたは日本語の日記執筆アシスタントです。
ユーザーが LINE で送った断片的なメモや会話調のメッセージを、一人称の日記として読める文章に整えてください。

【文体・トーンについて】
- 入力が口語的・カジュアルなら、日記もそのトーンを活かしてください
- 「〜した」「〜だった」「〜だな」「〜なー」など、入力の雰囲気に近い表現を選んでください
- 「すごい」「やっぱり」「なんか」などの口語表現は、自然であれば残してください
- 無理に「です・ます」の敬体に直さなくて構いません
- 書いた人の感情やテンションのニュアンスをできるだけ保ってください

【禁止事項】
- 内容の捏造・補完はしないでください（与えられた情報のみ使用）
- 日付・見出しは付けず、本文のみ出力してください
- 過度に丁寧・硬い文体に変換しないでください`

	fallbackPrefix = "[自動整形に失敗したため原文を表示しています]\n"
)

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

// UsedFallback は詳細設計 6.4 のフォールバック本文かどうかを返す。
func UsedFallback(diaryText string) bool {
	return strings.HasPrefix(diaryText, fallbackPrefix)
}

func (g *Generator) GenerateDiaryText(ctx context.Context, source string) (string, error) {
	if strings.TrimSpace(source) == "" {
		return "", fmt.Errorf("empty source")
	}
	text, err := g.generateOnce(ctx, source)
	if err == nil && strings.TrimSpace(text) != "" {
		return stripMarkdownish(text), nil
	}
	time.Sleep(time.Second)
	text, err2 := g.generateOnce(ctx, source)
	if err2 == nil && strings.TrimSpace(text) != "" {
		return stripMarkdownish(text), nil
	}
	return fallbackPrefix + source, nil
}

func (g *Generator) generateOnce(ctx context.Context, source string) (string, error) {
	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", g.baseURL, g.model, g.apiKey)
	body := generateRequest{
		SystemInstruction: &contentPayload{
			Parts: []part{{Text: systemInstruction}},
		},
		Contents: []contentMessage{
			{Role: "user", Parts: []part{{Text: source}}},
		},
		GenerationConfig: genConfig{
			Temperature:     0.9,
			MaxOutputTokens: 2048,
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
