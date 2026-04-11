package httpadapter

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	"monodiary/internal/pkg/httperr"
	"monodiary/internal/usecase"
)

type DevPreviewRequest struct {
	SourceText string `json:"source_text"`
}

type DevPreviewResponse struct {
	SourceText   string `json:"source_text"`
	DiaryText    string `json:"diary_text"`
	UsedFallback bool   `json:"used_fallback"`
}

func RegisterDevRoutes(e *echo.Echo, gen usecase.DiaryGenerator) {
	e.POST("/dev/diary-preview", func(c echo.Context) error {
		var req DevPreviewRequest
		if err := c.Bind(&req); err != nil {
			return httperr.BadRequest(c, "JSON の形式が不正です")
		}
		if req.SourceText == "" {
			return httperr.BadRequest(c, "source_text は必須です")
		}
		diary, err := gen.GenerateDiaryText(c.Request().Context(), req.SourceText)
		if err != nil {
			if errors.Is(err, usecase.ErrGenerationFailed) {
				return c.JSON(http.StatusOK, DevPreviewResponse{
					SourceText:   req.SourceText,
					DiaryText:    "",
					UsedFallback: true,
				})
			}
			return httperr.Internal(c, "日記テキストの生成に失敗しました")
		}
		return c.JSON(http.StatusOK, DevPreviewResponse{
			SourceText:   req.SourceText,
			DiaryText:    diary,
			UsedFallback: false,
		})
	})
}
