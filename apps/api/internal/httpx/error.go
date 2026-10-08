// Package httpx holds response helpers shared by every HTTP handler.
package httpx

import "github.com/gin-gonic/gin"

// Error aborts the request with the error envelope used across the API.
func Error(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": gin.H{"code": code, "message": message},
	})
}
