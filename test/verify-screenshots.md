# Screenshot Verification Checklist

Read each screenshot and verify:

## 01-initial-unfolded.png
- [ ] Shows full comment content (paragraphs, bullet points, code blocks)
- [ ] Multiple headings visible with content between them

## 02-all-folded.png
- [ ] Only headings visible (concertina view)
- [ ] No body text between headings
- [ ] Should see 4+ headings stacked vertically

## 03-one-comment-expanded.png
- [ ] First heading is BLUE (was clicked)
- [ ] First comment shows full content
- [ ] Other comments still show only headings

## 04-all-unfolded-again.png
- [ ] All content visible again
- [ ] Same as 01-initial-unfolded.png

---

**If any check fails**: The feature is broken. Debug `src/content/github-comment-fold.ts`.

