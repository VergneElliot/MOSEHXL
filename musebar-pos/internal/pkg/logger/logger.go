package logger

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"time"
)

// LogLevel represents the severity of a log entry
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

func (l LogLevel) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	default:
		return "UNKNOWN"
	}
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp   string                 `json:"timestamp"`
	Level       string                 `json:"level"`
	Message     string                 `json:"message"`
	RequestID   string                 `json:"request_id,omitempty"`
	UserID      string                 `json:"user_id,omitempty"`
	Method      string                 `json:"method,omitempty"`
	Path        string                 `json:"path,omitempty"`
	StatusCode  int                    `json:"status_code,omitempty"`
	Duration    string                 `json:"duration,omitempty"`
	IP          string                 `json:"ip,omitempty"`
	Category    string                 `json:"category,omitempty"`
	Error       string                 `json:"error,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Logger is the main structured logger
type Logger struct {
	level       LogLevel
	out         io.Writer
	environment string
	service     string
}

var defaultLogger *Logger

// New creates a new logger
func New(level LogLevel, environment, service string) *Logger {
	return &Logger{
		level:       level,
		out:         os.Stdout,
		environment: environment,
		service:     service,
	}
}

// Init initializes the default logger
func Init(environment string) {
	level := INFO
	if environment == "development" {
		level = DEBUG
	}
	defaultLogger = New(level, environment, "musebar-pos")
}

// Get returns the default logger
func Get() *Logger {
	if defaultLogger == nil {
		Init("development")
	}
	return defaultLogger
}

func (l *Logger) log(level LogLevel, msg string, entry LogEntry) {
	if level < l.level {
		return
	}

	entry.Timestamp = time.Now().UTC().Format(time.RFC3339Nano)
	entry.Level = level.String()
	entry.Message = msg

	// In development, use pretty format
	if l.environment == "development" {
		l.prettyLog(level, entry)
		return
	}

	// In production, use JSON format
	data, _ := json.Marshal(entry)
	fmt.Fprintln(l.out, string(data))
}

func (l *Logger) prettyLog(level LogLevel, entry LogEntry) {
	color := "\033[0m"
	switch level {
	case DEBUG:
		color = "\033[36m" // cyan
	case INFO:
		color = "\033[32m" // green
	case WARN:
		color = "\033[33m" // yellow
	case ERROR:
		color = "\033[31m" // red
	}
	reset := "\033[0m"

	parts := []string{
		fmt.Sprintf("%s[%s]%s", color, entry.Level, reset),
		entry.Timestamp[:19],
		entry.Message,
	}

	if entry.RequestID != "" {
		parts = append(parts, fmt.Sprintf("req=%s", entry.RequestID[:8]))
	}
	if entry.Method != "" && entry.Path != "" {
		parts = append(parts, fmt.Sprintf("%s %s", entry.Method, entry.Path))
	}
	if entry.StatusCode != 0 {
		parts = append(parts, fmt.Sprintf("status=%d", entry.StatusCode))
	}
	if entry.Duration != "" {
		parts = append(parts, fmt.Sprintf("duration=%s", entry.Duration))
	}
	if entry.UserID != "" {
		parts = append(parts, fmt.Sprintf("user=%s", entry.UserID))
	}
	if entry.Error != "" {
		parts = append(parts, fmt.Sprintf("error=%s", entry.Error))
	}

	fmt.Fprintln(l.out, strings.Join(parts, " "))
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, fields ...map[string]interface{}) {
	entry := LogEntry{}
	if len(fields) > 0 {
		entry.Metadata = fields[0]
	}
	l.log(DEBUG, msg, entry)
}

// Info logs an info message
func (l *Logger) Info(msg string, fields ...map[string]interface{}) {
	entry := LogEntry{}
	if len(fields) > 0 {
		entry.Metadata = fields[0]
	}
	l.log(INFO, msg, entry)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, fields ...map[string]interface{}) {
	entry := LogEntry{}
	if len(fields) > 0 {
		entry.Metadata = fields[0]
	}
	l.log(WARN, msg, entry)
}

// Error logs an error message
func (l *Logger) Error(msg string, err error, fields ...map[string]interface{}) {
	entry := LogEntry{}
	if err != nil {
		entry.Error = err.Error()
	}
	if len(fields) > 0 {
		entry.Metadata = fields[0]
	}
	// Add caller info for errors
	_, file, line, ok := runtime.Caller(1)
	if ok {
		parts := strings.Split(file, "/")
		if len(parts) > 2 {
			file = strings.Join(parts[len(parts)-2:], "/")
		}
		if entry.Metadata == nil {
			entry.Metadata = make(map[string]interface{})
		}
		entry.Metadata["caller"] = fmt.Sprintf("%s:%d", file, line)
	}
	l.log(ERROR, msg, entry)
}

// HTTP logs an HTTP request
func (l *Logger) HTTP(entry LogEntry) {
	level := INFO
	if entry.StatusCode >= 500 {
		level = ERROR
	} else if entry.StatusCode >= 400 {
		level = WARN
	}
	l.log(level, "HTTP request", entry)
}

// Security logs a security event
func (l *Logger) Security(msg string, severity string, fields map[string]interface{}) {
	if fields == nil {
		fields = make(map[string]interface{})
	}
	fields["severity"] = severity
	entry := LogEntry{
		Category: "SECURITY",
		Metadata: fields,
	}
	level := WARN
	if severity == "HIGH" || severity == "CRITICAL" {
		level = ERROR
	}
	l.log(level, msg, entry)
}

// Package-level convenience functions
func Debug(msg string, fields ...map[string]interface{}) { Get().Debug(msg, fields...) }
func Info(msg string, fields ...map[string]interface{})  { Get().Info(msg, fields...) }
func Warn(msg string, fields ...map[string]interface{})  { Get().Warn(msg, fields...) }
func Error(msg string, err error, fields ...map[string]interface{}) {
	Get().Error(msg, err, fields...)
}

// contextKey type for context values
type contextKey string
const RequestIDKey contextKey = "request_id"

// FromContext extracts logger fields from context
func FromContext(ctx context.Context) LogEntry {
	entry := LogEntry{}
	if reqID, ok := ctx.Value(RequestIDKey).(string); ok {
		entry.RequestID = reqID
	}
	return entry
}
