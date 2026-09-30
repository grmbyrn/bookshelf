# Design tokens, read from the Figma export

Colours sampled pixel-by-pixel from `all-frames.png`; geometry read straight out
of `login.svg` and `register.svg`. Those export at **1x**, so every number below
is already a CSS pixel — nothing needs scaling.

## Colour

| Token | Value | Where it appears |
| --- | --- | --- |
| `--color-primary` | `#A65B2A` | Button fill, links, logo mark, focus border |
| `--color-text` | `#2A2420` | Headings, input text |
| `--color-text-label` | `#4A423C` | Field labels only — slightly lighter than body text |
| `--color-text-muted` | `#7A7068` | Sub-headings, helper text, "New to Bookshelf?" |
| `--color-text-faint` | `#A59B92` | The "or" between the divider segments |
| `--color-surface` | `#FFFFFF` | Inputs, secondary button, cards |
| `--color-bg` | `#FAF8F5` | Form panel (right half) |
| `--color-bg-alt` | `#F3F0EB` | Illustration panel (left half) |
| `--color-border` | `#E8E3DC` | Input and secondary-button border, dividers |
| `--color-border-subtle` | `#ECE7E1` | Unmet password-rule dot |
| `--color-error` | `#B3261E` | Error text and error input border |
| `--color-success` | `#3E6B4C` | Met password-rule dot |

`#DCD8D2` is the Figma canvas behind the frames, not an app colour.

## Radius

| Token | Value | Applies to |
| --- | --- | --- |
| `--radius-control` | `6px` | Inputs, buttons |
| `--radius-card` | `10px` | The page card |
| `--radius-logo` | `8px` | Logo mark (32×32) |

## Sizing

- **Control height: 42px** — every input and button on both screens, without exception.
- **Form column width: 380px**, centred in the 720px form panel (170px either side).
- **Card: 1280×800**, split 560px illustration / 720px form.
- **Panel padding: 48px left, 32px top** (from the logo's position).
- **Borders are 1px**: `--color-border` at rest, `--color-primary` on focus,
  `--color-error` when invalid. Focus is a border colour change, not an added ring.
- **Divider**: 1px rule in two 172px segments with a 36px gap for the "or".
- **Password-rule dot**: 6px circle, 19px apart vertically.

## Vertical rhythm

Measured gaps between control edges. Some gaps contain a text line, noted where so.

| From → to | Gap | Contains |
| --- | --- | --- |
| Field → next field | `36px` | the next field's label |
| Field → primary button | `14px` | — |
| Button → divider | `26px` | — |
| Divider → secondary button | `26px` | — |
| Email → password (register) | `57px` | label + inline error message |
| Password → rule list | `18.5px` | — |
| Rule list → button | `52.5px` | the Terms line |

## Type

Two families: **Lora** 600 for headings and the wordmark, **Inter** for
everything else. Letter-spacing is `0` on every single text node, so there is no
tracking to model. Line-height measures 1.2 on the one multi-line block (34px
type set 40.8px apart); single-line text gives no evidence, so 1.2 for headings
and a normal 1.5 for body is the sane reading.

| Token | Font | Size / weight | Used for |
| --- | --- | --- | --- |
| `--text-display` | Lora | 34 / 600 | "Every book you're reading, in one place." |
| `--text-h1` | Lora | 28 / 600 | "Welcome back", "Create your account" |
| `--text-wordmark` | Lora | 20 / 600 | "Bookshelf" beside the logo mark |
| `--text-lead` | Inter | 15 / 400 | Illustration-panel body copy |
| `--text-body` | Inter | 14 / 400 | Sub-headings, input values |
| `--text-button` | Inter | 14 / 500 | All button labels |
| `--text-label` | Inter | 13 / 500 | Field labels, links |
| `--text-small` | Inter | 13 / 400 | "New to Bookshelf?", "Already have an account?" |
| `--text-helper` | Inter | 12 / 400 | Password rules, error text, legal line, "or" |
| `--text-helper-strong` | Inter | 12 / 500 | The "Show" toggle |

Note the pattern: within a size, **500 means interactive or a label, 400 means
prose**. Links are 13/500 in `--color-primary`; the text beside them is 13/400
in `--color-text-muted`.

## Book-spine palette

The ten spine colours from the illustration. Phase 2's `BookCover` needs a
colour for covers that have no image — this is that palette, already proven to
work together. Pick by hashing the book id so a given book always gets the same
colour.

`#2F5D62` `#B7707A` `#C9A66B` `#3E5641` `#2C3E63` `#6B4C6E` `#A65B2A`
`#5A6B7A` `#8A6A3F` `#7E5A3C`

Note `#A65B2A` is also `--color-primary`, so skip it for covers or a placeholder
will read as a button.

## Complete

Both auth screens are fully specified — colour, geometry, rhythm and type.
Nothing further is needed from Figma for Phase 1.
