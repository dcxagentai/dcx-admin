# Content Page Public Route Links Added

The content page editor now shows a compact `Public routes` line beneath the language selector. It lists the 13 core language codes in canonical order, links published page rows to their public site URLs, and leaves draft or missing rows visible but muted with their status.

The admin frontend derives absolute links from `VITE_PUBLIC_SITE_BASE_URL` when configured, otherwise it falls back to `http://localhost:4321` in local development and `https://dcxagent.ai` in hosted environments. Route paths come from the page detail API rather than being guessed in the browser, so localized category slugs can be used later while the current English-category fallback continues to work.
