package lineadapter

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
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
	repo               usecase.EntryRepository
	gen                usecase.DiaryGenerator
}

func NewWebhookHandler(
	channelSecret string,
	channelAccessToken string,
	repo usecase.EntryRepository,
	gen usecase.DiaryGenerator,
) *WebhookHandler {
	return &WebhookHandler{
		channelSecret:      channelSecret,
		channelAccessToken: channelAccessToken,
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

	// 冪等チェック（詳細設計 5.2）
	exists, err := h.repo.ExistsByLineMessageID(ctx, event.Message.ID)
	if err != nil {
		return err
	}
	if exists {
		log.Printf("webhook: duplicate messageId=%s, skipping", event.Message.ID)
		return nil
	}

	// Gemini で日記テキスト生成
	diaryText, err := h.gen.GenerateDiaryText(ctx, event.Message.Text)
	if err != nil {
		return err
	}

	// DB に保存
	msgID := event.Message.ID
	entry := &domain.DiaryEntry{
		LineUserID:    event.Source.UserID,
		LineMessageID: &msgID,
		SourceText:    event.Message.Text,
		DiaryText:     diaryText,
	}
	if err := h.repo.Create(ctx, entry); err != nil {
		return err
	}

	// LINE に日記テキストを返信
	if err := h.reply(ctx, event.ReplyToken, diaryText); err != nil {
		log.Printf("webhook: reply error: %v", err)
	}
	return nil
}

// reply は LINE Reply API を使って replyToken 宛にメッセージを送る。
func (h *WebhookHandler) reply(ctx context.Context, replyToken, text string) error {
	payload, _ := json.Marshal(map[string]any{
		"replyToken": replyToken,
		"messages": []map[string]string{
			{"type": "text", "text": text},
		},
	})

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
