# Design — Uni Parent

A locked design system for the Uni Parent website and planning application.

## Genre

Modern-minimal with a calm, utilitarian productivity tone.

## Macrostructure family

- App pages: Workbench, led by the working planner and a calendar grid.
- Content pages: Long Document with concise ruled sections.
- Error pages: Single-purpose utility panel.

## Theme

- Cool near-white paper and blue-grey ink.
- Deep teal carries the inherited academic brand mark.
- Cobalt is the only interactive signal accent and stays below five percent of a viewport.
- Surfaces use hairlines and restrained depth; gradients and glass effects are excluded.

## Typography

- Display and body: system UI sans-serif, with headings at weight 650–750.
- Mono labels: the platform monospace stack.
- Headings remain upright, left-aligned, and tightly set.

## Spacing

Use the named four-point scale in `styles.css`. Avoid untracked one-off spacing values.

## Motion

- No scroll reveals or autoplay.
- Hover and pressed feedback completes within 180 ms.
- Reduced-motion removes transitions.

## Microinteractions

- Success is quiet and announced through the existing toast/status region.
- Focus rings are immediate and visible.
- Inputs preserve border width across default, hover, focus, error, and disabled states.

## CTA voice

- Primary actions are solid cobalt rectangles with a six-pixel radius.
- Secondary actions are hairline-bordered and name their destination.

## What every page shares

- Globe mark with live “Uni Parent” wordmark.
- Header navigation, cobalt active state, type, spacing, footer, and focus treatment.
- One `h1`, unique metadata, canonical URL, and concise breadcrumb where appropriate.

## Page allowances

- Planner pages may use category tints inside calendar events.
- Content pages use typography and rules only.
- No page invents metrics, testimonials, business addresses, or professional guarantees.

