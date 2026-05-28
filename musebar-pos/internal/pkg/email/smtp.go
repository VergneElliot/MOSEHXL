package email

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"net"
	"net/smtp"
	"strings"
)

// SMTPSender implements EmailSender using SMTP
type SMTPSender struct {
	cfg *Config
}

// NewSMTPSender creates a new SMTP email sender
func NewSMTPSender(cfg *Config) EmailSender {
	return &SMTPSender{cfg: cfg}
}

// Send sends an email via SMTP with STARTTLS
func (s *SMTPSender) Send(to, subject, htmlBody, textBody string) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)

	// Connect to server
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Start TLS
	tlsConfig := &tls.Config{
		ServerName: s.cfg.Host,
		MinVersion: tls.VersionTLS12,
	}
	if err := client.StartTLS(tlsConfig); err != nil {
		return fmt.Errorf("failed to start TLS: %w", err)
	}

	// Authenticate
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Password, s.cfg.Host)
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	// Set sender
	if err := client.Mail(s.cfg.User); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// Set recipient
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Write email body
	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to open data writer: %w", err)
	}
	defer wc.Close()

	msg := s.buildMessage(to, subject, htmlBody, textBody)
	if _, err := fmt.Fprint(wc, msg); err != nil {
		return fmt.Errorf("failed to write email: %w", err)
	}

	return nil
}

// SendTemplate sends an email using a named template
func (s *SMTPSender) SendTemplate(to, subject string, tmpl Template, data map[string]interface{}) error {
	htmlBody, textBody, err := renderTemplate(tmpl, data)
	if err != nil {
		return fmt.Errorf("failed to render template %s: %w", tmpl, err)
	}
	return s.Send(to, subject, htmlBody, textBody)
}

// buildMessage builds a MIME email message
func (s *SMTPSender) buildMessage(to, subject, htmlBody, textBody string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("From: %s\r\n", s.cfg.From))
	sb.WriteString(fmt.Sprintf("To: %s\r\n", to))
	sb.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	sb.WriteString("MIME-Version: 1.0\r\n")
	sb.WriteString("Content-Type: multipart/alternative; boundary=\"musebarbound\"\r\n")
	sb.WriteString("\r\n")

	// Plain text part
	sb.WriteString("--musebarbound\r\n")
	sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(textBody)
	sb.WriteString("\r\n\r\n")

	// HTML part
	sb.WriteString("--musebarbound\r\n")
	sb.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	sb.WriteString("\r\n")
	sb.WriteString(htmlBody)
	sb.WriteString("\r\n\r\n")
	sb.WriteString("--musebarbound--\r\n")

	return sb.String()
}

// renderTemplate renders an email template with data
func renderTemplate(tmpl Template, data map[string]interface{}) (string, string, error) {
	htmlTmplStr, textTmplStr, err := getTemplate(tmpl)
	if err != nil {
		return "", "", err
	}

	htmlTmpl, err := template.New("html").Parse(htmlTmplStr)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse HTML template: %w", err)
	}
	var htmlBuf bytes.Buffer
	if err := htmlTmpl.Execute(&htmlBuf, data); err != nil {
		return "", "", fmt.Errorf("failed to execute HTML template: %w", err)
	}

	textTmpl, err := template.New("text").Parse(textTmplStr)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse text template: %w", err)
	}
	var textBuf bytes.Buffer
	if err := textTmpl.Execute(&textBuf, data); err != nil {
		return "", "", fmt.Errorf("failed to execute text template: %w", err)
	}

	return htmlBuf.String(), textBuf.String(), nil
}

func getTemplate(tmpl Template) (string, string, error) {
	switch tmpl {
	case TemplateInvitation:
		return invitationHTML, invitationText, nil
	case TemplatePasswordReset:
		return passwordResetHTML, passwordResetText, nil
	case TemplateWelcome:
		return welcomeHTML, welcomeText, nil
	default:
		return "", "", fmt.Errorf("unknown template: %s", tmpl)
	}
}

var invitationHTML = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a1a2e; padding: 30px; border-radius: 8px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">MuseBar POS</h1>
  </div>
  <div style="padding: 30px; background: #f9f9f9; border-radius: 8px; margin-top: 20px;">
    <h2>Vous etes invite(e) a rejoindre {{.EstablishmentName}}</h2>
    <p>Bonjour {{.FirstName}},</p>
    <p>{{.InviterName}} vous invite a rejoindre {{.EstablishmentName}} en tant que {{.Role}}.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{.InviteURL}}" style="background: #e94560; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
        Accepter l invitation
      </a>
    </div>
    <p style="color: #999; font-size: 12px;">Ce lien expire dans 48 heures.</p>
  </div>
</body>
</html>`

var invitationText = `Invitation a rejoindre {{.EstablishmentName}}

Bonjour {{.FirstName}},

{{.InviterName}} vous invite a rejoindre {{.EstablishmentName}} en tant que {{.Role}}.

Acceptez l invitation ici: {{.InviteURL}}

Ce lien expire dans 48 heures.`

var passwordResetHTML = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a1a2e; padding: 30px; border-radius: 8px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">MuseBar POS</h1>
  </div>
  <div style="padding: 30px; background: #f9f9f9; border-radius: 8px; margin-top: 20px;">
    <h2>Reinitialisation de mot de passe</h2>
    <p>Bonjour {{.FirstName}},</p>
    <p>Vous avez demande a reinitialiser votre mot de passe.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{.ResetURL}}" style="background: #e94560; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
        Reinitialiser mon mot de passe
      </a>
    </div>
    <p style="color: #999; font-size: 12px;">Ce lien expire dans 1 heure.</p>
  </div>
</body>
</html>`

var passwordResetText = `Reinitialisation de mot de passe MuseBar POS

Bonjour {{.FirstName}},

Reinitialiser votre mot de passe ici: {{.ResetURL}}

Ce lien expire dans 1 heure.`

var welcomeHTML = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a1a2e; padding: 30px; border-radius: 8px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">MuseBar POS</h1>
  </div>
  <div style="padding: 30px; background: #f9f9f9; border-radius: 8px; margin-top: 20px;">
    <h2>Bienvenue sur MuseBar POS !</h2>
    <p>Bonjour {{.FirstName}},</p>
    <p>Votre compte a ete cree avec succes pour {{.EstablishmentName}}.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{.LoginURL}}" style="background: #e94560; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
        Se connecter
      </a>
    </div>
  </div>
</body>
</html>`

var welcomeText = `Bienvenue sur MuseBar POS !

Bonjour {{.FirstName}},

Votre compte a ete cree pour {{.EstablishmentName}}.

Connectez-vous ici: {{.LoginURL}}`
