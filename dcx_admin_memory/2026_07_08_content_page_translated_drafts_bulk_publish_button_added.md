# Content Page Translated Drafts Bulk Publish Button Added

The content page editor now shows a `Publish N drafts` button inside the `Public routes` strip whenever translated page rows exist as drafts. The button calls a dedicated backend endpoint and then refreshes the page catalog, current page detail, and public-site publish status.

The control is intentionally separate from `Translate` and from the per-language `Publish` button. It publishes existing translated draft rows only; missing or failed language rows remain visible in the route strip and still need translation/retry before they can be published.
