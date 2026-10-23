## 2024-10-23 - XSS Vulnerability via dangerouslySetInnerHTML in Next.js Plugin

**Vulnerability:** A High Priority Cross-Site Scripting (XSS) vulnerability was found in `plugins/lessons/src/pages/my-lessons.tsx`. The application was rendering LMS course content (markdown/html) directly into the DOM using `dangerouslySetInnerHTML={{ __html: activeLesson.body }}` without any sanitization.
**Learning:** The previous implementation assumed that LMS content was "safe" or trusted enough to bypass React's built-in XSS protections. However, any content dynamically inserted into `dangerouslySetInnerHTML` must be strictly sanitized, as it represents a significant vector for malicious scripts if an attacker gains the ability to create or modify lesson content.
**Prevention:** Always use a robust HTML sanitization library (such as `sanitize-html` or `DOMPurify`) before passing dynamic content to `dangerouslySetInnerHTML`.  Example: `__html: sanitizeHtml(content)`.
