package email

import (
	"fmt"
	"os"
	"strconv"
)

// EmailSender is the interface all email providers must implement
type EmailSender interface {
	Send(to, subject, htmlBody, textBody string) error
	SendTemplate(to, subject string, tmpl Template, data map[string]interface{}) error
}

// Config holds SMTP configuration
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// Template represents an email template type
type Template string

const (
	TemplateInvitation    Template = "invitation"
	TemplatePasswordReset Template = "password_reset"
	TemplateWelcome       Template = "welcome"
)

// LoadConfigFromEnv loads SMTP config from environment variables
func LoadConfigFromEnv() (*Config, error) {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		return nil, fmt.Errorf("SMTP_HOST is required")
	}

	portStr := os.Getenv("SMTP_PORT")
	if portStr == "" {
		portStr = "587"
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	return &Config{
		Host:     host,
		Port:     port,
		User:     os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
	}, nil
}

// Message represents an email to be sent
type Message struct {
	To      string
	Subject string
	HTML    string
	Text    string
}

// NewFromConfig creates an EmailSender from application config fields
func NewFromConfig(host, portStr, user, password, from string) (EmailSender, error) {
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP port: %w", err)
	}

	cfg := &Config{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		From:     from,
	}

	return NewSMTPSender(cfg), nil
}
