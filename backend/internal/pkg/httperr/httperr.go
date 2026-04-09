package httperr

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type Body struct {
	Error ErrorFields `json:"error"`
}

type ErrorFields struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details"`
}

func Respond(c echo.Context, status int, code, message string, details any) error {
	return c.JSON(status, Body{
		Error: ErrorFields{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func BadRequest(c echo.Context, message string) error {
	return Respond(c, http.StatusBadRequest, "BAD_REQUEST", message, nil)
}

func Internal(c echo.Context, message string) error {
	return Respond(c, http.StatusInternalServerError, "INTERNAL_ERROR", message, nil)
}

func NotFound(c echo.Context, message string) error {
	return Respond(c, http.StatusNotFound, "NOT_FOUND", message, nil)
}
