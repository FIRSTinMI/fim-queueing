
```mermaid
stateDiagram-v2
    [*] --> New
    New --> QualScheduleReady
    QualScheduleReady --> New
    QualScheduleReady --> QualMatchesOver
    QualMatchesOver --> PlayoffMatchesReady
    PlayoffMatchesReady --> PlayoffMatchesOver
    PlayoffMatchesOver --> [*]
```