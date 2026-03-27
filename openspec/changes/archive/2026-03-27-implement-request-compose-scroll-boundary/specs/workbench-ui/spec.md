## MODIFIED Requirements

### Requirement: Request compose body owns the request-pane scroll boundary
The system SHALL keep the request tab strip and request command bar anchored while the request compose body owns one shared independent vertical scroll boundary, so long request configuration content does not visually collide with or feel covered by the response pane.

#### Scenario: User edits a long request configuration in desktop workbench
- **WHEN** params, headers, body, auth, tests, or environment content exceeds the available height of the request pane while the response pane remains visible
- **THEN** the request tab strip and request command bar remain visible and the active request compose section scrolls within one shared compose-body boundary instead of introducing separate section-level scroll regions

#### Scenario: User scrolls within request configuration content
- **WHEN** the user scrolls through long request-compose content inside the active request pane
- **THEN** the response pane and surrounding workbench shell remain spatially stable while the request compose content is clipped and scrollable within one shared compose scroll container
