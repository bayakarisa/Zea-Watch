"""
Email Service
Handles sending verification and password reset emails
"""
import os
import requests
from typing import Optional
from urllib.parse import urljoin


class EmailService:
    """Email service using SendGrid or Mailgun"""
    
    def __init__(self):
        self.provider = os.getenv('EMAIL_PROVIDER', 'sendgrid')  # 'sendgrid' or 'mailgun'
        self.api_key = os.getenv('EMAIL_API_KEY', '')
        self.from_email = os.getenv('EMAIL_FROM', 'noreply@zeawatch.com')
        self.app_url = os.getenv('APP_URL', 'http://localhost:3000')
        
    def send_verification_email(self, email: str, name: str, token: str) -> bool:
        """Send email verification email"""
        verification_url = f"{self.app_url}/api/auth/verify?token={token}"
        
        subject = "Verify your ZeaWatch account"
        html_content = f"""
        <html>
        <body>
            <h2>Welcome to ZeaWatch, {name}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <p><a href="{verification_url}">{verification_url}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
        </body>
        </html>
        """
        
        return self._send_email(email, subject, html_content)
    
    def send_password_reset_email(self, email: str, name: str, token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{self.app_url}/api/auth/reset-password?token={token}"
        
        subject = "Reset your ZeaWatch password"
        html_content = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Hello {name},</p>
            <p>You requested to reset your password. Click the link below to reset it:</p>
            <p><a href="{reset_url}">{reset_url}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
        """
        
        return self._send_email(email, subject, html_content)
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using configured provider"""
        if self.provider == 'sendgrid':
            return self._send_via_sendgrid(to_email, subject, html_content)
        elif self.provider == 'mailgun':
            return self._send_via_mailgun(to_email, subject, html_content)
        else:
            print(f"Email provider '{self.provider}' not configured. Email would be sent to {to_email}")
            print(f"Subject: {subject}")
            print(f"Content: {html_content}")
            return True  # Return True in dev mode
    
    def _send_via_sendgrid(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email via SendGrid"""
        if not self.api_key:
            print("SendGrid API key not configured")
            return False
        
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        data = {
            'personalizations': [{
                'to': [{'email': to_email}]
            }],
            'from': {'email': self.from_email},
            'subject': subject,
            'content': [{
                'type': 'text/html',
                'value': html_content
            }]
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            return response.status_code == 202
        except Exception as e:
            print(f"Error sending email via SendGrid: {e}")
            return False
    
    def _send_via_mailgun(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email via Mailgun"""
        if not self.api_key:
            print("Mailgun API key not configured")
            return False
        
        domain = os.getenv('MAILGUN_DOMAIN', '')
        url = f"https://api.mailgun.net/v3/{domain}/messages"
        
        data = {
            'from': self.from_email,
            'to': to_email,
            'subject': subject,
            'html': html_content
        }
        
        try:
            response = requests.post(url, auth=('api', self.api_key), data=data)
            return response.status_code == 200
        except Exception as e:
            print(f"Error sending email via Mailgun: {e}")
            return False


