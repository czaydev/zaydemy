## 2025-02-23 - XSS Vulnerability in Lesson Body Rendering
**Vulnerability:** The LMS lesson body was being rendered using React's `dangerouslySetInnerHTML` directly from the database without prior sanitization. While it contained educational content, allowing direct execution in a user browser risks Cross-Site Scripting (XSS).
**Learning:** Even content believed to be "safe" like course descriptions/bodies might come from untrusted users (e.g., instructors/contributors) or be modified. Using `dangerouslySetInnerHTML` directly exposes users to stored XSS vulnerabilities.
**Prevention:** Always wrap unvalidated user input or dynamically sourced HTML with a reliable HTML sanitizer such as `sanitize-html` before injecting it into the DOM via `dangerouslySetInnerHTML`.
