package lineadapter

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"monodiary/internal/domain"
	"monodiary/internal/pkg/httperr"
	"monodiary/internal/usecase"
)

// LINE Webhook のリクエストボディ構造
type webhookBody struct {
	Events []lineEvent `json:"events"`
}

type lineEvent struct {
	Type       string      `json:"type"`
	ReplyToken string      `json:"replyToken"`
	Source     lineSource  `json:"source"`
	Message    lineMessage `json:"message"`
}

type lineSource struct {
	UserID string `json:"userId"`
}

type lineMessage struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Text string `json:"text"`
}

type WebhookHandler struct {
	channelSecret      string
	channelAccessToken string
	frontendOrigin     string
	allowedUserID      string
	repo               usecase.EntryRepository
	gen                usecase.DiaryGenerator
}

func NewWebhookHandler(
	channelSecret string,
	channelAccessToken string,
	frontendOrigin string,
	allowedUserID string,
	repo usecase.EntryRepository,
	gen usecase.DiaryGenerator,
) *WebhookHandler {
	return &WebhookHandler{
		channelSecret:      channelSecret,
		channelAccessToken: channelAccessToken,
		frontendOrigin:     frontendOrigin,
		allowedUserID:      allowedUserID,
		repo:               repo,
		gen:                gen,
	}
}

func (h *WebhookHandler) Handle(c echo.Context) error {
	// ボディを生バイトで読む（署名検証に元のバイト列が必要）
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return httperr.Internal(c, "リクエストの読み込みに失敗しました")
	}

	// X-Line-Signature の検証
	if !h.verifySignature(body, c.Request().Header.Get("X-Line-Signature")) {
		return c.NoContent(http.StatusUnauthorized)
	}

	var wb webhookBody
	if err := json.Unmarshal(body, &wb); err != nil {
		return c.NoContent(http.StatusOK)
	}

	// c.Request().Context() ではなく Background を使う。
	// LINE サーバーが接続を早期に切断してもGemini・DB処理が継続できるようにする。
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	for _, event := range wb.Events {
		if err := h.processEvent(ctx, event); err != nil {
			log.Printf("webhook: processEvent error: %v", err)
		}
	}

	return c.NoContent(http.StatusOK)
}

func (h *WebhookHandler) processEvent(ctx context.Context, event lineEvent) error {
	// テキストメッセージ以外はスキップ
	if event.Type != "message" || event.Message.Type != "text" {
		return nil
	}

	// 許可されていないユーザーはサイレント無視
	if h.allowedUserID != "" && event.Source.UserID != h.allowedUserID {
		log.Printf("webhook: unauthorized userId=%s, skipping", event.Source.UserID)
		return nil
	}

	// 冪等チェック（詳細設計 5.2）
	exists, err := h.repo.ExistsByLineMessageID(ctx, event.Message.ID)
	if err != nil {
		return err
	}
	if exists {
		log.Printf("webhook: duplicate messageId=%s, skipping", event.Message.ID)
		return nil
	}

	// Gemini で AI コメント生成
	comment, err := h.gen.GenerateComment(ctx, event.Message.Text)
	if err != nil {
		if errors.Is(err, usecase.ErrGenerationFailed) {
			log.Printf("webhook: AI comment generation failed, skipping save: messageId=%s", event.Message.ID)
			if replyErr := h.reply(ctx, event.ReplyToken, "AIコメントの生成に失敗したため、日記を保存できませんでした。時間をおいて再度お試しください。"); replyErr != nil {
				log.Printf("webhook: reply error: %v", replyErr)
			}
			return nil
		}
		return err
	}

	// DB に保存
	msgID := event.Message.ID
	entry := &domain.DiaryEntry{
		LineUserID:    event.Source.UserID,
		LineMessageID: &msgID,
		SourceText:    event.Message.Text,
		AIComment:     comment,
	}
	if err := h.repo.Create(ctx, entry); err != nil {
		return err
	}

	// LINE に日記カード（Flex Message）を返信
	if err := h.replyFlex(ctx, event.ReplyToken, entry); err != nil {
		log.Printf("webhook: reply error: %v", err)
	}
	return nil
}

