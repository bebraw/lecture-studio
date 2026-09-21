# Progressive reveals

## Presentation

```yaml
version: 1
title: Progressive reveals
```

## Slide: Explain the comparison

```yaml
id: comparison
type: material
reveals:
  rows:
    - step: 2
      table: 1
      rows: [1, 2]
    - step: 3
      table: 1
      rows: [3]
```

Keep the whole comparison in view as the explanation develops.

::: reveal 1
First, identify the work that can run independently.
:::

::: reveal 1
Two blocks can appear together, even when authored separately.
:::

| Stage   | Work                       | Constraint          |
| ------- | -------------------------- | ------------------- |
| Prepare | Read the input             | One source          |
| Compute | Process independent pieces | Available workers   |
| Combine | Assemble the result        | Wait for all pieces |

::: reveal 2
Next, compare preparation with parallel computation.
:::

::: reveal 3
Finally, account for the time spent combining the results.
:::

<!-- speaker-notes -->

Use Next to reveal each step. The table remains readable throughout.

## Slide: The whole process

```yaml
id: summary
type: material
```

Slides without reveals still advance normally.

## Slide: One last point

```yaml
id: closing
type: question
```

What would change if the independent work became much faster?

::: reveal 1
The remaining stages would account for a larger share of the total time.
:::
