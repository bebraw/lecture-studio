# A bounded scalability claim

## Presentation

```yaml
version: 1
title: A bounded scalability claim
```

## Slide: Name the pressure

```yaml
id: pressure
type: material
chapter: Read
study:
  explanation: |
    A scalability claim connects a changing pressure to behavior that stays within a stated bound.
    More users, more data, more contributors, and more frequent change can expose different limits.
    Start with one pressure and one observable outcome.
```

Under **what pressure** should the system preserve **which behavior**?

For example: “At 20 concurrent users, p95 accepted-write latency remains below 500 ms in this environment.”

This is an illustrative target, not a measured result.

[Read the course book](https://scalableweb.dev/)

<!-- speaker-notes -->

PRIVATE_PILOT_NOTE: Ask the room for examples before revealing the definition.

## Slide: More workers, same sequential work

```yaml
id: amdahl
type: material
chapter: Experiment
demo: ./amdahl.html
study:
  explanation: |
    Amdahl's law models a fixed workload with ideal parallel execution:
    **speedup = 1 / ((1 − p) + p / n)**.

    With 80% parallel work and four workers, speedup is 2.5×. With more and more workers,
    the remaining 20% sequential work limits the ideal speedup to 5×.
    Coordination overhead and changing workload sizes are outside this model.
```

Predict the result before changing the controls. Start with 80% parallel work and four workers, then increase the workers to 16.

What changes if you increase the parallel portion instead?

## Slide: Which claim follows from the model?

```yaml
id: check
type: poll
chapter: Reflect
room: self-study-example
poll:
  question: What is the ideal speedup with 80% parallel work and four workers?
  defaultId: uncertain
  options:
    - { id: linear, label: "4×: four workers make it four times faster" }
    - { id: bounded, label: "2.5×: the sequential portion still takes time" }
    - { id: uncertain, label: "The equation cannot predict any speedup" }
study:
  prompt: Explain your choice before checking it.
  correctOption: bounded
  answer: |
    **2.5×** follows from 1 / (0.2 + 0.8 / 4).
    It is an ideal model result, not a promise about a production system.
    A real measurement may include scheduling, communication, and other overheads.
```

Use the stated assumptions, then distinguish the prediction from a measurement.

## Slide: Classroom arrangements

```yaml
id: classroom
type: material
study:
  exclude: true
```

PRIVATE_CLASSROOM_ONLY: Group membership and classroom scheduling go here.
