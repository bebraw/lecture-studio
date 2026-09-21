# Portable conference example

## Presentation

```yaml
version: 1
title: Explaining cancellation
variants:
  ai-day:
    title: AI Day · 12 minutes
    slides: [opening, comparison, order, references]
    speakingMinutes: 12
    qaMinutes: 3
    durations: { opening: 60, comparison: 180, order: 420, references: 60 }
  webist:
    title: WEBIST · 15 minutes
    slides: [opening, comparison, order, process, references]
    speakingMinutes: 15
    qaMinutes: 5
    durations:
      { opening: 60, comparison: 180, order: 420, process: 180, references: 60 }
pdf:
  aspectRatio: "16:9"
identity:
  presenter: Example presenter
  affiliation: Example research group
  logo: ./logo.svg
  joinUrl: https://example.org/live-session
```

## Slide: Explain the action and the recovery

```yaml
id: opening
type: title
```

An authored example that travels with the talk.

<!-- speaker-notes -->

PRIVATE_CONFERENCE_NOTE: rehearse the transition.

## Slide: Compare the outcomes

```yaml
id: comparison
publication:
  explanation: |
    The expected version distinguishes a valid action from a stale request.
reveals:
  rows:
    - step: 1
      table: 1
      rows: [1]
    - step: 2
      table: 1
      rows: [2]
```

| Request         | Server action      | Client action     |
| --------------- | ------------------ | ----------------- |
| Current version | Apply cancellation | Show confirmation |
| Stale version   | Reject the change  | Refresh the order |

::: reveal 1
A valid action changes the order once.
:::

::: reveal 2
A stale request needs recovery, not another cancellation.
:::

## Slide: Follow one order

```yaml
id: order
demo: ./order.html
demoSequence:
  - state: '{"status":"available"}'
    caption: The available action carries the version the client has read.
  - state: '{"status":"cancelled"}'
    caption: Successful cancellation moves the order from version 7 to version 8.
  - state: '{"status":"stale"}'
    caption: A stale version 7 request is rejected; the server keeps version 8 unchanged.
  - state: '{"status":"recovered"}'
    caption: Refresh recovers the current version and confirms that cancellation succeeded.
```

## Slide: Separate the command from recovery

```yaml
id: process
source: Illustrative version-checking model; no production measurements.
```

```mermaid
flowchart LR
A[Read version] --> B[Request cancellation]
B --> C{Version matches?}
C -->|Yes| D[Confirm change]
C -->|No| E[Refresh current state]
```

## Slide: Join the discussion

```yaml
id: discussion
publication:
  omit: true
```

Open the live-session link and submit your question now.

## Slide: References

```yaml
id: references
chapter: References
```

This example illustrates optimistic concurrency. It does not model payments or delivery.

- [HTTP conditional requests: RFC 9110, section 13](https://www.rfc-editor.org/rfc/rfc9110.html#section-13)
