# Reamer Homes website

Website for Reamer Homes Wind Mitigation & Four Point Inspections. Plain HTML, CSS, and JavaScript with no build step, hosted on GitHub Pages from the `main` branch.

| Path | What it is |
| --- | --- |
| `index.html` | Homepage |
| `quote/` | Questionnaire page that ads link to |
| `quote/config.js` | The questions, pricing, and where answers are sent |

## Before launch

1. **Connect the form.** Set `endpoint` in `quote/config.js` to a URL that accepts a JSON POST. Until then nothing is sent, and the last screen says so.
2. **Choose the ending.** Set `ending` in `quote/config.js` to `'email'` (Brian sends the quote) or `'instant'` (price shown right away).
3. **For instant pricing,** replace the sample numbers in `pricing` and set `confirmed` to `true`.
4. **Allow search engines.** Remove the `noindex` meta tag from `index.html` and `quote/index.html`.
5. **Update the share image.** Point the `og:image` tags at the final domain.

Ad links can add `utm_*`, `gclid`, or `fbclid` parameters to `quote/`. They are sent along with each submission.