// replyFlex は Flex Message で日記カード（原文 + AI コメント）を LINE に送る。
// 原文が 100 文字を超える場合は冒頭 100 文字に切り詰める。
func (h *WebhookHandler) replyFlex(ctx context.Context, replyToken string, entry *domain.DiaryEntry) error {
	const maxSourceRunes = 100

	sourceRunes := []rune(entry.SourceText)
	sourceText := entry.SourceText
	truncated := len(sourceRunes) > maxSourceRunes
	if truncated {
		sourceText = string(sourceRunes[:maxSourceRunes]) + "…"
	}

	jst := time.FixedZone("JST", 9*60*60)
	dateStr := entry.CreatedAt.In(jst).Format("2006年01月02日")

	buttonLabel := "Webアプリで見る"
	if truncated {
		buttonLabel = "続きをWebアプリで見る"
	}
	entryURL := fmt.Sprintf("%s/entries/%s", h.frontendOrigin, entry.ID)

	flexContents := map[string]any{
		"type": "bubble",
		"header": map[string]any{
			"type":            "box",
			"layout":          "vertical",
			"backgroundColor": "#5A67D8",
			"paddingAll":      "16px",
			"contents": []map[string]any{
				{
					"type":   "text",
					"text":   "📔 今日の日記",
					"color":  "#FFFFFF",
					"weight": "bold",
					"size":   "md",
				},
				{
					"type":   "text",
					"text":   dateStr,
					"color":  "#FFFFFFAA",
					"size":   "xs",
					"margin": "sm",
				},
			},
		},
		"body": map[string]any{
			"type":       "box",
			"layout":     "vertical",
			"paddingAll": "16px",
			"spacing":    "md",
			"contents": []map[string]any{
				{
					"type":  "text",
					"text":  sourceText,
					"wrap":  true,
					"size":  "sm",
					"color": "#333333",
				},
				{
					"type":    "separator",
					"margin":  "md",
					"color":   "#E5E0D8",
				},
				{
					"type":   "text",
					"text":   "💬 AI より",
					"size":   "xs",
					"color":  "#8B7E74",
					"weight": "bold",
				},
				{
					"type":  "text",
					"text":  entry.AIComment,
					"wrap":  true,
					"size":  "sm",
					"color": "#5C504A",
				},
			},
		},
		"footer": map[string]any{
			"type":       "box",
			"layout":     "vertical",
			"paddingAll": "12px",
			"contents": []map[string]any{
				{
					"type":  "button",
					"style": "primary",
					"color": "#5A67D8",
					"action": map[string]any{
						"type":  "uri",
						"label": buttonLabel,
						"uri":   entryURL,
					},
				},
			},
		},
	}

	payload, err := json.Marshal(map[string]any{
		"replyToken": replyToken,
		"messages": []map[string]any{
			{
				"type":     "flex",
				"altText":  "日記を保存しました",
				"contents": flexContents,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("marshal flex reply payload: %w", err)
	}
	return h.doReply(ctx, payload)
}

// reply は LINE Reply API を使って replyToken 宛にテキストメッセージを送る。
func (h *WebhookHandler) reply(ctx context.Context, replyToken, text string) error {
	payload, err := json.Marshal(map[string]any{
		"replyToken": replyToken,
		"messages": []map[string]string{
			{"type": "text", "text": text},
		},
	})
	if err != nil {
		return fmt.Errorf("marshal reply payload: %w", err)
	}
	return h.doReply(ctx, payload)
}

// doReply は LINE Reply API に payload を POST する共通処理。
func (h *WebhookHandler) doReply(ctx context.Context, payload []byte) error {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		"https://api.line.me/v2/bot/message/reply",
		bytes.NewReader(payload),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.channelAccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("LINE reply API: status=%d body=%s", resp.StatusCode, b)
	}
	return nil
}

// verifySignature は X-Line-Signature を HMAC-SHA256 で検証する（詳細設計 5.1）
func (h *WebhookHandler) verifySignature(body []byte, signature string) bool {
	if signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(h.channelSecret))
	mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
