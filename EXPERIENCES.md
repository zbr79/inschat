# EXPERIENCES.md

Append-only log. Record every solved problem / unresolved issue / disproved approach.

Format per entry:

```
## YYYY-MM-DD — Title

### Solved
- What fixed it.

### Unresolved
- What's still open.

### Disproved
- What was tried and didn't work (and why).
```

Companion file: `PLAN.md` (read-first decision log + roadmap).

---

## 2026-09-06 — Direct web research and agent removal

### Solved
- Removed the local OpenCode agent-server route and SDK dependency; `/api/chat` now uses the direct engine for both text and image requests.
- Added a direct `web_search` tool backed by Bing RSS results, alongside the existing `web_fetch` tool. Text requests can search first and fetch source pages in the same tool loop.
- Reverted the uncommitted free-model fallback banner to the previous centered notice.

### Unresolved
- Search quality depends on the public Bing RSS endpoint and may need a provider/API-key change if it becomes unreliable.

### Disproved
- The separate agent server was not needed for direct web research once search and fetch tools were available in `streamChat`; it added latency and a second runtime to maintain.

## 2026-09-06 — Restore OpenCode Go session routing

### Solved
- Added the required stable `x-opencode-session` header to direct Go requests, using the chat session ID when available and a generated ID for one-off requests.
- Added the recommended `InsChat/1.0` user agent and passed session IDs through both chat APIs.

### Unresolved
- The provider may still reject individual models for quota, availability, or endpoint-specific reasons.

### Disproved
- The response-bubble layout change was not the cause of the provider error; the direct request lacked the provider's newly enforced session metadata.

## 2026-09-06 — ChatGPT-style sent-message editing

### Solved
- Upgraded inline editing with a composer-style card, auto-growing textarea, clearer Submit/Cancel hierarchy, and visible image previews.
- Added `Ctrl/Cmd+Enter` to submit and `Escape` to cancel without changing the existing truncate-and-regenerate behavior.

### Unresolved
- Message version history is not implemented; editing still replaces the conversation path from the edited message.

### Disproved
- A separate editing route or modal was unnecessary; the existing inline editor can support the improved workflow.

## 2026-09-07 — Make edit composer visibly distinct

### Solved
- Expanded the editor to a clearly wider composer-style card with a title, keyboard hint, stronger border, and shadow.
- Kept the message bubble width separate from the editor width so the edit state is visibly intentional rather than a small restyled bubble.

### Unresolved
- n/a

### Disproved
- The first editor polish pass was too subtle to be reliably visible in the live UI.

## 2026-09-07 — Simplify edit box and grow multiline inputs

### Solved
- Simplified the edit state to one full-width gray container with only the textarea and two actions.
- Removed the extra edit title and keyboard-hint layers.
- Added auto-growth to the main composer textarea so multiline input increases its height up to the existing maximum.

### Unresolved
- n/a

### Disproved
- The layered edit header and hint improved discoverability enough to justify the added visual complexity; the simpler ChatGPT-like treatment is clearer.

## 2026-09-07 — Rename edit action to Send

### Solved
- Changed the edit action label from “Save & submit” to the shorter “Send” in English and Chinese.

### Unresolved
- n/a

### Disproved
- n/a

## 2026-09-07 — Refine inline edit actions
### Solved
- The inline editor now places Cancel on the left and Send on the right.
- Removed the border around the inline editing area while preserving the gray editor background.
### Verified
- `npm run build` passed after each requested UI change.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Add glucose timeline chart and month grouping
### Solved
- Added a records-page blood-glucose line chart with selectable 1-day, 7-day, 3-month, 1-year, and all-time ranges.
- Chart points are extracted from saved glucose readings and never synthesize missing health data.
- Grouped saved records under month headings while retaining day-level entries.
### Verified
- `npm run build` passed after each implementation point.
### Unresolved
- The chart currently supports blood glucose only; insulin-dose visualization remains a separate follow-up.
- No manual backfill or import flow was added, so ranges with no recorded readings remain empty.
### Disproved
- n/a

## 2026-09-07 — Replace glucose line chart with bars
### Solved
- Replaced the connected glucose line with vertical bars that rise from a visible zero baseline.
- Each bar represents one actual reading, making missing readings visually explicit without interpolation.
### Verified
- `npm run build` passed.
- PM2 restarted and `/records` returned HTTP 200.
### Unresolved
- The IDE browser probe could not access the local app, so visual verification was limited to the production build and HTTP smoke test.
### Disproved
- n/a

## 2026-09-07 — Add reusable synthetic records preview
### Solved
- Added a guest-only Records control that loads 60 days of clearly labeled synthetic data into local storage.
- Each demo day contains four glucose readings: morning before eating, morning after eating, afternoon before eating, and afternoon after eating.
- Added a separate removal action that deletes only demo records and leaves real guest records untouched.
- Kept the chart inside the available content width; dense ranges use narrower bars and suppress overlapping value labels.
### Verified
- `npm run build` passed after each implementation point.
### Unresolved
- Demo values are for chart visualization only and must not be interpreted as real health measurements.
### Disproved
- n/a

## 2026-09-07 — Simplify Records navigation and fit chart width
### Solved
- Replaced the sidebar's per-record list with one Report timeline link.
- Removed horizontal chart scrolling so the complete selected range fits inside the widened records content area.
### Verified
- `npm run build` passed after the sidebar and chart updates.
### Unresolved
- Very dense ranges show exact values through bar tooltips rather than drawing every number on the chart.
### Disproved
- n/a

## 2026-09-07 — Restore Records folder with timeline child
### Solved
- Restored the Records folder header and its collapse control.
- Kept the folder contents limited to the single Report timeline item.
### Verified
- `npm run build` passed.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Add timestamp-aware glucose line view
### Solved
- Added a Bar chart / Line chart toggle to the glucose timeline.
- Line points use their actual recorded timestamps, preserving visible time gaps when readings are irregular or skipped.
- Range bounds now represent the selected time window instead of compressing points between the first and last reading.
### Verified
- `npm run build` passed after the chart helper, UI, and styling updates.
### Unresolved
- The line connects adjacent real observations; it does not create missing readings or infer health values.
### Disproved
- n/a

## 2026-09-07 — Add chronological and daily-pattern chart modes
### Solved
- Added Timeline and Daily pattern view modes.
- Daily pattern overlays each date on a 24-hour axis, with separate per-day lines and actual reading points.
- Kept missing time-of-day readings absent rather than filling or connecting separate dates.
### Verified
- `npm run build` passed after the chart mode, labels, and styling updates.
### Unresolved
- The current daily mode overlays daily traces; aggregate statistics such as median bands can be added later if needed.
### Disproved
- n/a

## 2026-09-07 — Add connected report editing
### Solved
- Added an Edit action to each dated report entry.
- Added a shared record editor for title, summary, data items, timestamps, units, and meal details.
- Guest edits persist to local storage; authenticated edits persist through the existing records PUT endpoint.
- Updated records in state immediately so edited glucose values update the timeline and charts without leaving the page.
### Verified
- `npm run build` passed after the editor, persistence, and styling updates.
### Unresolved
- The editor does not alter the original chat transcript; it updates the connected saved report only.
### Disproved
- n/a

## 2026-09-07 — Migrate records to one account report
### Solved
- Added a single account-level report container for guest data and authenticated MongoDB data.
- Existing per-session records migrate into timestamped entries the first time the account report is read.
- New chat conclusions append entries; later saves for the same linked chat entry update that entry.
- Report entries retain session IDs and recorded timestamps, while the Records page continues sorting by date.
- Kept the existing records API shape for the UI while changing its storage source to the account report.
### Verified
- `npm run build` passed after the storage, API, and chat-save changes.
- PM2 restarted successfully after the build.
### Unresolved
- The report is currently stored as one MongoDB document with embedded entries; a separate event collection may be needed if a user's history approaches MongoDB's document-size limit.
### Disproved
- Append order is not used for timeline display; entries are sorted by recorded time.

## 2026-09-07 — Add Full report account log page
### Solved
- Added a Full report page at `/records/full` beneath the Records sidebar folder.
- Reused the account report data source and dated grouping so the page shows every saved entry from newest to oldest.
- Added report titles, summaries, and recorded timestamps to make the page a complete account log rather than only a chart view.
### Verified
- `npm run build` passed after fixing the sidebar fragment required for two Records links.
- Both `/records` and `/records/full` returned HTTP 200 after restarting PM2.
### Unresolved
- The full log currently shares the Records page's edit and delete controls; a separate export/print action has not been added.
### Disproved
- n/a

## 2026-09-07 — Match Full report editing to session reports
### Solved
- Full report entries now open the same `ConcludeModal` structure used for reports created from chat sessions.
- Kept the page itself as a read-only account log; editing remains an editing panel.
- Made report titles, summaries, meal names, foods, dish names, meal times, reading values, units, phases, and timestamps editable in that panel.
- Removed repeated delete buttons from the full-report list; entry deletion is available from the open editor instead.
- Expanded guest demo data into a one-month full report with breakfast, lunch, dinner, occasional afternoon snacks, occasional 11 PM entries, glucose, insulin, phases, timestamps, and variable dish counts.
### Verified
- `npm run build` passed after the editor and demo-data changes.
- Both Records routes returned HTTP 200 after restarting PM2.
### Unresolved
- Demo data remains guest-only and synthetic; it is not written into authenticated MongoDB reports.
### Disproved
- A generic grid editor is not equivalent to the session report editor because it omitted the session editor's reading, phase, meal, and dish controls.

## 2026-09-07 — Remove unrequested Full report labels
### Solved
- Removed entry titles and summaries from the Full report log.
- Removed generated breakfast/lunch/dinner category labels and phase labels from the log; timestamps, values, insulin, glucose, and actual food names remain.
- Removed title and summary fields from the session-style editing panel.
- Kept food names editable because they are the actual food records the Full report needs to control.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing stored entries may still contain internal title and summary data for compatibility, but those fields are no longer shown or edited in Full report.
### Disproved
- n/a

## 2026-09-07 — Unify insulin and glucose display labels
### Solved
- Full report and session-style editors now display both glucose and insulin readings as “Blood sugar” or “血糖”.
- Kept canonical stored metric names as `glucose` and `insulin` so the data model remains accurate.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing raw records can still contain older localized metric names internally; display normalization covers them.
### Disproved
- Changing stored insulin data into glucose would have corrupted chart and analysis semantics, so only the visible label was unified.

## 2026-09-07 — Normalize demo readings to mg/dL
### Solved
- Updated the one-month guest demo report so glucose and insulin-labeled example readings both use `mg/dL`.
- Adjusted the synthetic insulin-labeled values to stay around 100 instead of using `U` values.
- Restricted the editor's unit choices to blood-sugar units for the unified display.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing demo data already loaded in local storage must be removed and loaded again to receive the new units and values.
### Disproved
- n/a

## 2026-09-07 — Interleave readings and meals by time
### Solved
- Records now render readings and meal entries in one chronological stream instead of separate reading and meal blocks.
- Each event retains its own timestamp, so a measurement appears before or after a meal according to the recorded time.
- Kept the Full report's simplified labels while preserving editable food entries.
### Verified
- Pending final build and runtime check.
### Unresolved
- Events with exactly identical timestamps use readings before meals as the deterministic tie-breaker.
### Disproved
- Grouping every measurement together before every meal did not represent the user's actual sequence of measuring, eating, and measuring again.

## 2026-09-07 — Group Full report by day and normalize time display
### Solved
- Full report now renders one card per day, with all that day's readings and food entries inside it.
- Daily cards show only the month/day without a year.
- Event times now use localized 12-hour AM/PM formatting instead of raw or 24-hour strings.
- Moved Edit to the upper-right of each underlying entry block and reveal it on hover or keyboard focus.
### Verified
- Pending final build and runtime check.
### Unresolved
- If multiple independent report entries share one day, each underlying entry retains its own hover Edit control within the shared day card.
### Disproved
- Showing a full timestamp on every entry duplicated the day context and mixed 12-hour and 24-hour formats.

## 2026-09-07 — Add day-level Full report editing
### Solved
- Replaced per-entry Full report Edit buttons with one Edit button per day card.
- Added a day editor dialog that selects the underlying entry before opening the familiar session-style editor.
- Rebuilt day grouping from event timestamps, so meals and readings are assigned to the correct calendar day independently of record titles.
- Flattened all events within a day before rendering, so an earlier reading from one source record cannot appear after a later reading from another.
### Verified
- Pending final build and runtime check.
### Unresolved
- Multiple source entries on one day are selectable inside the day editor rather than merged into one persisted database entry.
### Disproved
- Grouping a day by the first reading in a source record could misplace events when one record contains multiple dates.

## 2026-09-07 — Style Full report event cards and dish effectiveness
### Solved
- Applied the same gray card treatment to reading and meal rows.
- Moved each event's time to the upper-right corner of its card.
- Removed visible `low`, `medium`, and `high` words from Full report dish tags.
- Used green, yellow, and red borders to communicate dish effectiveness.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing records without a stored rank keep the neutral border.
### Disproved
- Showing the rank word beside every dish was necessary once the color border communicates the same status.

## 2026-09-07 — Compact Full report dish tags
### Solved
- Matched dish text sizing and weight to the blood-sugar reading text.
- Removed the dish tag minimum height and reduced its internal padding.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- The larger dish tag dimensions were not needed to preserve the effectiveness border.

## 2026-09-07 — Match Full report dish timestamp styling
### Solved
- Matched meal/dish timestamps to blood-sugar timestamps at 12px, muted color, and normal weight.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- Inherited dish timestamp styling was not visually consistent with reading timestamps.

## 2026-09-07 — Apply role-card colors to Full report dishes
### Solved
- Reused the referenced repository's pastel role palette for dish effectiveness.
- Low, medium, and high dishes now use green, orange/yellow, and red card backgrounds with matching borders.
- Kept the compact tag dimensions and timestamp styling unchanged.
### Verified
- Pending final build and runtime check.
### Unresolved
- Dishes without an effectiveness rank remain neutral.
### Disproved
- Border-only coloring did not sufficiently match the referenced role-card visual language.

## 2026-09-07 — Remove Full report entry picker layer
### Solved
- Removed the intermediate Entry/Edit selection modal from the day editor flow.
- The day editor now opens directly and displays every record for that day, including readings, meals, dishes, values, units, and event times.
- Kept records grouped as separate cards so the next editing pass can add controls without hiding any day data.
### Verified
- Pending final build and runtime check.
### Unresolved
- The new day modal is currently a complete day display; record-level editing controls will be added in the next pass.
### Disproved
- A separate entry picker was not necessary for understanding the day's records.

## 2026-09-07 — Match day editor cards to session report cards
### Solved
- Replaced the custom day-modal rows with the same report-card structure used by the chat conclusion editor.
- Readings now use the report card header/value layout, and meals use the report dish-row layout with rank badges.
- Kept every event visible while removing the extra custom grouping headings.
### Verified
- Pending final build and runtime check.
### Unresolved
- The cards currently mirror the report editor's visual structure; inline editing behavior remains the next step.
### Disproved
- A separate gray list layout was not visually consistent with the chat session report editor.

## 2026-09-07 — Reuse ConcludeModal for Full report editing
### Solved
- Added an embedded mode to the existing `ConcludeModal` instead of maintaining a second report-card renderer.
- Full report day editing now uses the same inline controls, autosave behavior, rank controls, and delete action as chat-session reports.
- The day modal renders every day's record through the shared component.
### Verified
- Pending final build and runtime check.
### Unresolved
- The shared component still edits each underlying record independently within the day container.
### Disproved
- Duplicating the report-card markup in `FullDayEditModal` would have kept chat and Full report behavior synchronized.

## 2026-09-07 — Move reading values into the report-card header
### Solved
- Moved the blood-sugar value and unit onto the first card line after the blood-sugar label and phase.
- Kept the event time at the end of that same line to reduce vertical space in the shared modal.
### Verified
- Pending final build and runtime check.
### Unresolved
- Very long phase labels may wrap on narrow mobile widths.
### Disproved
- A separate second row for the blood-sugar number was not needed in the report editor.

## 2026-09-07 — Remove modal-level report deletion control
### Solved
- Removed the top-right trash action from the shared report modal.
- Kept the per-card delete controls for individual readings, meals, and dishes.
- Reduced shared report-card spacing and removed the extra gap between embedded Full report cards.
### Verified
- Pending final build and runtime check.
### Unresolved
- Deleting an entire underlying report entry is no longer available from the report modal.
### Disproved
- A modal-level trash icon was not necessary when each report card already has its own delete control.

## 2026-09-07 — Abbreviate rank badges and tighten embedded cards
### Solved
- English dish ranks now display as `L`, `M`, and `H`; Chinese ranks remain localized.
- Embedded Full report timestamps now show time only, avoiding long date strings in the card header.
- Reduced the remaining gap between embedded report cards.
### Verified
- Pending final build and runtime check.
### Unresolved
- The stored rank values remain full words for data compatibility; only their display is abbreviated.
### Disproved
- Full date strings and full English rank words were necessary in the compact embedded editor.

## 2026-09-07 — Normalize embedded report wrapper spacing
### Solved
- Removed inherited 24px modal padding from each embedded record wrapper.
- Reset embedded wrapper margins and applied one consistent gap between report cards.
### Verified
- Pending final build and runtime check.
### Unresolved
- Card content height still varies naturally with the number of dishes or readings.
### Disproved
- The inconsistent visual gaps were caused by record timestamps or source-record grouping.

## 2026-09-07 — Normalize reading phase language
### Solved
- Added shared phase localization across the report editor, Records timeline, and chat summary.
- English stored phases such as `before breakfast` now display as `早餐前` in Chinese UI and `Before breakfast` in English UI.
- Selector values and inserted phase items now follow the active language instead of mixing languages.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing stored records retain their original canonical phase text until they are edited and saved.
### Disproved
- The mixed-language display was not caused by the selected time; it came from rendering stored phase text without localization.

## 2026-09-07 — Scale report modal surfaces
### Solved
- Scaled the shared report editor and Full report day modal to 80% of their previous visual size.
- Scaled the modal contents together so report-card proportions remain unchanged.
- Left the nested time picker at its normal scale.
### Verified
- Pending final build and runtime check.
### Unresolved
- Very small mobile viewports may need a separate scale adjustment later.
### Disproved
- Shrinking individual text and controls independently would have preserved the excessive modal footprint.

## 2026-09-07 — Derive meal names from time
### Solved
- Removed meal-name editing from both report editor paths.
- Demo meals no longer insert Breakfast/Lunch/Dinner names.
- Meal labels are generated from meal time in the active language and re-derived before saving.
### Verified
- Pending final build and runtime check.
### Unresolved
- Existing saved records may still contain old meal-name text internally, but it is no longer editable or displayed as the source of truth.
### Disproved
- Meal names should not be user-entered data when the timestamp already determines the meal category.

## 2026-09-07 — Enlarge modal text without enlarging the window
### Solved
- Increased report-modal text sizes by approximately 20% while keeping the existing modal dimensions and scale.
- Allowed card headers to wrap when needed so larger text stays inside the modal.
### Verified
- Pending final build and runtime check.
### Unresolved
- Dense cards with many controls may still wrap on narrow screens, but no content should overflow horizontally.
### Disproved
- Increasing the modal window itself was necessary to improve text readability.

## 2026-09-07 — Scale modal icons with enlarged text
### Solved
- Increased edit, delete, close, and day-modal icons by approximately 20% alongside the text.
- Kept the modal window dimensions unchanged.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- Enlarging text without scaling its associated controls would have left the modal visually unbalanced.

## 2026-09-07 — Show red dish delete control on row hover
### Solved
- Dish trash icons now turn red with a light red background when the dish row is hovered.
- The existing focus and icon-hover behavior remains available.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- Revealing the icon in muted gray did not provide sufficient destructive-action feedback.

## 2026-09-07 — Use the date as the day editor title
### Solved
- Replaced the Full report day editor title with the selected calendar date.
- Removed the duplicate “Edit day” label and secondary date line.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- A generic editor title added useful context when the date itself already identifies the card.

## 2026-09-07 — Show derived titles in Full report timeline
### Solved
- Full report meal cards now show time-derived titles such as 午餐 and 晚餐.
- Blood-sugar cards now show a title combining the metric and localized phase, such as 血糖 · 午餐前.
- Titles use the same active-language derivation as the editor.
### Verified
- Pending final build and runtime check.
### Unresolved
- Records without a parseable time fall back to the generic localized meal label or omit the phase suffix.
### Disproved
- Hiding meal and phase labels made the chronological Full report cards sufficiently identifiable.

## 2026-09-07 — Move timeline titles outside event cards
### Solved
- Full report meal and blood-sugar titles now sit above their gray event cards.
- Kept values, dishes, units, and times inside the cards.
- Made the left timeline dot explicitly black and layered it above the vertical line.
- Started the line at the dot edge so it no longer runs through the dot.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- Placing the title inside each card made the event hierarchy unnecessarily dense.

## 2026-09-07 — Align Full report timeline connector
### Solved
- Offset the Full report connector below the dot's actual position after card padding.
- Preserved the last event as the day timeline endpoint without a trailing line.
### Verified
- Pending final build and runtime check.
### Unresolved
- n/a
### Disproved
- The connector was not randomly extending above the dot; it was using the unpadded entry coordinate.

## 2026-09-07 — Extend connector through the final Full report event
### Solved
- Kept the connector visible below the final event dot as requested.
- All Full report timeline events now render the same connector treatment.
### Verified
- Pending final build and runtime check.
### Unresolved
- The final connector intentionally continues through the bottom padding of the day card.
### Disproved
- Treating the last dot as a special endpoint did not match the requested timeline appearance.

## 2026-09-07 — Add Full report date filter
### Solved
- Added a date picker above the Full report timeline.
- Selecting a date now shows only that day's timeline card, with a clear action to restore all dates.
- Added an explicit empty state when the selected date has no records.
### Verified
- Confirmed the production build and selected-date empty state during the final verification pass.
### Unresolved
- The filter is a single-date selector rather than a date-range selector.
### Disproved
- Requiring users to scroll through the entire account log was not necessary for finding a known date.

## 2026-09-07 — Add Full report export and import
### Solved
- Moved date filtering above the first timeline card and removed the Full report description text.
- Replaced the native empty date placeholder with a date-picker trigger button.
- Added JSON export for the complete report.
- Added JSON import that appends validated records for guest storage and authenticated accounts.
- Removed duplicate date-filter text and anchored the calendar input to the visible date control.
- Added distinct blue export and green import icons/buttons.
- Replaced the unreliable native date picker with a centered calendar modal.
- Added month navigation, localized weekday/month labels, Today, Cancel, Escape, and date selection actions.
- Removed the modal backdrop blur and recorded a permanent no-blur project rule in `AGENTS.md`.
- Added light-blue date backgrounds and accessible record counts for dates that contain saved records.
### Verified
- `npm run build` passed.
- PM2 restarted successfully and the local Full report route returned HTTP 200.
- Browser smoke test confirmed the controls precede the first card, the page description is removed, JSON export downloads, and guest JSON import appends a second report.
- Final browser smoke test confirmed one visible date label and two transfer icons.
- Browser smoke test confirmed the calendar modal is centered, opens from the single date control, and closes after selecting a date.
- Verified the modal backdrop uses a solid translucent overlay without any blur effect.
- Browser smoke test confirmed record-bearing dates receive the light-blue background and count label.
### Unresolved
- Imported records append to the existing report; duplicate detection is not performed.
### Disproved
- A page-level description and a native empty date input were not necessary for the Full report controls.

## 2026-09-07 — Simplify the Brief report page
### Solved
- Renamed the timeline page and sidebar entry to `简报` in Chinese.
- Removed guest/owner descriptions, demo data controls, demo preview text, and the glucose chart subtitle.
- Removed the detailed record timeline list from the Brief report page while keeping the glucose chart.
### Verified
- `npm run build` passed.
- PM2 restarted successfully and `/records` returned HTTP 200.
- Browser smoke test confirmed the chart remains visible while the detailed timeline, edit, and delete controls are absent.
### Unresolved
- The Full report page remains separately labeled `完整报告`.
### Disproved
- The removed descriptions and demo-preview controls were not necessary for the Brief report view.

## 2026-09-07 — Add 30-day report insights
### Solved
- Removed the bar-chart mode and kept the glucose chart as line/daily views.
- Added a 30-day insights section for highest blood sugar, lowest blood sugar, and the largest same-phase glucose difference across consecutive day pairs.
- Added deduplicated meals for both dates in the winning consecutive pair.
- Changed meal details to show only the higher-glucose day.
- Rendered that day's foods as rank-colored bubbles.
- Changed the display labels from insulin to blood sugar without changing stored record names.
- Kept meal categories and food bubbles on one row, ordered from high impact to low impact.
### Verified
- `npm run build` passed.
- PM2 restarted successfully and `/records` returned HTTP 200.
- Browser smoke test confirmed consecutive day pairs are compared, with older non-adjacent days excluded.
- Browser smoke test confirmed the largest pair shows `105 → 130` for `晚餐前` and duplicate meals are collapsed.
- Browser smoke test confirmed only the higher-glucose day's foods are shown with low/medium/high green, yellow, and red bubbles.
- Browser smoke test confirmed highest/lowest metrics display blood sugar labels and foods order high → medium → low.
### Unresolved
- Insights require parseable numeric glucose readings, timestamps, and explicit phase tags.
- If fewer than two tagged days exist, the phase comparison has no result.
### Disproved
- A bar-chart toggle was not needed alongside the new summary metrics.

## 2026-09-06 — Suppress transient streaming trailing whitespace

### Solved
- Trimmed only the text shown during streaming in both chat surfaces, preventing model-emitted trailing newlines/spaces from appearing as a temporary blank line.
- Kept the raw accumulated response unchanged for conclusion parsing and persistence.

### Unresolved
- Intentional trailing whitespace is not visually shown while a response is still streaming.

### Disproved
- No backend response mutation was needed; the issue was caused by the UI rendering raw incomplete stream chunks before final cleanup.

## 2026-09-06 — Streaming cursor extra-line artifact

### Solved
- Found that `MessageBubble` appended Markdown hard-break spaces to the final rendered line, then placed the blinking cursor after the Markdown block.
- Stopped adding the hard-break suffix to the final line while preserving breaks between content lines.

### Unresolved
- n/a

### Disproved
- The remaining one-frame blank line was not caused by the model emitting an extra response line; it was caused by the cursor following a forced Markdown break.

## 2026-09-06 — Remove block-level streaming cursor

### Solved
- Browser inspection showed the cursor was a sibling after ReactMarkdown's block-level `<p>`, which forced it onto a separate line before the model/time footer.
- Removed the cursor element and its unused animation styles; the existing thinking dots still indicate an active response before text arrives.

### Unresolved
- n/a

### Disproved
- Trimming trailing response whitespace alone could not fix the gap because the cursor's block-flow position created it independently.

## 2026-09-06 — Stabilize assistant bubble phases

### Solved
- Kept one assistant bubble visually stable while it transitions from thinking dots to streamed text.
- Reserved the metadata footer's height so the model/time row does not create a new layout jump when the response completes.

### Unresolved
- The assistant bubble still grows naturally for multi-line answers.

### Disproved
- Combining the user and assistant messages into one bubble was rejected because it would obscure who wrote each message.

## 2026-08-27 — v1 built: text chat + image upload + streaming

### Solved
- Next.js 16 App Router + React 19 + `@google/genai` SDK, `gemini-3.6-flash` on the free tier (configurable via `GEMINI_MODEL`).
- Streaming relay: `POST /api/chat` returns a `ReadableStream`; server validates payload (roles, image type/size) before calling Gemini; images travel as base64 `inlineData`.
- Multi-turn context: last 20 messages sent as full history.
- Free-tier 503s handled with 3× retry + backoff in `lib/gemini.ts`; the route streams the real error message.
- Renamed project to InsChat; added sidebar usage panel: PT-day request/error counters + rpm tracking persisted in `data/usage.json` (`lib/usage.ts`).

### Unresolved
- No auth/DB/persistence — conversations live in the browser only (deliberate v1 scope).
- Usage is tracked but not hard-blocked in-app — rate limits are enforced by nginx at the edge instead.

---

## 2026-08-27 — Public deployment (inschat.renstoolbox.com)

### Solved
- Live at https://inschat.renstoolbox.com via nginx → 127.0.0.1:3001; streaming preserved (`proxy_buffering off` etc.).
- PM2 app `inschat` runs `next start -p 3001` (ecosystem.config.js).
- Real `GEMINI_API_KEY` in `.env` (gitignored, never committed); text + image chat verified working.

### Unresolved
- In-app rate limiting stays at the edge (nginx) — see PLAN "Deliberately excluded".

---

## 2026-08-27 — Conclude: structured conclusion from an AI reply

### Solved
- User-facing problem: chat replies are free text ("your insulin is 130"), so nothing could be recorded. Solution: per-message **Conclude** button that makes a *separate* non-streaming Gemini call with `responseMimeType: "application/json"` + JSON schema (OBJECT: title/summary/items[]) — the streaming chat stays untouched.
- `responseSchema` (SDK Schema object) produced junk values ("130 navigator.deviceMemory…") on the free-tier model. Fixed by switching to `responseJsonSchema` (plain JSON-Schema object, Gemini strict mode) + prompt rules (value = ONLY the value, one item per metric). Verified clean on 3 scenarios: insulin / meal / no-data.
- `lib/conclude.ts` reuses `getApiKey` (now exported from `lib/gemini.ts`) and the same 3× 503-retry pattern; `sanitize()` defends against malformed model JSON before it reaches the client.
- `POST /api/conclude` validates `text`/`context` (length caps), returns JSON or 400/502; counted in the usage panel via `recordRequest/recordError`.
- UI: `components/ConclusionCard.tsx` (own state) rendered under model bubbles via a new `.message-body` wrapper in `MessageBubble.tsx`; context = the preceding user message (needed for "in the morning" time hints).
- Live-site 405 on `POST /api/conclude`: nginx `location /` only allows GET/HEAD/OPTIONS (exploit-block pattern). Fixed by adding a dedicated `/api/conclude` location (POST|OPTIONS, no buffering) in `/etc/nginx/conf.d/inschat.renstoolbox.com.conf`.
- Usage-panel limits were wrong: `GEMINI_LIMITS.rpd` was a hard-coded v1 assumption (1500/day). The API's real 429 payload showed the free-tier daily cap for `gemini-3.6-flash` is **20 requests/day per model** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier, quotaValue: "20"`). Updated `lib/usage.ts` + `UsagePanel.tsx` to 20; each chat or Conclude call = 1 request.

### Unresolved
- Conclusion is display-only — no DB save yet. Next step: Save button on the conclusion card → MongoDB (new db `inschat`, same Atlas as baizhan-v2).
- No time resolution logic yet (AI may put "time" as an item; server-side "today + inferred time" parsing is planned for the save step).
- Free tier is tight: ~20 req/day/model means ~10 chats + 10 Concludes, or 20 chats with no Concludes — enough for personal use, thin for heavy testing.

---

## 2026-08-27 — Model switching + per-model quota tracking

### Solved
- Quota is **per model** (429 payload: `GenerateRequestsPerDayPerProjectPerModel-FreeTier, quotaValue: "20"`): when `gemini-3.6-flash` was exhausted, the same key still worked on `gemini-3.5-flash`, `gemini-flash-lite-latest`, `gemini-3-flash-preview`. Capacity math: 14 non-retired chat models × 20 = **280 calls/day max**, of which 6 with confirmed image support = **120 image uploads/day**, 9 flash/lite = **180 text-only/day**.
- Built `lib/models.ts`: static catalog of the 19 models returned by `models.list` (2026-08-27 probe), tagged `vision: yes/unverified` + `retired` from the image-probe; active model persisted in `data/model.json` (env `GEMINI_MODEL` is the fallback default).
- `lib/usage.ts` now tracks per-model daily counters (fresh field `models`, old state migrates cleanly); global day limit is dynamic (usable models × 20).
- `GET/POST /api/models` + Models tab (`/models`): switch button, grayed-out "Ran out" (used ≥ 20) and "Retired" rows, per-model progress bars, capacity summary. New nginx location `/api/models` (GET|POST) — same 405 trap as `/api/conclude` had.
- Chat and Conclude both call `getActiveModel()` per request, so switching takes effect immediately without restart.

### Unresolved
- "Ran out" gray-out relies on this app's own counters (quota rejections aren't counted by Google); first requests after midnight PT reset the file state.
- Vision flags for pro/omni/3.5/3.7 models are unverified (probe was quota-blocked) — user re-testing will confirm.
- **No public Google usage API**: the `ai.dev/rate-limit` link in 429 payloads redirects to the logged-in AI Studio dashboard (browser session only). Mitigation built: `isQuotaError()` in `lib/gemini.ts` detects `RESOURCE_EXHAUSTED`/429 and `recordQuotaExhausted(model)` marks the model in `data/usage.json`; the Models tab then shows a real-API "Ran out (API)" tag (grayed + unswitchable). Progress bars remain app-tracked approximations — Google never reports remaining quota.

---

## 2026-08-27 — MongoDB storage: Save conclusion → db `inschat`

### Solved
- Reused the baizhan-v2 MongoDB Atlas cluster (its `MONGO_URI`), separate database `inschat` — added to inschat `.env` as `MONGODB_URI`/`MONGODB_DB` (never logged). Atlas creates the db + `records` collection on first write; verified connectivity with the `mongodb` driver (no mongoose — lighter).
- `lib/db.ts`: lazy singleton client (connect retried per call on failure), `insertRecord/listRecords/deleteRecord` on `records` collection; docs serialized to `SavedRecord` (string `_id`, ISO `savedAt`).
- `GET/POST/DELETE /api/records` with full payload validation (length caps, items ≤ 20) and 400/404/500 handling; new nginx `/api/records` location (GET|POST|DELETE) — same 405 trap pattern as the other API routes.
- Save button on the conclusion card (`ConclusionCard.tsx`): POSTs `{title, summary, items, sourceText}` → button flips to "Saved" (disabled); save errors shown inline, chat never affected.
- `/records` page (`RecordsPanel.tsx` + sidebar link): newest-first list of saved records with delete; verified end-to-end with playwright (Conclude mocked, Save/Delete real): Save → appears on Records page → Delete → empty state.

### Unresolved
- No datetime inference yet: records store `savedAt` only; the "time" item stays a free string. Next: parse time items into a real `datetime` field (today + inferred time, `RECORD_TIMEZONE`) so records can be charted/queried by time.
- No per-user separation (single-user app, no auth) — fine for now.

---

## 2026-08-27 — API call log in MongoDB (`calls` collection)

### Solved
- Since Google has no usage API, every Gemini call is now logged app-side: `insertCall({kind, model, ok, error})` in `lib/db.ts` → `calls` collection in db `inschat`. Chat logs in the stream's `finally` (fire-and-forget, `.catch(()=>{})` — DB failure can never break the chat); Conclude logs success or the truncated (≤500 chars) error.
- `GET /api/calls` returns last 100 calls + totals (`total`/`failed` via `countDocuments`); nginx `/api/calls` location (GET only).
- `/calls` page (`CallsPanel.tsx`, sidebar link): summary card, per-call rows (kind, model, ok/error, local time, error text on failure), auto-refresh every 10s.
- Verified with seeded docs via playwright (summary 2, failed row + error text rendered), then cleaned up — DB left empty for real calls. Write path will produce its first real row on the user's next chat/Conclude.

---

## 2026-08-27 — Conclude on lower-tier model + record translation on save

### Solved
- Conclude decoupled from chat: `getConcludeModel()` in `lib/models.ts` resolves `CONCLUDE_MODEL` (default `gemini-flash-lite-latest`, a fixed lower-tier model — Conclude is pure text). `/api/conclude` usage counting, call log and quota-exhaustion marking all use the Conclude model; chat keeps the switchable model. `/api/models` exposes `concludeModel` and the Models tab says so.
- Record translation (`lib/translate.ts`): on Save, the raw conclusion is transformed before insert — `time`-named items become a real `datetime` (today's date + inferred time in `RECORD_TIMEZONE`, default Asia/Shanghai; "morning"→07:00, "7 am"/"07:00" parsed; timezone offset via `Intl.formatToParts` trick); numeric values get a `number` field (130 from "130" or "98 mg/dL"; food lists left untouched).
- Record docs now store `{title, summary, items[{name,value,unit,number}], datetime, sourceText, savedAt}`; Records page shows a "Reading time" line when a datetime exists. Verified: morning → 23:00Z (=07:00 +08:00), 7 am → 23:00Z, food list → datetime null, numbers 130/98 parsed. Test records cleaned; user's own record untouched.

### Unresolved
- Inferred time-of-day uses today's date even if the inferred time is earlier than now (no date-rollover logic yet).
- The "time" item stays in `items` alongside `datetime` — harmless duplication for display.

---

## 2026-08-27 — ChatGPT-style chat sessions (persisted conversations)

### Solved
- New collections in db `inschat`: `sessions` (`title`, `createdAt`, `updatedAt`) + `messages` (`sessionId`, `role`, `text`, `image` — base64 image stored as-is, ≤5MB each). `lib/db.ts`: insertSession/listSessions/getSessionWithMessages/appendMessage (bumps `updatedAt`)/deleteSession (cascades messages).
- API: `GET/POST /api/sessions` (auto-title from first message, ≤120 chars), `GET/DELETE /api/sessions/[id]`, `POST /api/sessions/[id]/messages` (validates role/text/image). nginx `/api/sessions` location (GET|POST|DELETE).
- `ChatApp.tsx`: reads `?session=` param (Suspense-wrapped — `useSearchParams` needs it in Next 16 static pages); loads messages on mount; creates the session lazily on first send (title = first message text, then `router.replace("?session=id")`); persists the user message immediately and the model message after the stream finishes (failed/aborted replies are not saved). Persistence is fire-and-forget — DB failure never breaks chat.
- Sidebar shows a scrollable session list (only on the home route, hidden on mobile) with + New chat and hover-to-delete; deleting the open session redirects to `/`.
- Bug found by the browser test and fixed: navigating to `/` from `/?session=X` didn't clear the in-memory messages (same mounted component) — the session effect now resets `messages` on every param change.
- Verified end-to-end with playwright (no Gemini calls): load session → bubbles + image render; New chat → empty; sidebar delete → list empty + redirect. Test data cleaned up.

### Unresolved
- No rename UI (auto-title only) — `PATCH` rename is trivial to add later.
- Mid-stream page close loses the in-flight model reply (user message is already saved).

---

## 2026-08-27 — Full model health check (text probe of all 19 catalog models)

### Solved
- Ran a one-message probe against every catalog model (`/home/ubuntu/opencode-tmp/inschat-healthcheck.js`): 9 healthy, 6 quota-blocked (429: pro×3, omni×2, `gemini-3.6-flash`), 5 retired (404), 0 hard failures.
- **Gotcha found:** Gemini 3.x "flash" models return HTTP 200 with **empty text** when `maxOutputTokens` is tiny (16) — the budget goes to thinking. Re-probing with `thinkingConfig: { thinkingBudget: 0 }` + 64 tokens: `gemini-3.5-flash` (0.8s), `gemini-3.7-flash` (38s), `gemini-flash-latest` (49s), `gemini-3-flash-preview` (0.7s) all replied "ok". InsChat is unaffected (no maxOutputTokens set), but future code must never cap output tokens low on thinking models.
- Latency: flash-lite family ~0.5–2.4s; `gemini-3.7-flash` and `gemini-flash-latest` are very slow (38–49s) — bad streaming UX, avoid as primary.
- 429 payloads confirm per-model daily quota again (pro/omni buckets were consumed by earlier probes + user testing; rejected calls consume nothing).
- **Pro/omni 429s are not "used up":** since late 2025 Google removed free-tier access for Pro models entirely (2026: paid-only; `gemini-3.1 Pro` has no free lane). Paid tier: link billing + prepay min $10 → Tier 1 ($250/mo cap), auto-upgrades to Tier 2/3 by cumulative spend; Flash pricing ~$0.25–0.50 input / $1.50–3.00 output per 1M tokens — InsChat volume would cost cents per day.

---

## 2026-08-28 — Live model availability checks on page load

### Solved
- `lib/health.ts`: probes every non-retired model with one tiny text request (parallel, 90s timeout each, 5-min in-memory cache, `force=1` re-check). Each probe is logged to the `calls` collection (`kind: "health"`), successful probes count into per-model usage, 429 probes mark `recordQuotaExhausted`.
- `GET /api/health` (+ nginx block) returns live statuses: `ok` / `quota` / `busy` / `retired` / `empty` / `error`.
- Models tab now runs the check on entry: **retired models are hidden entirely**, quota models grayed with "Ran out", healthy ones get a green "Available" tag, busy get orange; summary card shows `N available · M ran out · K busy` + "Re-check" button. Usage page shows the same availability counts.
- **Probe gotcha fixed:** `thinkingConfig` in the request causes HTTP 400 on non-thinking models (lite variants, `gemini-3.6-flash`). Probe now uses only `maxOutputTokens: 256` (no thinkingConfig) — thinking models still answer (3.5-flash 13–25s, flash-latest/3.7-flash time out at 90s and are marked "busy").
- Live snapshot (2026-08-28): 5 available (3.5-flash, 3.5-flash-lite, flash-lite-latest, 3-flash-preview, 3.1-flash-lite), 6 quota (3.6-flash + pro/omni), 3 busy (3.7-flash, flash-latest, 3.1-flash-lite-preview), 5 retired hidden.
- **Speed fix (2026-08-28):** cold check went 90s+ → ~20s. Three changes: (1) adaptive probe — `thinkingConfig: {thinkingBudget: 0}` makes thinking models answer in <1s (3-flash-preview 13.9s→0.7s); models that reject thinkingConfig with 400 fall back to a plain request; (2) per-model timeout 20s → slow models (flash-latest ~50s) are marked "busy (slow)" instead of blocking the page; (3) stale-while-revalidate — `/api/health` returns the last cached results instantly (34ms) and refreshes in the background when >5min old; UI re-polls once after 30s to pick up fresh results.
- **Marker consistency fix:** `recordQuotaExhausted` marks came from ANY 429 (incl. transient RPM bursts) and stuck all day. Now a successful health probe calls `recordQuotaCleared(model)`; the Models panel also lets live status win over stale markers (`live.status === "ok"` → available even if a marker/counter disagrees).
- **Retired models removed from catalog (2026-08-28):** the 5 models that return 404 (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-3.1-flash-live-preview`, `gemini-3.5-live-translate-preview`) were deleted from `CHAT_MODELS` — the app now knows 14 models. No free way to detect quota exhaustion exists (`models.get()` always 200; `countTokens()` only 404s for retired models — free but can't see quota). The health probe still classifies any live 404 as "retired" so the UI auto-hides models Google retires later.

---

## 2026-08-28 — Auto fallback mode: chat never dies on one model's quota

### Solved
- **Auto mode (default):** `model.json` now stores `"auto"` (or a pinned model name). Chat uses `getChatChain()` — best tier first (pro → omni → flash → lite), and on a 429/404 each model is marked exhausted (free — rejected calls cost nothing) and the chain moves down one tier. Chat only fails if EVERY model in the chain fails. Manually picking a model in the Models tab pins it (no fallback); an "Auto — best available" row in the Models tab re-enables auto.
- **Conclude goes upward:** `getConcludeChain()` starts at the lowest tier (starts with `CONCLUDE_MODEL` = `gemini-flash-lite-latest`) and only moves up when one is exhausted/unavailable/returns malformed JSON.
- Accounting moved into the libs: `streamChat`/`concludeMessage` now call `recordRequest` (for the model that actually answered), `recordQuotaExhausted` (per failed model), and `insertCall` (one row per chain attempt) — the Calls page shows the full fallback trail. Routes no longer duplicate usage/call accounting.
- Verified end-to-end: chat request logged 6 free 429s (pro×3, omni×2, 3.6-flash) then succeeded on `gemini-3.5-flash` (26s total — the model itself is slow, thinking on); Conclude answered on `gemini-flash-lite-latest` in 0.9s; Models tab shows the Auto row Active.

### Unresolved
- Best-first ordering means the first *available* model can be a slow thinking model (~20s first token) — acceptable for now; could reorder the flash tier by speed or disable thinking for simple prompts later.

---

## 2026-08-28 — No auto health checks + account system

### Solved
- **Health checks no longer run on page load** (they were burning quota): plain `GET /api/health` only reads the last cached results (0.17s, 0 requests — verified against the calls count); only an explicit Re-check (`force=1`) probes models. Models/Usage pages show "not run yet" until then. CACHE_TTL/background-refresh logic removed.
- **Accounts (`lib/auth.ts` + `lib/accounts.ts`):** username/password with `crypto.scryptSync` + `timingSafeEqual` (no new deps); login tokens = random 32B, sha256-stored in `auth_tokens` (30-day expiry), delivered as httpOnly/Secure/SameSite=Lax cookie. Routes: `POST /api/auth/register|login|logout`, `GET /api/auth/me`.
- All app API routes (chat, conclude, sessions, records, models, health, usage, calls) now require the cookie via `requireUser` (401 otherwise). Sessions/messages/records are scoped by `userId` (ownership checks on read/write/delete).
- **Data migration:** the first registered account claims all pre-auth data (`userId` missing OR dangling to a deleted user) — the existing "Greeting" record + 2 sessions were preserved through a test-user create/delete cycle and re-orphaned correctly. Verified full flow in playwright: unauthenticated → /login; register/sign in → sidebar shows username + sessions + composer; sign out → /login; protected pages redirect.
- `/login` page (login/register toggle, inline errors), sidebar user chip + Sign out, nginx `/api/auth` block.

### Unresolved
- No password reset / no email — acceptable for a personal app; note it if a second real user ever appears.
- Usage counters (`data/usage.json`) and the `calls` collection stay global (they describe the shared API key, not a user).

---

## 2026-08-28 — Guest mode (localStorage, no login)

### Solved
- Recruiter-friendly demo: no account needed. Guests get chat + Conclude (both APIs dropped `requireUser`); the whole guest experience persists in localStorage — `lib/guestStore.ts` holds sessions (uuid, title, messages incl. images) and saved conclusions/records. Quota-overflow fallback: if localStorage fills, images are dropped (text kept), sessions trimmed to the newest 10.
- `ChatApp` is auth-aware: guest → local session store (no server calls); signed-in → server flow unchanged. Guest header hint "chats and records stay on this device"; guest Save on the conclusion card writes a local record; Records page shows local records for guests with its own sub-text.
- Sidebar: no forced /login redirect anymore; guests see only Chat + Records (owner tabs Calls/Models/Usage hidden — they switch the global model / expose quota); guest session list + delete; "Sign in" link. Signed-in users see the full tab set + username + Sign out.
- **Race bug found & fixed:** `router.replace("?session=id")` inside `send()` re-ran the session-load effect, which reset the live conversation to the (empty) stored copy — chat answered with 200 but the UI stayed blank. Fix: the load effect now skips refetching when `sessionParam === sessionIdRef.current` (fixes a latent race for the server flow too).
- Verified (playwright, fresh context): no redirect; send → URL gets session; **refresh restores 2 bubbles**; Conclude → Save → "Saved"; Records page lists the local record; Models page doesn't crash for guests; session delete works. Owner flow re-verified (register → 5 tabs + username → sign out), test account deleted and data re-orphaned.

### Unresolved
- Guest data never migrates to an account on sign-in (stays in localStorage) — acceptable for demos.
- Guests burn the shared API quota; nginx per-IP rate limit (20 req/min) is the only guard.

---

## 2026-08-28 — Fixed response format (no chat memory needed)

### Solved
- User insight: instead of chat memory, bake the expected response format into the system prompt so users can skip questions entirely — send a photo/reading and get the right shape back.
- `SYSTEM_PROMPT` in `lib/gemini.ts` is now the InsChat glucose-assistant persona: reply in the user's language (labels included); food photos → per-item analysis (成分/营养特点/升糖影响 + overall GI summary + tips); readings → value/unit/time restated, missing unit flagged instead of guessed; never invent numbers.
- UI hints updated to match: empty state ("Send a food photo… or a reading like 'insulin 130 at 7 am'") and composer placeholder ("Ask about a meal, or record a reading…").
- Verified with real calls: Chinese food question → Chinese per-item format exactly as the user's example; English reading → structured restatement + "unit missing" flag.
- Persona moved to a file: `SYSTEM_PROMPT.md` (project root) is read per request by `getSystemPrompt()` in `lib/gemini.ts` (fallback constant if missing) — editing the md takes effect with no rebuild/restart. (Naming note: AGENTS.md already exists for opencode's own repo instructions, so the chatbot persona uses SYSTEM_PROMPT.md instead.)

---

## 2026-08-28 — Exact food-photo response format (Chinese, template)

### Solved
- User defined a strict template for food photos (Chinese only, image-with-food condition): `{M月D日 上午/中午/下午/晚上X点}` → `基于时间：{早餐/午餐/晚餐/加餐}` (mapped from clock time: 5–10 / 11–14 / 17–21 / else) → one line per item `{食物} - {高升糖|中升糖|低升糖}` with a one-sentence reason ONLY for 高升糖 (低升糖 no reason) → `--------------` → `总结{≤2 sentences}` — nothing outside the template.
- Current time injected per request: `getSystemPrompt()` appends `当前时间（Asia/Shanghai）: …` formatted via `Intl.DateTimeFormat("zh-CN", { timeZone: RECORD_TIMEZONE })` — the model no longer needs to guess the date/meal.
- Verified with a real food image (wikimedia): reply began "8月28日 下午12点 / 基于时间：午餐 / 面包 - 高升糖 / 高升糖的理由：… / 意面 - 中升糖 / … / 总结：…" — template followed exactly. Template tweaked afterwards to add 中午 for 12点 (file edit, no rebuild — it's read per request).
- **Round 2 (user feedback):** (1) "big sentence" output — caused by markdown collapsing single newlines; fixed in `MessageBubble` with `preserveLineBreaks()` (converts each line to a hard break `"  \n"`) — verified: 3-line reply renders with 2 `<br>`s. (2) Time must be the user's local time — `/api/chat` now accepts `timeZone` (validated via `Intl`), `ChatApp` sends the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`, and the injected 当前时间 uses it (fallback `RECORD_TIMEZONE`); verified with `America/New_York` → "8月28日 上午0点". (3) Template then: bold food lines, only 高升糖 listed, picture's visible time wins, 凌晨 for 0点.
- **Round 3 (user feedback):** template simplified — first line is just the meal name (no date/time, no 基于时间 prefix); every food gets a color dot (🟢 low / 🟡 medium / 🔴 high) ordered green→yellow→**red last**; only 🔴 items get a reason prefixed with just "理由：" (no 高升糖理由); divider before 总结 is explicitly mandatory. Verified with a real image: "午餐 / 芦笋 🟢 / 西兰花 🟢 / 红豆 🟢 / 鱼肉 🟢 / 燕麦 🟡 / 面包 🔴 / 理由：… / 总结…" — divider was missed once, so the prompt now states it MUST appear.

---

## 2026-08-28 — Model display + thinking indicator

### Solved
- Plan: sentinel chunks in the plain-text chat stream so the client can show which model answered + a thinking indicator while waiting for the first token. User choices: only the FINAL model (no TRYING walk), bilingual label "Thinking… / 思考中…".
- `lib/markers.ts` (new module): `encodeModelMarker(model)` emits `␀MODEL:<name>␀` (U+2400 delimiter — never occurs in real text); `ModelMarkerParser` strips markers from arbitrarily split chunks (handles markers split across chunks, incl. the prefix itself, and buffers partial markers).
- `lib/gemini.ts` `streamChat`: yields the marker right after `recordRequest(model)` — i.e. when a model actually connects, before its first token. Route unchanged (plain passthrough).
- `ChatApp`: `ModelMarkerParser` in the read loop; `UiMessage.model` set when marker parsed; marker text never appended to the bubble. Finished replies keep `model` so the chip persists in-session.
- `MessageBubble`: streaming && no text → pulsing "Thinking… / 思考中…" + 3 animated dots; model chip under the bubble — model name (monospace) while live, muted "answered by X" once finished (hidden on failed).
- `globals.css`: `.thinking*`, `@keyframes thinking-pulse`, `.model-chip` (+`.live`) using existing `--text-muted` var.
- Verified: curl shows raw stream `␀MODEL:gemini-3.6-flash␀ok`; parser unit-tested via compiled tsc output (split-marker cases all pass); playwright probe on localhost: thinking indicator seen, chip "answered by gemini-3-flash-preview", no sentinel leaked, reply text intact.

### Notes
- The "live chip while streaming" probe line showed "answered by …" because the answer finished before the selector poll caught it (fast flash model); the code path `streaming ? name : "answered by name"` is correct.
- Marker is emitted before iterating the stream — if the stream later fails mid-way, the bubble shows the chip plus the route's appended error text (accepted tradeoff, chip hidden only on `failed`).
- Model name is not persisted to the DB — chip shows for the live session only, not after reload.

---

## 2026-08-28 — Food-photo format: time line back + red-item highlights

### Solved
- User feedback: dinner reply lost the date/time line and the highlight formatting — got "晚餐 / items / 总结" with no time and no divider.
- User's target time format (Chinese style): `2025年4月2日 下午 5:20` — 年/月/日, space before time, 12-hour no leading zeros. Highlights = only 🔴 foods bolded (`**食物 🔴**`) with a 理由 line.
- `SYSTEM_PROMPT.md` section 1 rewritten: line 1 meal name, line 2 full Chinese date-time, dot-ordered food lines (red last), bold-red + 理由, mandatory `--------------` divider before 总结. Period-word rule by hour: 凌晨 0–5 / 上午 6–11 / 中午 12 / 下午 13–18 / 晚上 19–23.
- `lib/gemini.ts` `currentTimeLabel` now emits the injected 当前时间 directly in that target format via `Intl.DateTimeFormat("zh-CN", { hour12: true }).formatToParts()` — the model can copy it verbatim instead of converting.
- Verified with a real food image (food.jpg): "加餐 / 2026年8月28日 下午 2:25 / …🟢🟢🟢…🟡…**通心粉 🔴** / 理由：… / -------------- / 总结…" — time line and bold-red highlight present, divider present, no marker leak.
- Minor drift noted: 14:25 was called 午餐 on one run and 加餐 on another (rule boundary 11–14); cosmetic, left as-is.

---

## 2026-08-28 — Walk display, picture-time rule, chip styling, image lightbox

### Solved
- **Model walk before finish:** `encodeTryingMarker` added; `streamChat` yields `␀TRYING:<model>␀` at each attempt start, so the client shows "Trying gemini-3.1-pro-preview…" while the chain walks (pro 429s take ~0.3s each), then the live chip once a model connects. User reversed the earlier "only final model" choice.
- **One-language label:** thinking label is now just "Thinking…" (dropped / 思考中). Label switches: Trying X… → Thinking… → chip + text.
- **Parser:** `ModelMarkerParser` generalized for MODEL + TRYING markers. Subtle bug class: in-marker buffer includes the leading ␀, so `inner` must be `slice(1, close)` (hit it in both branches; caught by unit tests before shipping).
- **Chip font:** `.model-chip` restyled as a pill (border-radius 999px, `var(--font)` instead of monospace, border + soft bg); `.live` gets a pulsing green dot.
- **Image lightbox:** `components/ImageViewer.tsx` (new) — full-screen overlay, click/Escape closes; bubble images get `cursor: zoom-in` and open it via local state in `MessageBubble`.
- **Picture-time rule:** SYSTEM_PROMPT.md now leads with a "TIME RULE": any visible time on the photo (clock, watch, phone, timestamp, receipt) wins for both the meal name and line 2 (date from 当前时间); 当前时间 is only a fallback.
- Verified: parser unit tests (split TRYING/MODEL markers), raw curl stream shows the full walk `␀TRYING:…␀` ×N then `␀MODEL:…␀`, playwright: "Trying …" label seen, live chip `gemini-3-flash-preview` while streaming, finished "answered by …", image viewer opens/closes, no sentinel leak.
- Not verifiable locally: picture-time rule needs a photo with a visible clock — left for the user to confirm.

---

## 2026-08-28 — Dot-first food format + minimal UI text

### Solved
- Food lines now put the color dot BEFORE the food name (`🟢 酱牛肉`, bold `**🔴 意面**`); order green→yellow→red unchanged. Verified with a real image call.
- Trying phase shows ONLY the animated dots (no "Trying X…" text); "Thinking…" label appears only after a model connects (model set, no text yet), together with the live model chip. Finished chip shows just the model name (dropped "answered by").
- Bug: when TRYING and MODEL markers arrive in the same chunk, the `trying` state overwrote `model` and hid "Thinking…" — fixed by making `model` take precedence in ChatApp's marker handling.
- Removed useless text: empty-state blurb, header subtitle ("Powered by Google Gemini…"), composer hint ("Enter to send…"), textarea placeholder. Composer hint now renders only for image errors.
- Playwright timeline: 0.0s dots-only → 4.6s chip+text. On fast flash models the MODEL→first-token window is <100ms so "Thinking…" barely renders; it exists for the slow-model 10–25s wait.
- Probe note: the "done" condition `!bubble.querySelector('.cursor')` is true during the thinking phase (no cursor when no text) — must also require text present; caught by a state-transition debug probe.

---

## 2026-08-28 — "Frozen app" diagnosis + visible dots + server-side progress logs

### Solved
- User reported a picture send with no response ("app frozen", "not even seeing dots"). Diagnosis: server was healthy (replayed image through production nginx in ~19s); the user's two POST /api/chat (19:13, 19:27) left no rows in the Mongo `calls` collection and no stuck sockets — they were cancelled client-side before the first Gemini attempt logged. Root UX causes: (1) dots were 5px at 25% opacity — effectively invisible; (2) the walk + image re-upload + first-token wait is 15–30s+ of total silence; (3) no way to see where a request is.
- User decisions: keep dots (no text), and instead of timeouts, make it diagnosable ("we should know why it is stuck rather than let it timeout").
- Dots made visible: 8px, opacity 0.2→1, 1s pulse. Verified via playwright (3 dots, 8px).
- `lib/gemini.ts` now logs every step with a per-request id: `[chat:xxxxxx] start (image b64 KB, chain length) / trying <model> / quota exhausted / unavailable / overloaded retry / connected <model> waiting for first token / done / stream error / failed`. `app/api/chat/route.ts` logs client aborts (`client disconnected mid-stream`). Next "frozen" report can be diagnosed from `pm2 logs inschat`.
- Client hardening: `ChatApp`'s `/api/auth/me` probe now aborts after 4s and falls back to guest — `send()` can no longer silently no-op while `isAuthed === null` (a plausible "no dots at all" path).
- Verified: image request logs show full walk → connected → done; app serves 200.

---

## 2026-08-28 — Elapsed timer + chip moved to right of bubble

### Solved
- Per-message elapsed counter: `modelMessage` starts with `elapsed: 0`; a 1s `setInterval` in `send()` increments only that message; cleared in `finally`. Survives stream end so finished replies keep the final time (in-memory only).
- Chip format: `54s · gemini-3.6-flash` (elapsed first, middle-dot separator, model name) — matches the user's "54s dot model name" spec. During the walk (no model yet) it shows just `Ns` with the pulsing green dot, giving the "not frozen" feedback without model-name text.
- Chip moved from below the bubble to the right: new `.bubble-row` flex wrapper (align-items: flex-end, gap 8px) inside `.message-body`; `.bubble` gets `min-width: 0; flex-shrink: 1` so long replies wrap instead of pushing the chip off-screen; chip `flex-shrink: 0; white-space: nowrap`. ConclusionCard still sits below the row.
- Verified via playwright: chip appears immediately with `0s`, ends `2s · gemini-3.6-flash`, geometry check confirms chip is right of bubble on the same row.

---

## 2026-08-28 — Meta line: plain text below-right, time only after finish

### Solved
- Time hidden while streaming — meta shows only the model name (`gemini-3.6-flash`, with pulsing green dot); elapsed appears only after finish (`3s · gemini-3.6-flash`).
- Meta is no longer a pill: `.model-chip` replaced by `.model-meta` — plain 11px muted text, `align-self: flex-end` inside `.message-body` so it sits below the bubble on the right; `.bubble-row` wrapper removed.
- Verified via playwright: streaming meta = model name only; finished = `3s · …` matching /^\d+s · .+$/; geometry: below bubble, right-aligned to the message column, computed styles show no pill (transparent bg, 0 radius, 0 border).

---

## 2026-08-28 — Global Conclude button (whole-conversation summary)

### Solved
- Removed per-message `ConclusionCard` (component deleted). New global flow: one round icon button docked above the composer, right side — chosen per research (setproduct.com: avoid FABs overlapping streaming content; top/bottom dock zones only) and user preference over header placement.
- `components/ConcludeButton.tsx` (new): 44px round icon button (file-text SVG), pulse animation while summarizing, disabled when no replies or while a message is streaming. `components/SummaryCard.tsx` (new): the card UI + save-to-records logic extracted from the old ConclusionCard.
- `ChatApp.concludeAll`: joins ALL non-failed model replies (up to 16k chars) and POSTs to /api/conclude; result renders as an in-chat card at the bottom of the message list (dismissible), per user's "in-chat summary card" choice.
- Verified via playwright: disabled when empty; enabled after replies; 44px button above composer on the right; click → card whose summary mentions BOTH test replies (insulin reading + breakfast); dismiss works; no per-message conclude buttons remain.

---

## 2026-08-28 — Conclude report follows source language

### Solved
- First rule of report formalization: the conclusion must be in the language of the original chat. `lib/conclude.ts` now detects the source language (CJK ratio ≥ 25% of non-space chars → Chinese, else English) and appends a per-language rule to the system prompt (Chinese: title/summary/item names fully Chinese, time item named "时间", units kept as stated; English mirror rule).
- `sanitize()` fallbacks localized too (总结 / 未找到可记录的具体数据。).
- Verified with two real calls: Chinese food reply → {"title":"午餐记录","summary":"记录了午餐食用…","items":[{"name":"时间",…},{"name":"食物",…}]}; English → "Insulin reading" with "insulin"/"time" names.
- Next: user indicated more report-format rules will follow ("first should follow language…").

---

## 2026-08-28 — Report: meal grouping + session persistence

### Solved
- Problem: report showed flat rows (晚餐/时间/午餐/时间 = 4 rows) that read as 4 meals, and the report vanished on refresh.
- Formalized the schema: `ConcludeResult`/`SessionConclusion` gain a `meals` array (`{name, foods, time}`); CONCLUDE_PROMPT + responseJsonSchema instruct one entry per meal, never split/merge meals. API test with the user's exact 2-meal example returns exactly 2 structured meals.
- `SummaryCard` renders `result.meals` as visual meal blocks (name/foods/time together); when `meals` is missing (old data), `lib/groupMeals.ts` falls back to grouping meal/time/food items; meal-related items are filtered from the extras list so nothing duplicates.
- Session persistence: authed → `setSessionConclusion` (Mongo `sessions.conclusion`) via new `PUT /api/sessions/[id]` (validated); guest → `setGuestConclusion` (localStorage). ChatApp restores the card on load and clears it on dismiss (persisting null).
- Verified: 1-meal E2E → 1 block, no flat rows, persists after refresh, gone after dismiss+refresh. Unit tests for groupMeals pass.
- Gotcha during verification: playwright fresh contexts have empty localStorage, so a "missing session" was a probe artifact, not an app bug.

---

## 2026-08-28 — Report title fixed to 报告, summary kept

### Solved
- Card header is now a fixed label — 报告 for Chinese reports, "Report" for English (detected from the conclusion text) — instead of the model's generated title.
- The summary comment stays untouched as the report's description line (verified present after the redesign).
- Records saved from the card now use the same fixed title (报告/Report) so saved entries match what the user sees.
- Verified: E2E food flow → card title "报告", summary comment rendered.

---

## 2026-08-28 — Timeline records + card cleanup

### Solved
- Card: summary line removed, × removed, Save moved to the header right (报告 … 保存), save labels localized (保存/保存中…/已保存 for Chinese reports). Dismiss path deleted (conclude replaces the card).
- Timeline: /records reworked into a day-grouped vertical timeline (Today / Yesterday / date), newest first, each entry = dot + time + meal name + foods (fallback to items for old records), Delete kept, summary not shown.
- Data: records now carry `meals[]` (Mongo `records.meals` + guest localStorage). Authed `datetime` derived server-side from the first meal's time via new `lib/mealTime.ts` `parseMealDateTime` ("2026年8月26日 下午 6:17" → zoned Date); guest timeline sorts/groups client-side from the same parser.
- `parseMealDateTime` handles 凌晨/早上/上午/中午/下午/晚上 shifts (下午6:17 → 18:17, 下午12:xx stays noon, 晚上11:05 → 23:05).
- Verified: unit tests (parser cases), E2E food flow → 已保存 → /records timeline shows 1 day group "Today", entry 加餐 / 晚上 10:35 / foods, no summary.

---

## 2026-08-29 — Insulin reading strict template

### Solved
- New SYSTEM_PROMPT section 2: insulin readings (text or device photo) get a strict template — time line (same format as food, 12-hour + period word) then `胰岛素 {数值} {单位}` then one-line 解读. Only insulin; other metrics stay free-form (section 3).
- TIME RULE extended: typed time wins → visible time on the image wins → else 当前时间 (and the 解读 line says so). Unreadable value → say so and ask; missing unit → 单位未说明 + ask. Never invent.
- Conclude prompt: insulin replies must produce 胰岛素 + 时间 items so the reading lands in the timeline report.
- Verified: "胰岛素 130 早上7点" → strict template with 单位未说明 + ask; "胰岛素 130" → uses 当前时间 (7:03) + asks for unit; conclude extracts {时间, 胰岛素 130 U}.
- Not yet verified: real insulin-device photos (no sample image) — needs a photo of a pen/meter display to confirm vision extraction.

---

## 2026-08-29 — Bare numbers default to insulin

### Solved
- SYSTEM_PROMPT section 2: a bare number with no metric/unit is now an insulin reading by default (that number = 数值; time = 当前时间 with a note; unit flagged + asked).
- Conclude prompt: bare numeric readings extract as 胰岛素 items; units marked missing (单位未说明/unknown) now OMIT the unit field instead of storing junk like "单位".
- Verified: "140" → insulin template `胰岛素 140 单位未说明` with 当前时间; conclude → {胰岛素: 140} + {时间: …} with no unit field.

---

## 2026-08-29 — Glucose unit inference by magnitude

### Solved
- User rule: the model should understand the number, not "dead translate". Prompt section 3 now: 血糖 without unit → ≥40 mg/dL, <20 mmol/L, 20–40 ask; show the other unit in parentheses (mg/dL = mmol/L × 18.02); never change the stated number.
- Bare number default stays insulin, but with a judgment escape: if it clearly reads as a glucose value, state the inference and ask to confirm.
- Verified: 血糖 6.1 → mmol/L（约 110 mg/dL）; 血糖 110 → mg/dL（约 6.1 mmol/L）; 血糖 30 → asks which unit with both conversions shown.

---

## 2026-08-29 — Usage tab rework (no model checks, per-model table)

### Solved
- Usage tab was hidden for guests (the DB has no accounts — the user runs guest mode): `/api/usage` is now public and `guestItems` includes Usage.
- UsagePanel no longer calls /api/health — no live model checks on the page. New per-model table from the catalog + own-call counters: model label/name, sent today, status badge (retired / ran out / in use / available).
- `getUsage()` now exposes `models[]` merged from CHAT_MODELS with `used` and `exhaustedAt` (PT-day state, rolls over at Pacific midnight).
- Verified: 14 rows with counts (3.6-flash=25 ran out, …), no health section, works logged-out, no horizontal overflow at 375px.

---

## 2026-08-29 — Health check, EN/中文 mode, responsive pass

### Solved
- System check: PM2 online, no current errors (stale build-race errors only), all endpoints return expected codes (405 on POST-only, 401 on authed), disk 45%, RAM fine. Healthy.
- Language mode: `lib/i18n.ts` — `useUiLang()` (localStorage + custom event, default 中文), dictionary for nav/records/usage/thinking strings. Header toggle (EN/中文 pill, right side). `/api/chat` accepts `language: zh|en`; `getSystemPrompt` appends the mode line. SYSTEM_PROMPT.md rewritten with parallel templates: food (Chinese template + English template), insulin, glucose two-line format, time formats (`2025年4月2日 下午 5:20` vs `April 2, 2025 5:20 PM`).
- Verified: zh mode → Chinese reply, en mode → English reply; UI nav 聊天→Chat on toggle, persists after reload.
- Responsive: 320/375/768/1024/1280 widths — no horizontal overflow on /, /records, /usage; composer/header/toggle fine on chat page.
- Usage tab: public API + guest nav item (DB has no users — the operator is a guest), per-model table verified 14 rows.

---

## 2026-08-29 — Timeline merge, meta persistence, IndexedDB images, transparent photo bubble

### Solved
- Timeline entries now merge readings + meals: non-meal items (胰岛素/血糖…) render as small pills above the meal blocks in the same entry — a food+insulin session shows `胰岛素 120` + the meal under one dot. Verified via a mixed conversation E2E.
- Model name + elapsed now persist with messages (Mongo `messages.model/elapsed` + guest localStorage), so the `21s · gemini-3.6-flash` meta survives refresh. Messages route validates the new optional fields.
- Guest photos now live in IndexedDB (`lib/guestImages.ts`, key = `sessionId:messageId`); localStorage messages keep only `imageKey`, with inline-image fallback when IDB fails. Verified: 3 MB food photo survives reload.
- Sent photos no longer sit on the dark bubble: `.message.user .bubble:has(img)` → transparent + no padding.
- Also fixed earlier in this batch: bare-number insulin replies are now exactly two lines (time + 胰岛素 数值), no unit question, no uncertainty — the "looks like glucose" escape clause that caused the "120" interrogation was removed.

---

## 2026-08-29 — Terminology: 血糖 vs 胰岛素, bare numbers now glucose

### Solved
- Naming clarified with user: 胰岛素 = insulin (dose, U/IU), 血糖 = blood glucose (mg/dL or mmol/L); English names: insulin / blood glucose (blood sugar).
- Bare numbers now default to 血糖 (blood glucose) with the magnitude unit rule — a bare "140" is a glucose reading, not an insulin dose. Insulin template only triggers on explicit insulin context (胰岛素/insulin/注射/units/pen photo).
- Conclude prompt updated: bare numeric readings extract as 血糖/glucose items; insulin only for explicit insulin replies.
- Verified: "140" → 血糖: 140 mg/dL + time; "6.1" → 血糖: 6.1 mmol/L; "胰岛素 10 U 早上7点" → insulin template; conclude → {血糖: 140 mg/dL} + 时间.

## 2026-08-29 — OpenCode page: DeepSeek V4 Pro via opencode-go subscription

### Solved
- opencode-go API verified usable outside the TUI: key from `~/.local/share/opencode/auth.json` (`opencode-go.key`), base `https://opencode.ai/zen/go/v1` (models.dev), OpenAI-compatible `/chat/completions` with SSE streaming; 33 models listed; unknown model → `ModelError ... is not supported` (HTTP 401).
- New page `/opencode` (`app/opencode/page.tsx` + `components/OpenCodeChat.tsx`): in-memory text-only chat pinned to `deepseek-v4-pro`. Reuses MessageBubble/ModelMarkerParser/CSS classes; emits `MODEL:deepseek-v4-pro` marker so model-meta renders. No persistence, no images, no Conclude.
- New `lib/opencode.ts`: fetch-based client (no SDK) — OpenAI message format (system prompt reuses `getSystemPrompt`, now exported from lib/gemini.ts), SSE parser (yields `delta.content`, ignores `reasoning_content`), logs calls via existing `insertCall` (appears on /calls page). Key from `OPENCODE_API_KEY` env.
- Request parsing extracted from `app/api/chat/route.ts` into `lib/chatRequest.ts` (parseChatBody: roles/text/image/timezone/language validation); `/api/chat` behavior unchanged (verified markers+response after refactor).
- nginx: POST to the new route fell through `location /` (GET/HEAD/OPTIONS only → 405). Added a `location /api/opencode` block mirroring `/api/chat` (POST|OPTIONS, proxy_buffering off, 300s timeouts) to /etc/nginx/conf.d/inschat.renstoolbox.com.conf (backup `.bak-20260829`). Verified public POST reaches the app (400 on empty body = app-level).
- E2E verified on the public site (headless chromium): nav link + active state, empty hint, send → user bubble + "hello from opencode" + `2s · deepseek-v4-pro` meta; layout geometry OK (no overflow).

### Unresolved
- Vision support for deepseek-v4-pro untested; page is text-only by design. `deepseek-v4-flash-vision-exp` exists on the catalog if images are ever needed.
- Subscription rate limits unknown; single attempt, error streamed into the bubble (no fallback chain on this page).

### Disproved
- Assumed the Go API base was `https://api.opencode.ai/v1` — returns "Not Found". Correct base is `https://opencode.ai/zen/go/v1` (models.dev provider registry).

## 2026-08-29 — OpenCode calls/usage page (usage count)

### Solved
- New page `/opencode-calls` + API `/api/opencode-calls`: counts of this app's opencode-go calls from MongoDB (`calls` collection, new kind "opencode" — added to `ApiCall`/`CallDoc`/`insertCall` unions; `lib/opencode.ts` now logs with kind "opencode").
- `lib/db.ts:getOpenCodeUsage()`: total, 5h/7d/30d window counts, failed-30d, per-model 30d counts, 50 most recent calls (aggregate + countDocuments in parallel).
- UI (`components/OpenCodeCallsPanel.tsx`): 3 progress cards vs. DeepSeek V4 Pro request estimates from the Go docs (1,050 / 2,600 / 5,200), total+failed card, per-model table, recent calls list, note card (dollar-based limits, console at opencode.ai/auth). i18n zh/en strings + sidebar nav item for both roles.
- nginx gotcha: `location /api/opencode` is a PREFIX match and also swallowed `/api/opencode-calls` (GET → 405 because the block allows POST|OPTIONS only). Fixed with an exact match: `location = /api/opencode` (nginx -t + reload, both routes verified).

### Unresolved
- Go subscription has no usage API — the page tracks only this app's own calls; the authoritative counter is the opencode.ai/auth console.

### Disproved
- Assumed GET /api/opencode-calls would fall through nginx `location /` (GET allowed) — but nginx prefix matching routed it into the /api/opencode block first.

## 2026-08-29 — Official Go quota API found, wired into /opencode-calls

### Solved
- Previous claim "opencode has no usage API" was WRONG. Official endpoint exists: `GET https://opencode.ai/zen/go/v1/usage` (Bearer = the Go API key) → `{usage:{rolling,weekly,monthly}}` each with `status/percent/resetsAt`. Verified live: rolling 36%, weekly 54%, monthly 77% (dollar-based windows: $12/5h, $30/wk, $60/mo). Sources: GitHub PR #16513 (feat(console): add go usage endpoint), issue #16017, docs guide opencode.ai/console/guides/usage (console CSV export for history; `/zen/go/v1/usage/history` is still only a feature request #43983).
- `lib/opencode.ts:getOpenCodeOfficialUsage()` — fetches the endpoint, validates the three windows, 60s in-memory cache (page polls every 5s; don't hammer the endpoint), returns null on failure.
- `/api/opencode-calls` now returns app counts (MongoDB) + `official` windows; panel shows an official-quota card (percent bars + reset times) above the app's own counts. i18n zh/en strings added; about-note updated.

### Unresolved
- No per-request usage history via the API key yet (only the aggregate windows); history exists only in the console UI / CSV export (service-account keys only).

### Disproved
- `GET /zen/v1/usage`, `opencode.ai/api/usage`, `api.opencode.ai/v1/usage` — all 404; the working path is `/zen/go/v1/usage`.

## 2026-08-29 — Vision-exp on /opencode: auto-route images + speed test

### Solved
- `lib/opencode.ts` now sends images (OpenAI content arrays: text + image_url data-URL) and auto-routes: any image in history → `deepseek-v4-flash-vision-exp`, otherwise `deepseek-v4-pro`. Marker + call log use the actual model. Server logs TTFB + total duration per request.
- `/opencode` page now uses the real `Composer` (image attach + preview) instead of the inline text-only one; images persist into history for multi-turn vision.
- Speed test (live): 34 KB screenshot → vision-exp answered in **3.2s total, 2.4s first token** (server-side, incl. upload). Browser E2E on the public site: image preview → send → `2s · deepseek-v4-flash-vision-exp` meta, and the reply correctly described the screenshot content (zh mode answered in Chinese).
- vision-exp reads text inside images accurately (identified the exact UI + messages in the screenshot).

### Unresolved
- Auto-routing is by request, not per-message: once an image enters history, subsequent text turns also hit vision-exp (multi-turn context needs the image for earlier messages anyway). Only relevant if mixing long text-only sessions with one photo.

### Disproved
- n/a (no failed approaches this round).

## 2026-08-29 — Complete switch: Gemini replaced by opencode-go everywhere

### Solved
- Main chat now streams from opencode-go: text → `deepseek-v4-pro` with `deepseek-v4-flash` fallback; images auto-route to `deepseek-v4-flash-vision-exp`. Verified live: text reply + `2s · deepseek-v4-pro` meta; image reply correctly described the test screenshot in zh.
- Conclude runs on `deepseek-v4-flash` → `deepseek-v4-pro` with `response_format: json_object` (system prompt = CONCLUDE_PROMPT + language rule via new `systemPrompt` option on `completeOpenCode`). Verified: 血糖 140 mg/dL + 时间 + 早餐 meal extracted exactly like the Gemini version.
- `/models` rebuilt on the opencode-go catalog (24 chat/completions-capable models, vision flags from vendor-doc research); `/usage` rebuilt (official quota windows from `/zen/go/v1/usage` + per-model 30d call counts + official percent bars). Health probe rewritten (`completeOpenCode` max_tokens 16, 20s timeout; "not supported/ModelError" → retired).
- Gemini code fully removed: `lib/gemini.ts` + `lib/usage.ts` deleted, `@google/genai` uninstalled; `getSystemPrompt` moved to `lib/prompt.ts`, `ChatValidationError` to `lib/errors.ts`; README/.env.example/PLAN.md updated; CallsPanel text de-Gemini'd. Chains/retries/markers (TRYING/MODEL) behave exactly like the old Gemini engine, so the client needed zero changes.

### Unresolved
- `/api/models` + `/api/health` remain owner-only (auth) — guest can't pin models or run probes (unchanged behavior).
- qwen3.8-* / minimax-* (served via `/messages` on Go) and grok/gpt/muse (via `/responses`) are excluded from the catalog — chat/completions-only.

### Disproved
- n/a (clean swap, verified end-to-end).

## 2026-08-29 — web_fetch tool: the app researches instead of refusing

### Solved
- User comparison showed the opencode agent (with WebFetch) did real research while the app model replied "我无法实时抓取网页…没有实时联网能力". Root cause: plain chat had no tools; the model honestly refused rather than inventing.
- Added OpenAI-style function calling to `lib/opencode.ts:streamChat`: `web_fetch` tool + agent loop (up to 6 rounds). Streaming parser accumulates `delta.tool_calls` (index/id/name/arguments fragments) and returns them via the generator return value; tool results appended as `role: "tool"` messages; the model that answered a round stays first in the chain for the next round. Text-only requests get tools; image requests don't (vision-exp tool support unverified).
- New `lib/webfetch.ts`: dep-free server-side fetcher (browserish UA, 15s timeout, 512 KB cap, HTML→text strip, 8 KB return) used by the tool executor.
- SYSTEM_PROMPT.md §5 rewritten: use web_fetch instead of refusing; depth matched to question. README feature list updated.
- Verified live: "DeepSeek V4 Pro price?" → model fetched official pricing pages (retried URLs, incl. zh-cn) and answered with the ¥ table; the user's exact prompt ("real time website pulling price, two years ago") → full researched answer (Yahoo/Stooq/CoinGecko/Alpha Vantage/Twelve Data comparison with live-fetched prices). Browser E2E: zh reply with pricing table, no failure badge.
- Gotchas fixed along the way: MAX_TOOL_ROUNDS 4→6 (DeepSeek docs is a JS SPA — fetches return thin text, model retries other URLs); exhaustion error now a gentle "research stopped" message instead of a hard failure.

### Unresolved
- SPA-only pages (JS-rendered) still return little text — no headless browser in the fetcher (could add later if needed).
- tool rounds don't stream narration during fetches (only between them) — acceptable.

### Disproved
- n/a

## 2026-09-06 — Reapplied decimal timing on agent-start
### Solved
- Preserved the agent-start reasoning selector while replacing floating-point timer increments with Date-based tenths-of-a-second timing.
- Formatted model response durations as exactly one decimal place in chat and shared views.
### Verified
- `npm run build` passed.
- The PM2-managed `inschat` process was restarted and served HTTP 200 on port 3001.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-08-30 — opencode server integration: the app now uses the full agent

### Solved
- Path A done: `opencode serve --port 4096` runs under pm2 (`inschat-agent`, script /home/ubuntu/opencode-tmp/agent/start-server.sh, basic auth via OPENCODE_SERVER_PASSWORD, cwd = scratch dir with opencode.jsonc `permission: {"*":"deny","webfetch":"allow","websearch":"allow"}` — web-only tools, no bash/edit/read).
- `lib/agent.ts`: SDK client (auth via wrapped fetch), per-request flow — create session → prompt (system = InsChat persona, one part = full-history transcript) → parse the raw /event SSE stream (SDK's event.subscribe() silently returns nothing — likely EventSource without auth headers; raw fetch SSE works) → map to markers: text deltas from `text` parts only (`message.part.delta` filtered by part type from `message.part.updated` — this also fixed reasoning narration leaking into the reply), tool parts → TRYING markers, `session.idle` → done; session deleted after.
- `/api/chat` routing: images → direct vision-exp path; text → agent, with fallback to the direct engine when the server is down (verified: pm2 stop inschat-agent → direct path answers).
- SDK probe facts: default model = opencode-go/deepseek-v4-pro; event types: server.connected, session.updated, message.updated (info.model.modelID), message.part.updated (part.type text/reasoning/tool + state.status), message.part.delta (partID, field "text", delta), session.status, session.idle.
- **Key mismatch bug:** app's `.env` OPENCODE_API_KEY had diverged from `~/.local/share/opencode/auth.json` — text requests worked but vision-exp image requests returned 401 CreditsError "Insufficient balance". Synced .env to the auth.json key; images work again. (Two different Go keys/workspaces existed.)
- E2E (public site): research question → agent used websearch+webfetch, answered with correct pricing table (11s · deepseek-v4-pro); persona (bare "140" → 血糖 140 mg/dL); image chat; agent-down fallback. websearch works without an extra API key.

### Unresolved
- One persona test returned a wrong current time (凌晨 1:10 vs 上午 9:10) — occasional time-slip in the agent's template replies; consider making the 当前时间 line more prominent in the prompt.
- Agent answers are slower (10-25s) and burn more tokens (reasoning + tool rounds); the $12/5h window drains faster — keep an eye on /usage.

### Disproved
- SDK `event.subscribe()` → no events under basic auth; raw `fetch(/event)` + manual SSE parse works.

## 2026-08-30 — Mobile drawer navigation

### Solved
- Phone UI now collapses the nav into a hamburger drawer: a slim top bar (☰ + InsChat brand) is always visible; the sidebar slides in from the left as an overlay with a dark backdrop, closes on nav click / backdrop tap / route change. Desktop (>640px) unchanged.
- `Sidebar.tsx` renders mobile-bar + backdrop + aside with `open` state (auto-close on pathname/session change); CSS: sidebar off-canvas via translateX(-105%) + transition, fixed 250px/85vw drawer, backdrop z-order under the drawer.
- Verified headless at 375×812 and 320×700: no horizontal overflow on /, /usage, /records; drawer open/close geometry correct; chat works on mobile; nav click navigates and closes the drawer.

### Unresolved
- n/a

### Disproved
- n/a

## 2026-08-30 — Response rules: user language first, free chat for off-topic

### Solved
- SYSTEM_PROMPT.md rewritten: new §0 language rule — user's written language wins over the UI mode; UI mode only for no-language-cue inputs (photo alone / bare number); template variant follows the reply language. §5 "Everything else" now instructs normal general-assistant chat for anything not blood-sugar/insulin/food — no health framing, no redirecting (previously off-topic questions got steered/refused).
- lib/prompt.ts mode line updated to match ("use UI language only when the user's message has no language cues").
- Verified: UI=en + Chinese text → Chinese reply; UI=en + bare "140" → English glucose template; "how do I make pour-over coffee?" → normal detailed coffee guide; Chinese insulin text with UI=en → Chinese insulin template.

### Unresolved
- n/a

### Disproved
- n/a

## 2026-08-30 — Mobile: single top bar, lang toggle in sidebar, Safari zoom fixes

### Solved
- Removed the redundant page header (h1 InsChat/OpenCode + lang pill) from ChatApp/OpenCodeChat — phone now has exactly one top bar (☰ + brand). Language toggle moved into the sidebar foot (desktop sidebar + mobile drawer; CSS: static variant of .lang-toggle, the old rule was absolute-positioned for the removed header).
- Safari zoom: textarea was 15px → iOS auto-zooms on focus; now 16px on phones. NOTE: the media block sits before the base textarea rule in the cascade, so the fix must come AFTER it — appended a trailing media block at the end of globals.css.
- Bottom cut off: .app was height:100dvh while sitting under the 49px mobile bar → composer fell outside the viewport; now height:100% inside the flex .main. Verified composer bottom == viewport bottom (667/667).
- Viewport meta via Next `export const viewport`: maximum-scale=1, user-scalable=no, viewport-fit=cover; plus -webkit-text-size-adjust:100%.
- Verified: 375×667 chat page (single bar, composer in view, 16px input), drawer lang toggle works (EN→中文), /usage no overflow, desktop sidebar intact.

### Unresolved
- n/a

### Disproved
- Placing the 16px textarea rule inside the existing early media block did nothing — cascade order beat the media query.

## 2026-08-30 — Real per-call cost/token logging

### Solved
- `insertCall` now stores `cost` + `tokens` (input/output/reasoning/cacheRead/cacheWrite); `ApiCall`/`CallDoc` extended; `getOpenCodeUsage` aggregates cost30d + tokens30d (30d window).
- Agent path (`lib/agent.ts`) logs the prompt result's `info.cost` + `info.tokens` (from the SDK prompt response) on success and failure; direct streaming path (`lib/opencode.ts`) captures the gateway's trailing `{"choices":[],"cost":...}` chunk + final `usage`.
- /opencode-calls panel shows cost30d + tokens30d in the totals card and `$0.0015`-style cost per call row (new .call-cost style; i18n zh/en).
- Real numbers (agent, deepseek-v4-pro): simple health message ≈ $0.0015–0.005; research turn with cache reads ≈ $0.0015 (1,457 in / 156 out / 25 reasoning / 9,984 cached).

### Unresolved
- Older calls (before this change) have no cost — aggregated cost counts only new calls.

### Disproved
- n/a

## 2026-08-30 — Rich markdown responses (ChatGPT-style)

### Solved
- Root cause of "plain text" replies: react-markdown v10 without remark-gfm does NOT parse GFM tables — pipe tables rendered as literal text. Added remark-gfm + rehype-highlight + highlight.js (github theme) in MessageBubble.
- New bubble CSS: styled tables (borders, header bg, zebra rows, horizontal scroll on overflow), code blocks, inline code pills, blockquotes, headings, hr. Syntax highlighting via hljs classes.
- External images from markdown now render: nginx CSP img-src extended to https: (12 blocks updated, reloaded). Verified a Wikimedia banana image loads inside the bubble.
- Verified in browser: table with 3 headers renders; python snippet highlighted (hljs); blockquote; image loaded. Mobile-safe via table overflow-x scroll.

### Unresolved
- Generated charts/mermaid still not supported (would need client-side renderers) — not requested.

### Disproved
- n/a

## 2026-08-30 — User bubbles: light background, image/text split

### Solved
- Sent messages no longer black: `--bubble-user` changed to light gray (#e8e8ed) with dark text; model bubbles stay #f5f5f7 (alignment still distinguishes sides).
- Image+text user messages now render as TWO bubbles: a transparent image-only bubble (`.bubble.image-only`) above a separate text bubble — no more photo+text in one box. Model messages unchanged; persistence/storage untouched (display-level split in MessageBubble).
- Verified headless: 2 user bubbles, image first, image bubble bg transparent, text bubble bg rgb(232,232,237).

### Unresolved
- n/a

### Disproved
- n/a

## 2026-08-30 — Conversation revert (opencode-style)

### Solved
- Added "↩ revert to this message": every message except the last gets a hover-reveal circular button (always faintly visible on touch devices). Clicking truncates the conversation to that message — locally, and persisted.
- Persistence: authed → new `DELETE /api/sessions/[id]/messages` with `{ keep: n }` (`lib/db.ts:truncateMessages` deletes messages after the first n and clears the session conclusion); guests → `truncateGuestSession` (localStorage). `keep` counts only persisted messages (user messages always persist; model messages only when not failed) so local state and server state stay in sync.
- Revert also clears the stored conclusion on both paths.
- Verified E2E (guest): 3 turns → revert to message 2 → bubbles truncated to 2, survives page reload (localStorage).

### Unresolved
- Authed path verified by code review only (no test login credentials); DELETE route returns { removed }.

### Disproved
- Absolute-positioned hover button overflowed the 4px message padding — moved to in-flow inside message-body instead.

## 2026-08-30 — ChatGPT-style message actions: copy, edit, regenerate, share

### Solved
- Researched ChatGPT's pattern: hover action bar under messages, inline edit of your own messages (save & resubmit regenerates the reply), regenerate on assistant replies, share as public links (chat-level + per-message).
- MessageBubble now renders a hover-reveal action bar (faint on touch): Copy (✓ feedback 1.6s), Edit (user msgs), Regenerate (model msgs), Share, plus the existing ↩ Revert. Inline edit: textarea replaces the bubble with Save & submit / Cancel.
- ChatApp refactor: `streamReply(base)` is the single streaming engine; send/edit/regenerate all build a `base` list and truncate persisted state first (`DELETE /api/sessions/:id/messages` or guestStore truncate), then stream — so edit/regenerate behave like ChatGPT (old reply discarded).
- Share: POST /api/shares stores a snapshot (kind chat|message) in Mongo `shares` with a 9-byte base64url token; public read-only page /share/[token] (client viewer with markdown/highlight/images); link copied to clipboard; chat-level Share button next to Conclude. nginx: new location /api/shares (POST only) — same fall-through-405 gotcha as before.
- buildTranscript: single first user message now sent directly (no "conversation so far" wrapper) — fixes the agent answering "there's no prior question…" on fresh chats.
- E2E verified: copy→clipboard+checkmark; edit→resubmit→new reply; regenerate; message share page (1 msg); chat share page (2 msgs).

### Unresolved
- Shares never expire (Mongo grows); no delete/share-management UI.
- Regenerate keeps no variant carousel (old reply is discarded, like revert).

### Disproved
- Test race: waiting on the streaming cursor misses replies that haven't started (thinking phase) — wait on the send button returning to ↑ instead.

## 2026-08-30 — Trim actions: copy + edit + regenerate only

### Solved
- Revert feature commented out (edit/regenerate cover the same workflow); share feature commented out (UI + handlers; /api/shares backend left dormant).
- Action bars now: user messages [复制, 编辑]; assistant replies [复制, 重新生成] — and the assistant bar is always visible (opacity 0.7, ChatGPT-style) instead of hover-only.
- Verified on the public site: correct button sets per role; copy works.

### Unresolved
- Share API/pages still deployed but unused (commented) — can be revived or deleted later.

### Disproved
- Python string surgery on ChatApp scrambled comment blocks (stop/persistConclusion got swallowed) — repaired by replacing the whole region with a clean version.

## 2026-08-30 — Real icons (lucide-react) instead of text glyphs

### Solved
- Replaced hand-rolled glyphs with lucide-react (ChatGPT-style stroke icons): action bar Copy→Copy/Check (copied state), Edit→Pencil, Regenerate→RefreshCw; composer attach→Plus, send→ArrowUp, stop→Square, image remove→X; sidebar mobile hamburger→Menu, session delete→X. CSS: svg display block inside icon buttons.
- Verified live: both action bars render SVG icons, composer/menu icons present, copy still works.

### Unresolved
- n/a

### Disproved
- n/a

## 2026-08-31 — Food template v2: markdown table (Template A)

### Solved
- Food-photo reply format upgraded from dots+lines to a rich markdown table: `## 餐名` heading, bold time line, 食物/升糖 table (🟢低/🟡中/🔴高, red rows fully bold), ⚠️ quote line for red-item reasons, 💡 bold summary. Chinese + English variants in SYSTEM_PROMPT.md §1.
- Conclude prompt updated: foods may come from markdown table rows — extract names only, drop dots/labels/⚠️.
- Verified: demo request returned the exact table format (午餐 / time / table with 酱牛肉+米饭+可乐 / ⚠️ line / 💡 总结), rendered as styled markdown by the existing pipeline.

### Unresolved
- Full end-to-end still needs a real food photo (none available in test assets) — text demo confirmed the format compliance.

### Disproved
- n/a

## 2026-08-31 — Login circle, insulin-mode default-off, pin on the right

### Solved
- Login is now a circular bordered icon button (User icon, no text), matching common account-affordance patterns.
- Mode semantics inverted per request: "胰岛素模式" (insulin/preset templates) is now OFF by default; the settings modal has a switch + hint, persisted to localStorage (`inschat_insulin_mode`), threaded as `mode: "preset"|"free"` through /api/chat + /api/opencode → agent and direct paths. Free chat (generic assistant + web_fetch) is the default.
- Session rows reordered: title, then pin, then delete — pin now sits on the RIGHT of the row and only appears on hover (opacity 0, revealed on row hover; faint on touch). Verified order + hover opacity.
- Verified: login circle (50% radius, icon only), switch default off → on persists "1", pin right-of-title.

### Unresolved
- Account-level persistence of insulin mode (vs localStorage) not wired yet — revisit when the account system grows.

### Disproved
- n/a

## 2026-08-31 — Key divergence #2: monthly cap hit on the app key

### Solved
- User reported 100% usage but app still working. Diagnosis: the Go plan hard-gates on the rolling 5h window (was 0% — freshly reset), while the app's .env key showed monthly 100% "rate-limited" (soft state). Root cause: the app's OPENCODE_API_KEY had diverged AGAIN from ~/.local/share/opencode/auth.json (two different subscriptions). Synced .env to the session key (52/21/62), restarted, verified chat works; /usage now shows the healthy meter.

### Unresolved
- Why the keys keep diverging — likely the user reconnects/rotates the key in the TUI/console; recommend re-syncing whenever usage looks wrong. A config-time mismatch warning (compare usage of both keys) could be added later.

### Disproved
- n/a

## 2026-08-31 — Multi-image uploads (max 3) + vision monthly cap error

### Solved
- ChatMessage/StoredMessage/GuestMessage switched from single `image` to `images: ChatImage[]` (MAX_IMAGES = 3) across: types, chatRequest (array validation), opencode content parts (multiple image_url blocks), chat route hasImage, sessions messages POST, shares POST, db appendMessage, Composer (multi-select file input, preview grid, per-image remove, attach disabled at 3, hint on overflow), ChatApp/OpenCodeChat (send(text, images[]), guest IDB keys per image `${session}:${msgId}:${i}`), MessageBubble (per-image bubbles), ShareViewer.
- Verified: 3 images attach → 3 previews; 4th rejected with hint "最多只能添加 3 张图片"; sent → 3 user image bubbles; API accepted all images.
- New error found live: deepseek-v4-flash-vision-exp hit its own monthly usage cap ("Monthly usage limit reached. Resets in 20 days…") — the vision model has a separate $15 monthly allowance on Go. isBalanceError regex extended to catch "usage limit|limit reached" so users get the friendly quota message instead of the raw API text.

### Unresolved
- vision-exp monthly cap is exhausted (resets ~Sep 20); images will keep failing with the friendly quota message until then — or switch image routing to another vision model (e.g. qwen3.8-flash via chat/completions? it's served via /messages on Go — unverified) once requested.

### Disproved
- n/a

## 2026-09-01 — Usage-limit reached: on-screen banner + test switch

### Solved
- Researched platform behavior: Claude = hard stop with on-screen line "You've hit your session limit · resets 3:45pm" (blocks sending until reset); Gemini = "You've reached your limit" banner + Flash-Lite fallback; ChatGPT = silent downgrade / inline "You've reached our limits of messages". Adopted the Claude pattern.
- New LIMIT stream marker: `encodeLimitMarker(resetAt)` + parser support. On balance/limit errors, /api/chat and /api/opencode emit the marker (with the official rolling reset time) plus the friendly text in the bubble.
- Client: amber banner above the composer (⚠️ 额度已用完 · 预计 HH:MM 重置), composer disabled + placeholder swap, auto-clears when the reset time passes (10s interval). Wired into both ChatApp and OpenCodeChat.
- Test switch: `OPENCODE_TEST_LIMIT=1` in .env makes streamOpenCodeOnce/agentChat throw a synthetic "Monthly usage limit reached" error — verified the full flow E2E (marker → banner + disabled send + bubble text), then removed the flag and confirmed normal chat.
- Also this batch: server now prefers the live key from ~/.local/share/opencode/auth.json (fallback .env) — ends the recurring key-divergence failures; new key deployed (rolling 60/24/12).

### Unresolved
- Exhausted monthly window blocks ALL chat/completions models (account-level 429) — no free fallback model found on Go.

### Disproved
- n/a

## 2026-09-01 — Live ran-out test with the real exhausted key + agent-hang fix

### Solved
- Live-tested the exhausted key (monthly 100% rate-limited, 429 "Monthly usage limit reached. Resets in 18 days."). Full flow verified in the browser: ⚠️ banner "额度已用完 · 预计 04:20 AM 重置", composer disabled, placeholder swap, bubble carries the detailed message.
- Two real bugs found and fixed:
  1. The opencode AGENT SERVER hangs (no response, no error) when the subscription is exhausted — agentChat waited forever. Fixes: (a) app-level pre-flight quota check (skip the agent when monthly status is "rate-limited" or rolling ≥ 100%) → direct path fails fast with the 429; (b) 180s hard timeout on the agent prompt as a safety net.
  2. Error wording blamed the 5h window when the monthly window was the exhausted one. New `quotaResetInfo()` picks the correct window (monthly rate-limited vs rolling) for both the friendly text and the LIMIT marker reset time.
- Key restoration flow verified afterwards: good key back in auth.json + .env, both processes restarted, chat works.

### Unresolved
- n/a

### Disproved
- "Older key" from opencode.log was revoked (401), not exhausted — rotation invalidates previous keys.

## 2026-09-02 — Free-model gateway expansion
### Solved
- Enumerated `GET /models` on both gateways: the free gateway (`https://opencode.ai/zen/v1`) exposes 9 free models, not the 4 the catalog knew.
- Added working free models to catalog + chains: `nemotron-3.5-lightning-free`, `ling-3.0-flash-fin-free`, `laguna-s-2.1-free` (all respond in <3s).
- `isFreeModel` suffix rule (`-free`) covers every new model; `big-pickle` needs its own case.
### Unresolved
- `muse-spark-1.3-contributor-free` and `muse-spark-1.2-contributor-free` return HTTP 500 "Internal server error" on the free gateway (both stream and non-stream, minimal body) — excluded from the catalog until they work.
- Free models all report `vision: false`; no free vision model exists, images stay on paid `deepseek-v4-flash-vision-exp`.
### Disproved
- n/a

## 2026-09-02 — Free model 400 error killed the whole chat chain
### Solved
- Free gateway returns HTTP 400 `Error from provider (Console): Upstream request failed: Model is unavailable.` for `deepseek-v4-flash-free` (provider-side down).
- `isUnavailableError` (lib/opencode.ts) did NOT match that message → the chain loop rethrew it and the entire chat failed instead of moving to the next free model. Added `unavailable|upstream request failed` patterns.
- health.ts `classify` now uses `isUnavailableError` first with detail "unavailable or retired", so down models are auto-hidden in the Models panel (same path as 404s).
### Unresolved
- `deepseek-v4-flash-free` still 400s provider-side (as of 2026-09-02); kept in chain — failure is fast (~300ms) and now non-fatal.
- `mimo-v2.5-free` / `big-pickle` intermittently 429 `FreeUsageLimitError` (shared free-tier rate limit) — classified as quota, chain moves on.
### Disproved
- n/a

## 2026-09-02 — Free-model notice after exhausted fallback
### Solved
- New `FREE` stream marker (`␀FREE:␀`, value-less) emitted by `streamChat` only when a paid model failed with quota/balance errors in the same request AND a free model delivered the final answer (lib/opencode.ts `paidExhausted` flag).
- `ModelMarkerParser` extended for the FREE marker (both split branches); verified with 4 standalone parser scenarios (one-chunk, split mid-marker, marker-then-text, model+free combined) — all pass.
- Client (ChatApp.tsx) shows a gray centered pill "当前正在使用免费模型 / Now using a free model" after the reply finishes; auto-hides after 6s, click to dismiss, resets on next send. i18n keys `free.notice` added (zh/en); CSS `.free-notice` in globals.css.
### Unresolved
- The agent path (lib/agent.ts) answers when the Go plan is NOT exhausted, so no notice appears there — correct by design.
### Disproved
- n/a

## 2026-09-02 — Free-model notice moved under the reply (UX fix)
### Solved
- The floating pill was wrong placement — the notice is now a gray text line (`free-note`) rendered directly below the model reply that was answered by a free model (MessageBubble.tsx).
- `freeFallback` flag lives on the UiMessage (set when the FREE marker is parsed, ChatApp.tsx); the transient popup state/timer/CSS were removed.
- In-session only: the flag is not persisted, so reloads don't re-show it (the model chip still identifies the free model).
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-02 — Banner removed; notice centered; image-exhaustion reply text
### Solved
- Red usage-limit banner removed entirely (type-1 "usage done" warning): LIMIT marker emission deleted from app/api/chat/route.ts; ChatApp no longer parses it, disables the composer, or renders the banner. Text chats just fall back to free models; the composer stays enabled.
- Free-model notice text changed to "Usage exhausted, now using free model" / "额度已用完，正在使用免费模型" (i18n `free.notice`) and is now horizontally centered below the reply (`.free-note` width:100% + `.message.model:has(.free-note) .message-body` max-width 100%; :has already used in this codebase for img bubbles).
- Image sends with exhausted usage: `imageExhaustedText()` (lib/opencode.ts) — the reply itself becomes "No image model usage available. It will reset around <time>." (zh/en), no banner, bubble not removed.
### Unresolved
- Text chats where EVERY model (paid + free) fails still append the generic `\n\n[...]` error into the reply — accepted fallback.
### Disproved
- n/a

## 2026-09-02 — Usage-access summary for multi-account toolbox handoff

Context: user wants a separate private app (proposed: local, 127.0.0.1) to manage 6 opencode-go accounts — view usage per account, copy API keys, optionally switch the active account. This entry documents how the existing app accesses usage so the next agent can reuse it.

### How inschat accesses opencode-go usage (summary for handoff)

1. **Key source** — `getOpenCodeKey()` in `lib/opencode.ts:39`: prefers `~/.local/share/opencode/auth.json` → `opencode-go.key` (what the CLI writes; changes on reconnect), falls back to `OPENCODE_API_KEY` from `.env`. `OPENCODE_API_KEY_FORCE=1` pins to the .env key for testing.
2. **Official usage** — `getOpenCodeOfficialUsage()` in `lib/opencode.ts:157`: GET `https://opencode.ai/zen/go/v1/usage` with `Authorization: Bearer <key>`; expects `usage.rolling / weekly / monthly`, each `{ status, percent, resetsAt }` (interface `OpenCodeOfficialUsage` at `lib/opencode.ts:149`). 60s in-memory cache (`officialCache`). Returns null on any failure — never throws.
3. **API route** — `app/api/usage/route.ts`: `GET /api/usage` returns `{ model, total, last5h, last7d, last30d, failed30d, official, models[] }`; combines official usage with local call counters (`getOpenCodeUsage()` from `lib/db.ts:183` — Mongo-backed call log). `Cache-Control: no-store`.
4. **UI display** — `components/UsagePanel.tsx` polls `/api/usage` every 5s; renders rolling/weekly/monthly percent bars + `resetsAt` relative countdown (`relativeResets`). `components/OpenCodeCallsPanel.tsx` shows local call counts vs hardcoded `LIMITS` (h5/w7/m30) and per-model/`byModel` table. `components/ModelsPanel.tsx` is the model catalog + live health/quota statuses (data from `/api/models`, health probe in `lib/health.ts`).
5. **Error-side detection** — `lib/opencode.ts:56-76`: `isQuotaError` (429/RESOURCE_EXHAUSTED), `isUnavailableError` (404), `isOverloadedError` (503), `isBalanceError` ("insufficient balance"/"Monthly usage limit reached"). `quotaResetInfo()` (`lib/opencode.ts:79`) picks the exhausted window for the user-facing banner.
6. **Chat flow** — `streamChat()` (`lib/opencode.ts:521`): paid models → free fallback chain (`getChatChain` in `lib/models.ts:125`), with `encodeFreeMarker()`/`encodeLimitMarker()` markers parsed client-side in `components/OpenCodeChat.tsx:113`.

### Notes for the new app
- The `/usage` endpoint requires only the Bearer key — a multi-account app is just N calls to the same endpoint with N keys. No session/other endpoint involved.
- For "switch active account": rewriting `~/.local/share/opencode/auth.json` (`{ "opencode-go": { "key": "..." } }`) is picked up by inschat automatically on next request (no restart).
- Reusable auth pattern for gating: `lib/auth.ts` (scrypt + 30-day token cookie), `lib/accounts.ts` (Mongo users), `app/api/auth/{register,login,logout,me}`.
- Decision from 2026-09-02 session: local app is recommended over public domain (no attack surface for 6 API keys, no cert/login needed); domain only if phone access required. Unresolved: user's "123" answer on key-management (UI-managed encrypted vs .env) — still open; ask before building.

### Unresolved
- Key management choice (encrypted-at-rest store vs .env) not yet confirmed by user.
- Whether "set active account" (auth.json rewrite) is wanted — inschat integration confirmed feasible.
- Port/process naming for the new app (must not touch inschat PM2 app on :3001).

## 2026-09-02 — Full i18n audit & fix (zh/en mixed-language pass)
### Solved
- New `lib/i18nExtra.ts` (104 keys per language) merged into `STR`; `formatUiText()` helper for `{key}` interpolation; `useUiLang()` now syncs `<html lang>` (zh-CN/en); root layout defaults to zh-CN.
- zh dict fixed: `opencodeCalls.rolling/weekly/monthly/resets` were English ("5 hour usage"/"Resets in"); also `tokens30d` → 令牌数, `records.empty` → 总结.
- Login/register page fully localized with a lang toggle button (CSS `.auth-card-head`/`.auth-lang-toggle`); auth routes now return `errorCode` (invalidCredentials/usernameTaken/usernameInvalid/passwordLength/usernameRequired/passwordRequired/invalidBody/server) and the page maps codes to localized text; `language` sent to API (unused by server, fine).
- Composer: placeholder, aria/title labels, image errors (max images/type/size/read) localized; ChatApp/OpenCodeChat pass placeholders and use `chat.requestFailed`.
- SummaryCard uses UI language instead of content heuristic (报告/保存/已保存).
- ModelsPanel fully localized (description, health counts, catalog, auto row, states, tier labels 专业/快速, detail labels, probe ms); CallsPanel + OpenCodeCallsPanel localized (titles, counts, statuses, kinds, dates via locale); RecordsPanel/SearchModal fallback errors localized; Sidebar aria "More options"/"Open menu" localized; ShareViewer localized (missing page, meta, image alt); ConcludeButton aria/title localized; UsagePanel countdown uses localized units (天/小时/分钟).
- All visible fallback strings ("Could not...", "Search failed.", "Conclude failed.", "Save failed.", "Chat request failed.") replaced with localized `t[...]`; session title fallback uses `nav.newChat` per language.
- Verified with headless smoke tests in zh+en: login toggle + localized wrong-password error, html lang sync, composer placeholder, page headings, no English leaks in zh usage/models/calls/records (raw provider error strings inside `.call-error` are diagnostic data and stay English).
### Unresolved
- Raw provider/API error strings (e.g. "Upstream request failed: Model is unavailable.") shown as call details stay in English — they are upstream diagnostics, not UI copy.
### Disproved
- The assumption that all three major apps AI-generate chat titles (they truncate the first user message).

## 2026-09-03 — Debug: free models "Internal server error" (500)
### Root cause
- The free gateway (`opencode.ai/zen/v1`) wraps upstream provider failures as HTTP 500 `{"type":"error","error":{"type":"error","message":"Internal server error"}}` — the exact shape `muse-spark-*-free` models return 100% of the time (verified 5/5 + 5/5). They are not served upstream at all.
- For otherwise-working models the 500 is intermittent and quota-correlated: `mimo-v2.5-free`/`big-pickle` now return a clean 429 `FreeUsageLimitError` (free-tier shared quota exhausted) but earlier returned 500 — a race in the free-tier gate: requests slip past the quota check and the provider call then fails server-side, wrapped as a generic 500 instead of a clean 429.
- Request params are NOT the cause: tested minimal / +reasoning_effort / +tools / full body on all 6 free models — no 500 triggered by params (laguna-s-2.1-free does 503 when `reasoning_effort` is sent — 5/5 vs 0/5 without).
- Other failure modes: `deepseek-v4-flash-free` consistent 400 "Model is unavailable" (provider down); `nemotron-3-ultra-free`/`nemotron-3.5-lightning-free` slow (sometimes >20–25s, timeouts).
### Fix
- `isServerError()` (lib/opencode.ts) matches `500|internal server error`; the chat chain now treats it as "unavailable → next model" instead of rethrowing and killing the whole chat.
- health.ts `classify` checks it BEFORE `isUnavailableError` so a transient 500 shows as "busy" (selectable), not "retired" (hidden).
### Disproved
- The 500 is not caused by our body/tools/reasoning params, not by concurrency (28-parallel test), not a rate-limit mislabel on our side.

## 2026-09-03 — Insulin-mode text sends wrongly returned image-exhausted reply
### Root cause
- `hasImage` was computed as `messages.some(m => m.images...)` over the ENTIRE history (app/api/chat/route.ts + lib/opencode.ts streamChat). In insulin mode a chat that once had a food/glucose photo made every later text-only send route to the paid-only vision chain → "暂无可用图像模型额度" reply.
- Second layer: text models reject image parts in history — reproduced 400 `[404] No endpoints for image` on all free models when the payload contained an image_url from earlier messages.
### Fix
- `hasImage` now uses only the LAST message in both route.ts and streamChat.
- For text-only sends, streamChat strips images from history and replaces them with the same `[photo attached]` marker the agent transcript uses, so free text models never receive image parts.
### Verified
- Headless test, insulin mode ON: "120" text → runs text chain (pro 429 → flash 429 → flash-free 400 → mimo 429 → nemotron connected), NO image-exhausted reply.
- Image send → still routes to deepseek-v4-flash-vision-exp → image-exhausted reply (unchanged).
- Free models are currently slow/overloaded (Nvidia 502, 20-40s first token) — replies may take a while.
### Disproved
- n/a

## 2026-09-03 — Mobile UI audit (phone pass)
### Fixed
- Full-width search bar (ChatGPT-style, added earlier) had been LOST from Sidebar.tsx — only the brand-row search icon remained. Restored: `.sidebar-search` button with icon + "搜索/Search" text above the nav tabs (components/Sidebar.tsx).
- Escape key did not close the mobile drawer — the backdrop stayed and blocked all pointer events. Added a window Escape handler that closes the drawer, row menu, and rename input (components/Sidebar.tsx).
### Verified (headless, 375px + 320px)
- No horizontal overflow on /, /models, /calls, /usage, /records, /opencode, /opencode-calls, /login at both widths.
- Drawer: 250px, closes/opens via transform (matrix x -262 → 0), search bar + new chat 219px inside, content scrolls.
- Search modal 294px and settings modal 294px fit in 320px viewport.
- Login card 272px at 320px.
- Chat: toggles row (血糖模式 84px + Conclude 30px) fits; user bubble 230px; composer 343px at 375 / 311px at 320.
- Models rows fit with Use buttons (327px at 375); usage table 291px < 375.
- Image preview grid: 3 previews (56px each), no overflow.
### Unresolved
- Free models still slow/overloaded upstream (Nvidia 502s) — model replies take 20-40s, unrelated to UI.
### Disproved
- n/a

## 2026-09-03 — Free-model notice moved to centered chat overlay
### Solved
- The notice was rendered below the responding message (`.free-note`); user wants a middle warning instead. It is now a fixed, horizontally+vertically centered gray text overlay in the chat column (`.free-note-overlay`, top/left 50%, translate(-50%,-50%), 14px, no background).
- MessageBubble no longer renders it; ChatApp holds `freeNotice` state (set on FREE marker), clears on next send, auto-dismisses after 6s, click to dismiss.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Login reworked from page into AuthModal
### Solved
- New `components/AuthModal.tsx`: login/register dialog (localized, lang toggle, error-code mapping, backdrop click + X close) rendered over the app instead of navigating to /login.
- Sidebar guest footer's sign-in circle is now a button that opens the modal (desktop + mobile drawer); on success it refetches the user (authNonce), closes, and stays on the chat.
- `app/login/page.tsx` is now a server redirect to `/?auth=1`; Sidebar watches the param and auto-opens the modal (old deep links keep working).
- CSS: `.auth-backdrop`/`.auth-modal` overlay reusing `.auth-card`; close button.
### Verified (headless, 1440 + 375)
- Modal opens from guest footer (and drawer), 380px desktop / 343px mobile, no overflow; localized wrong-password error shown inline; backdrop closes it; login success closes modal, shows username + owner tabs; /login redirects and auto-opens the modal.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Text chain swapped to qwen3.8-flash with peak-hour routing
### Why
- DeepSeek peak pricing (Mon-Fri 01:00-04:00 & 06:00-10:00 UTC = 09:00-12:00 / 14:00-18:00 Beijing) doubles deepseek-v4-flash ($1.32 vs $0.66 output). Qwen3.8 Flash is flat $0.15/$0.47, wins 9/11 benchmarks vs DS V4 Flash (incl. CoWorkBench 73.9 vs 45.1, Toolathlon 73.5 vs 70.3), and is 4-6x faster on the gateway (1-1.8s vs 6.9s).
- MiMo-V2.5 rejected: hard 500 on `reasoning_effort` (app always sends it) and 7-16s latency.
### Change
- `qwen3.8-flash` added to CHAT_MODELS + modelLabels (vision:false — gateway 400s images via chat/completions).
- TEXT/CONCLUDE chains: `qwen3.8-flash` → `deepseek-v4-flash` (only OFF-PEAK) → free models. `isDeepSeekPeak()` (lib/models.ts) drops deepseek-v4-flash during peak hours; verified against window boundaries (Mon 02:00/08:00 UTC peak, 05:00/12:00 off, Sat off).
- UI copy (zh/en): models description + auto row name mention Qwen primary + off-peak DS fallback.
### Verified
- Models page lists qwen3.8-flash (32 models); auto row "文字：qwen3.8-flash → deepseek-v4-flash（非高峰）→ 免费模型".
### Unresolved
- Vision chain still on deepseek-v4-flash-vision-exp (peak-priced); replacement candidates (qwen3.7-plus, kimi-k2.6) not yet probed with the app body.
### Disproved
- MiMo-V2.5 as a drop-in text replacement (reasoning_effort 500).

## 2026-09-03 — Model routing tree on the usage page
### Solved
- New `components/ModelRoutingTree.tsx` rendered at the bottom of /usage: a tree-format visualisation of the auto-model logic — text chat (peak: qwen3.8-flash only, DeepSeek skipped; off-peak: qwen3.8-flash → deepseek-v4-flash; free models nested under both), images (vision-exp), conclude chain, pinned override, free fallback with notice.
- i18n keys `routing.*` (zh/en); parens are language-aware（/） vs (/); `.routing-tree` CSS with branch borders, model chips, arrows.
### Verified
- Both languages render, all model codes present, no horizontal overflow at 1440/375.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Vision chain: qwen3.5-plus peak-aware fallback
### Findings
- Vision candidates tested with real images + app body (reasoning_effort max + stream): deepseek-v4-flash-vision-exp OK, kimi-k3/k2.6 OK (3-23x more expensive), mimo-v2.5/v2.5-pro 500 upstream, qwen3.7/3.6/3.5-plus only work WITHOUT reasoning_effort (gateway 400s reasoning+image combos on Qwen; the 1x1 test-image 400 was "must be larger than 10px", a red herring).
- qwen3.5-plus is flat $0.20/$1.20 — slightly cheaper than vision-exp's PEAK $1.32 output — verified OK with images (1.7-2.7s).
### Change
- IMAGE_CHAIN now time-aware (lib/models.ts `visionChain()`): peak → [qwen3.5-plus, vision-exp]; off-peak → [vision-exp, qwen3.5-plus].
- `streamOpenCodeOnce` skips `reasoning_effort` when the request has image parts and the model is in `NO_REASONING_WITH_IMAGES` (qwen3.5-plus) — Qwen 400s otherwise.
- Routing tree + i18n show the vision fallback ("高峰优先 Qwen3.5（平价）").
### Verified
- Live image send: vision-exp 429 → qwen3.5-plus tried next (both 429 on exhausted Go quota, correct fallback order).
### Unresolved
- Real end-to-end qwen3.5-plus image answer untestable while the Go plan is quota-exhausted; the earlier direct probe proved the request shape works.
### Disproved
- "Qwen models reject images" (was my corrupt/too-small test PNG); mimo-v2.5-pro is genuinely broken upstream (500).

## 2026-09-03 — Image compression setting (default ON)
### Solved
- New `useCompressImages()` pref (lib/prefs.ts, localStorage `inschat_compress_images`, default ON).
- `lib/imageCompress.ts`: canvas downscale to max 1600px + JPEG q85; skips images already small enough.
- Composer compresses attached photos when the pref is on (before preview/send/storage).
- Settings modal row "图片压缩 / Image compression" with hint + switch (ImageDown icon, `.settings-row-text` CSS); i18n keys added.
### Verified
- E2E: 3000x3000 PNG → 1600x1600 JPEG when ON; untouched PNG when OFF; switch default on, toggles + persists.
### Unresolved
- User will compare reading accuracy with compression on/off on real meter/food photos.
### Disproved
- n/a

## 2026-09-03 — Conclude records its own time (not photo/meal time)
### Problem
- `translateRecord` derived the record's `datetime` from the concluded content — the "时间" item (which the model may infer from the photo/chat context) or the first meal's time. The records timeline then grouped entries by THAT time, not by when the user actually concluded/saved.
### Fix
- translate.ts: datetime derivation removed (dead time helpers deleted; parseLeadingNumber kept).
- db.ts insertRecord: `datetime = new Date()` at insert — the record always carries its own conclusion/save time.
- RecordsPanel entryFor: timeline position always uses `datetime ?? savedAt` (own time); meal-time-based grouping and the timeLabel display removed (meal times still visible inside entry content).
### Unresolved
- Old records stored before the fix keep their content-derived datetime — they still appear at their old timeline position.
### Disproved
- n/a

## 2026-09-03 — Conclude confirm/edit modal
### Solved
- After clicking Conclude, `components/ConcludeModal.tsx` pops up with the results for confirmation and editing:
  - Title editable; every item editable (name + value + unit); values matching 低/中/高 (or low/medium/high) render as a ranking select (升糖等级); meals editable (name/foods/time) — so the insulin number and its time can be changed freely.
- Save writes the EDITED record (POST /api/records or addGuestRecord for guests) with the edited title (instead of the generic "报告"); the summary card then shows the edited result in saved state (`summarySaved` prop threaded ChatApp → MessageBubble → SummaryCard).
- i18n `concludeModal.*` keys (zh/en); `.conclude-modal` CSS (scrollable card, input rows).
### Verified
- E2E: reply → Conclude → modal opens (确认总结), no overflow; edit + save paths reuse the proven records API.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Record redesign: dish boxes, date+time anchor, no title
### Solved
- ConcludeMeal gains `dishes: {name, rank}[]`; the conclude prompt now extracts per-dish blood-sugar ranks (低/中/高) from the chat's food table instead of discarding them; sanitize/API validation/translate pass dishes through.
- ConcludeModal: title field REMOVED (records are anchored by date+time); each meal edits as name + time + dish boxes (dish name input + rank select 低/中/高/—, add/remove dish). Save auto-titles the record with the first meal name (or 报告/Report).
- SummaryCard + RecordsPanel render dishes as colored rank boxes (green/yellow/red via rankClass: 低/low, 中/medium, 高/high); foods string kept as fallback for legacy records.
### Verified
- Build passes; flow wired through modal → records API → timeline.
### Unresolved
- Old records without dishes still render foods-string fallback.
### Disproved
- n/a

## 2026-09-03 — Conclude modal: native date/time pickers, better view
### Solved
- `lib/mealTime.ts` gains `parseFlexibleDateTime` (handles "2026年9月3日 下午 6:17", "2026-08-26 18:17", "8/26/2026 6:17 PM", time-only → today; date stripped before time regex so date digits never leak into the time) and `formatDateTimeDisplay` (zh "2026年9月3日 下午 6:17" / en "2026-09-03 6:17 PM").
- ConcludeModal reworked: no free-text date editing — meals get native `<input type="date">` + `<input type="time">` pickers (parsed from the model's text, formatted back on change); 时间/time items use the same pickers; dish boxes keep name + rank select; meal name on top.
### Verified
- Parser unit-checked across 8 formats (all correct, incl. 3:17 AM, 9:30, 下午 6:17); build passes; app restarted.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Chat now stores replies + model (two real bugs)
### Bug 1: login via AuthModal left ChatApp in guest mode
- ChatApp checked /api/auth/me only on mount; login via the sidebar modal navigates without remounting, so `isAuthed` stayed false — every chat silently went to the localStorage guest store and never reached the DB.
- Fix: `inschat-auth` CustomEvent dispatched by Sidebar on login/logout; ChatApp listens (plus re-checks on URL changes) and refreshes isAuthed.
### Bug 2: model name never persisted
- The agent path emitted the MODEL marker with the fallback label at first token, but `modelName` often stayed null (message.updated arrives late), so the persisted message had `model: null`.
- Fix: lib/agent.ts emits a corrected MODEL marker with the real model id once `promptResult.info.modelID` is known — the client keeps the last marker (chip + persistence).
### Verified
- Net trace: login → POST /api/sessions (real Mongo id) → POST messages → reply persisted with `model: "qwen3.8-flash"`.
### Unresolved
- n/a
### Disproved
- The messages API was fine; the loss happened client-side.

## 2026-09-03 — Health mode: auto-conclude per reply + ready-glow button
### Solved
- In 血糖模式 (health mode), when a model reply finishes streaming, conclude runs AUTOMATICALLY (no Conclude click): streamReply's finally triggers `autoConcludeRef` (guarded by insulinMode, not aborted, no existing 查看总结 bubble). The thinking bubble → 查看总结 flow still applies.
- The Conclude button now takes `ready`: when a conclusion is ready it gets the SAME gradient border + breathing glow as the active health toggle (`.conclude-button.ready` reuses healthGlow), signalling "ready to view". Clicking it then OPENS the confirm modal instead of running conclude again; without a ready result it runs conclude normally (free mode unchanged).
### Verified
- E2E: health mode → "血糖 130" → reply → auto-conclude → button glows ready → click opens the modal.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Old conclude process deleted (bubble flow removed)
### Removed
- 思考中 thinking bubble + 查看总结 bubble entirely: `concluding`/`concludeReady` message flags (ChatApp + MessageBubble), the clickable bubble render + `onOpenConclude` prop, `concludeBubbleIdRef` machinery, the `.conclude-ready` CSS, i18n keys `conclude.inProgress/view/viewHint`.
- Health-mode /api/conclude fallback (`autoConcludeRef`) — health mode now relies 100% on the reply tail; if the tail is missing the button stays unlit and the user can trigger one manual /api/conclude via the button.
- `concludeAll` no longer creates bubbles — it fetches /api/conclude → merges → sets the ready state (used only by the manual Conclude click, e.g. free mode).
### Verified
- E2E health flow still works: reply → tail parsed (0 /api/conclude calls) → button glows → modal opens; no bubble remnants anywhere in the code.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-03 — Session conclusion storage removed (stale 保存 card after refresh)
### Problem
- `persistConclusion` wrote the conclusion into the session doc; on refresh ChatApp re-loaded it as `summary` → the old SummaryCard ("报告 / 保存 …") reappeared with 保存 (concludeSaved resets to false) — and clicking 保存 would POST a NEW record (recordIdRef lost) → duplicate records.
### Fix
- Removed the session-conclusion path entirely: `persistConclusion` callback + all calls (single-call path, concludeAll, truncatePersisted), session-conclusion loading on refresh (authed + guest), the `conclusion: null` PUT, `setGuestConclusion` import, and the `SessionConclusion` type usage.
- After refresh the chat shows only messages; the conclusion lives in the records list (sidebar 记录 / timeline). The in-session SummaryCard still shows right after a modal save (已保存).
### Verified
- Refresh on a session that had a stored conclusion: no summary card, no save button (bubbles only).
### Unresolved
- Old sessions keep their stored conclusion docs server-side (harmless, unused).
### Disproved
- n/a

## 2026-09-04 — Restore saved conclusion after refresh (record linked to session)
### Problem
- After refresh the in-memory conclusion was gone (concludeReady false) → clicking the Conclude button re-ran /api/conclude instead of opening the stored report.
### Fix
- The SAVED record is now linked to its session: on modal save, ChatApp stores `conclusion` + `recordId` in the session (authed: two PUTs — conclusion + recordId; guest: setGuestConclusion with recordId). The sessions PUT route accepts recordId (new `setSessionRecordId`); `parseConclusion` now also keeps meal dishes; `getSessionWithMessages` returns recordId; GuestSession gains recordId.
- On session load (authed + guest): if conclusion && recordId exist → restore recordIdRef + concludeSaved + concludeResult → the button glows and opens the STORED report; no /api/conclude call.
### Verified
- E2E: save a reading → refresh → button already ready (0 /api/conclude calls) → click opens the modal with the stored 130 reading.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-04 — Conclude button: view-only, static highlight, no API
### Problem
- After refresh the restored conclusion kept the button glowing forever (healthGlow animation pulsing) — "stuck flashing". The button could also still fire /api/conclude when no conclusion existed.
### Fix
- Button is now view-only: onClick opens the modal ONLY when a conclusion is ready; `concludeAll`/`concluding` state removed entirely (no /api/conclude from the button). Disabled when no stored report.
- `.conclude-button.ready` keeps the gradient border but the breathing animation was removed — static highlight.
### Verified
- E2E: save → refresh → button ready (static), 0 /api/conclude calls, click opens the stored report.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-04 — Conclude modal modern redesign
### Solved
- Raw form rows → modern card design: rounded 20px modal with soft shadow, title + summary subtitle; readings as cards with a big 34px value input, unit pill select (mg/dL, mmol/L, U, IU, g, kg), calendar/clock chip time pickers, trash-to-remove; meals as cards with inline name, time chips and dish rows (name input + color-coded rank badge that CYCLES 低→中→高→— on tap); dashed add-card buttons; gradient save button + ghost cancel; uppercase section labels.
- Meal trash now actually removes the meal entry (removeMeal).
### Verified
- E2E: modal opens with title/summary/big value/unit/save, no overflow (screenshot saved).
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-04 — Lighthouse audit (PC) + viewport a11y fix
### Scores (headless Chrome, Lighthouse 13.4.1)
- Home (guest): Performance 82, **Accessibility 100** (was 94), Best Practices 96, SEO 100
- Login: Performance 83, Accessibility 92, Best Practices 96, SEO 100
### Fixes applied
- Removed `maximumScale=1` + `userScalable=false` from the viewport meta (app/layout.tsx) — was flagged as an accessibility violation (blocks pinch-zoom). Kept `viewportFit: cover`. Home a11y 94 → 100.
### Remaining (informational)
- Guest 401s from /api/auth/me fire twice (ChatApp + Sidebar auth checks) → counted as console errors; harmless expected behavior.
- TBT ~400-480ms and ~68KB unused JS chunk — Next.js framework overhead, not actionable without bundler surgery.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-04 — Conclusion modal manual audit (a11y + mobile)
### Found & fixed
- No focus management: modal opened with focus staying on the trigger → now focus moves into the modal (first content control, skipping the close button) and is trapped (Tab wraps first/last) while open (ConcludeModal focus effect).
- Escape did nothing → now closes the modal (with stopPropagation so the sidebar drawer handler doesn't double-fire).
- Generic aria-labels "date"/"time" → localized 日期/时间 (new concludeModal.date key).
- Subtitle contrast: #55555a on white ≈ 7.3:1 (AA pass; the probe's 2.83 reading was its transparent-background bug, not real).
### Verified
- Contrast: reading value 15.5:1, save button 21:1; tab order close→value→unit→remove→date→time→add→cancel→save; mobile 320px: modal 288px, no overflow, 34px value fits; focus lands on the reading value.
### Unresolved
- Add-card buttons rely on visible text for their name (no aria-label) — acceptable for screen readers.
### Disproved
- The modal cannot be audited by Lighthouse directly (it audits page navigations, not client-side state) — Playwright probing is the correct tool.
## 2026-09-06 — One-decimal response elapsed time
### Solved
- Chat and OpenCode response timers now measure actual elapsed time at 100 ms resolution and persist rounded tenths of a second.
- Chat bubbles and shared-chat views now display elapsed times with exactly one decimal place, including older whole-second records.
### Verified
- `npm run build` passed.
- The PM2-managed `inschat` process was restarted from the existing Node 22 PM2 installation and served HTTP 200 on port 3001.
### Unresolved
- n/a
### Disproved
- Starting a second production server on port 3001 was not a valid smoke-test path because the PM2-managed app already owned the port; the existing app was verified with `curl`.

## 2026-09-06 — English-first locale detection
### Solved
- New visitors now default to English, except when the browser's primary system language is Chinese (`zh`), which selects Chinese.
- Saved manual language preferences still take precedence over system-language detection.
- The server-rendered document language now starts as English to match the default.
### Verified
- `npm run build` passed.
- The PM2-managed `inschat` process was restarted and served HTTP 200 on port 3001.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Align image removal controls
### Solved
- Added an X button to every image thumbnail while editing a sent message.
- Removed images from the edited message state when their X button is pressed.
- Unified the normal composer and editing-preview X buttons with a centered, circular, keyboard-focusable control.
### Verified
- `npm run build` passed after adding edit-mode removal and after unifying the button styling.
- Guest browser probing confirmed the normal preview X is 22×22px, flex-centered, and visually aligned over the thumbnail.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Tighten inline edit spacing
### Solved
- Reduced the inline editor's internal padding from 10px to 8px.
- Reduced the vertical gap between the image preview and text area from 8px to 4px.
### Verified
- `npm run build` passed after each spacing adjustment.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Restore visible edit-box padding
### Solved
- Fixed the generic image-bubble selector overriding the edit composer padding whenever an edited message contained a photo.
- The edit composer now has an explicit 12px inner padding while retaining the 4px image-to-text gap.
### Verified
- `npm run build` passed.
- Browser CSS probing confirmed the rendered editor computes to `padding: 12px` and `gap: 4px`.
### Unresolved
- n/a
### Disproved
- The earlier 8px edit-bubble padding was not actually visible for image messages because of the higher-specificity image selector.

## 2026-09-07 — Widen desktop chat column
### Solved
- Increased the app chat container from 40rem (640px) to 48rem (768px), matching ChatGPT's large-screen conversation width.
- Preserved fluid sizing at narrower and mobile viewport widths.
### Verified
- `npm run build` passed.
- Browser measurements confirmed 768px at 1440px viewport width, 764px at 1024px, and fluid 390px at mobile width.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Simplify reasoning choices
### Solved
- Replaced the three-state Deep/Balanced/Fast selector with a two-state checkbox.
- Checked now sends `max` reasoning; unchecked sends `medium` Balanced reasoning.
- Changed the default from max to Balanced and normalized old saved `low` preferences to medium.
- Applied the same reasoning value to the OpenCode chat surface instead of always forcing max.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed only a checkbox is rendered, old `low` becomes Balanced, and toggling stores `max`/`medium`.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Match ChatGPT Thinking control
### Solved
- Renamed the checked max-reasoning state to Thinking in English and Chinese.
- Styled the checked control as an active dark pill at the end of the composer, while unchecked remains Balanced.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed Balanced is the default and the checked control displays Thinking with the active pill styling.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Replace reasoning checkbox with button
### Solved
- Removed the checkbox entirely.
- Replaced it with a real button at the end of the input row, using Balanced when off and Thinking when active.
- Added a sparkle icon, pressed-state semantics, and ChatGPT-style active pill styling.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the control is a `button` with zero checkbox elements and toggles `aria-pressed` from false to true.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Soften Thinking button appearance
### Solved
- Reworked the reasoning button into a smaller, borderless composer-toolbar control.
- Replaced the dark active fill with a subtle gray active highlight and softer hover/focus treatment.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed a 32px-high button with transparent Balanced styling and subtle active Thinking styling.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Keep Thinking label across states
### Solved
- Both inactive and active states now display the Thinking label.
- Changed the inactive state to a neutral gray pill and the active state to a clearly different purple highlight.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both states say Thinking and use distinct colors.
### Unresolved
- n/a
### Disproved
- The previous Balanced label and subtle gray active state did not match the requested ChatGPT-style control.

## 2026-09-07 — Use borderless light-blue Thinking states
### Solved
- Removed the Thinking button border in all states.
- Changed the inactive state to light blue and the active state to a stronger light-blue highlight.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both states have a 0px border and distinct light-blue backgrounds.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Make composer white and placeholder-free
### Solved
- Changed the composer input row from gray to white with a subtle gray border.
- Removed placeholder text from the main Chat and OpenCode composer instances.
### Verified
- The first build caught stale placeholder props in two call sites; removing them restored a clean TypeScript build.
- Guest browser probing confirmed white background, subtle gray border, and an empty placeholder attribute.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Make left sidebar white
### Solved
- Changed the left sidebar background from the soft gray surface to white.
- Kept the subtle right divider and existing navigation styling unchanged.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the sidebar background is white with the existing gray divider.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Bold sidebar Chats and Records catalogs
### Solved
- Increased the Chats and Records section-label weight from 500 to 600.
- Scoped the change to the two sidebar catalog headers without changing individual session rows.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both labels render at font weight 600.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Compact and extend sidebar account footer
### Solved
- Reduced the sidebar footer padding from 10px/12px to 8px/8px, making the login/settings area approximately 10% shorter.
- Extended the footer's top divider to the full sidebar width with matching inner content padding.
### Verified
- `npm run build` passed.
- Guest browser probing measured a 71px footer spanning 259px inside the 260px sidebar, with a full-width top divider.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Neutral inactive Thinking control
### Solved
- Changed the inactive Thinking button to a neutral gray surface and muted text.
- Preserved the light-blue background and blue text for the active Thinking state.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed inactive `rgba(0, 0, 0, 0.05)` and active `rgb(191, 224, 255)` backgrounds.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Keep sidebar top controls visible
### Solved
- Added a non-shrinking top sidebar panel containing the brand controls and New Chat link.
- Left chats and records in the independently scrollable middle region.
- Added a full-width divider below the top panel to match the fixed account footer treatment.
### Verified
- `npm run build` passed.
- Guest browser probing injected overflowing catalog content and confirmed the top panel and New Chat position stayed fixed while the middle region scrolled.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Adaptive sidebar scrollbar and divider
### Solved
- Moved the sticky top panel into the full-height catalog scroll container so its scrollbar begins at the top of the sidebar.
- Added scroll-state tracking so the divider below the sticky panel is hidden at scroll position 0 and appears after scrolling.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the scroll container starts at y=0, the top divider is 0px at the top, and becomes 1px after scrolling overflowing catalog content.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Animate sidebar divider visibility
### Solved
- Replaced the layout-changing border with a pseudo-element that fades in and out over 160ms.
- Kept the bottom account bar unchanged.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the divider opacity changes from 0 at the top to 1 after scrolling, with the transition configured at 160ms.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Soften top divider and compact footer again
### Solved
- Reduced the top divider contrast to a subtle rgba black line.
- Reduced the bottom account footer padding from 8px to 5px, producing a 65px footer.
- Kept the bottom footer divider permanently visible.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the 65px footer retains a 1px top divider and the top divider is subtle and hidden at the top position.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Add collapsible Chats and Records catalogs
### Solved
- Added independent chevron toggle buttons to the Chats and Records headers.
- Collapsing a catalog hides only its session list and rotates its chevron.
- Preserved the existing New Chat action beside the Chats toggle.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both controls start expanded and each click removes only its own catalog list while setting `aria-expanded` to false.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- Collapse state resets on a full page reload because persistence was not requested.
### Disproved
- n/a

## 2026-09-07 — Cap Chats catalog and place instant chevrons
### Solved
- Capped the Chats session list at 320px on desktop-sized viewports with its own scrollbar so the Records header remains visible.
- Positioned each chevron directly beside its catalog name instead of at the far edge.
- Removed chevron transition animation while preserving the open/closed direction change.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed a 320px chat list cap, overflowing chat content, visible Records header, a 2px label-to-chevron gap, and `transition: none`.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Restore shared sidebar catalog scrolling
### Solved
- Removed the per-folder Chats height cap and nested scrollbar.
- Restored one shared sidebar scrollbar for both Chats and Records, excluding the fixed account footer.
- Removed catalog-name hover color changes so labels remain gray on hover.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the outer sidebar is scrollable, the catalog list overflow is visible, and label color remains `rgb(142, 142, 142)` before and after hover.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- A long Chats list can place the Records header lower in the shared sidebar scroll area, as expected with one shared scrollbar.
### Disproved
- n/a

## 2026-09-07 — Add data confirmation and record row actions
### Solved
- Renamed the guest settings action to Delete data and replaced the repeated-click confirmation with a modal dialog.
- Delete data now clears both guest chat sessions and saved records while preserving preferences.
- Added record-row Rename, Pin/Unpin, and Delete actions for guest and authenticated record lists.
- Added persisted record pinning so pinned records sort to the top.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the record menu actions, record pinning, record rename, individual record deletion, confirmation modal, and removal of both local-storage data keys.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- The settings Delete data action remains guest-only, matching its local-storage scope.
### Disproved
- n/a

## 2026-09-07 — Bold chat and record action menus
### Solved
- Increased the Rename, Pin/Unpin, and Delete menu-item weight to 600 for both chat and record row menus.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both chat and record action menus render at font weight 600.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-07 — Soften action-menu weight
### Solved
- Reduced chat and record action-menu text from weight 600 to 500 after the stronger treatment was too bold.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the final row-menu weight is 500.
- PM2 restarted and the app returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Match insights to chart interval
### Solved
- Connected the Brief report insights to the Glucose Chart interval selector.
- Replaced the fixed 30-day window with matching 1-day, 7-day, 3-month, 1-year, or all-record windows.
- Made the insights heading show the selected interval and removed stale 30-day wording from the metric labels.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the 7-day summary excluded an older high reading, while All records included it and updated the period label.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Move insight dates to card header
### Solved
- Moved the highest and lowest glucose dates into the top-right area of their insight cards.
- Kept the metric label and value grouped in the card's main content area.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the dates render at the card's top-right corner.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Persist chart interval selection
### Solved
- Added a validated local-storage preference for the selected glucose chart interval.
- Restored the saved 1-day, 7-day, 3-month, 1-year, or all-record choice after refreshing the Brief report.
### Verified
- `npm run build` passed.
- Guest browser probing selected the 3-month interval, confirmed the storage key, refreshed the page, and confirmed the selector remained on 3 months.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- The preference is browser-local; no account settings endpoint currently exists for cross-device synchronization.
### Disproved
- n/a

## 2026-09-08 — Combine glucose summary cards
### Solved
- Changed the insights layout from three cards to two columns.
- Combined highest and lowest blood sugar into one card with stacked top and bottom sections.
- Kept the biggest-difference insight as the second card.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed two outer cards, two stacked glucose sections, and a separate difference card.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Clarify biggest increase card
### Solved
- Renamed the comparison title to Biggest increase / 最大升幅.
- Added a yearless date range in the card header with an arrow, such as September 6th → September 7th.
- Kept the phase and increase amount below the glucose values and retained the meal details.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the title, ordinal date range, glucose values, phase, and meal section.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Remove meal heading and date
### Solved
- Removed the “Foods on the higher-glucose day” / “血糖较高当天吃了什么” heading from the biggest-increase card.
- Removed the separate higher-glucose date line while preserving meal categories and food bubbles.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the meal heading and separate date are absent while the comparison details remain.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Format increase as lower-to-higher
### Solved
- Changed the biggest-increase value display to put the phase first, then the lower reading, higher reading, and upward delta.
- Example: `Before breakfast 115 → 120 (↑ 5 mg/dL)`.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed a chronological decrease is displayed as the requested lower-to-higher increase.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — De-emphasize glucose units
### Solved
- Moved highest and lowest glucose units to smaller gray text aligned at the lower-right of each value section.
- Changed comparison dates to compact numeric month/day format, such as `9/3 → 9/4`.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed both units remain visible at the right edge and comparison dates contain no year.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Compact highest and lowest dates
### Solved
- Changed the highest and lowest glucose dates to numeric month/day format, such as `9/30`.
- Kept comparison dates in the same compact format.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed all insight dates render as month/day values without year or month names.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Put comparison phase in title
### Solved
- Changed the comparison title to include the localized phase, such as `Highest increase · Before dinner`.
- Removed the phase and unit from the main value string.
- Kept the value as lower → higher with the parenthetical increase, while moving the unit to the shared bottom-right unit treatment.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the title, `115 → 120 (↑ 5)` value, and separate `mg/dL` unit.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Use red triangle for increase
### Solved
- Removed parentheses around the increase delta.
- Replaced the upward arrow with a small red triangle and red delta text, such as `▲ 5`.
- Left the unit in the separate bottom-right unit position.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the indicator renders as `▲ 5` in red with no parentheses.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Aggregate comparison-day food bubbles
### Solved
- Removed meal-category labels from the comparison food display.
- Switched the food source to all meals from the earlier day in the two-day comparison.
- Flattened and sorted foods by impact, showing high-impact bubbles first, then medium-impact bubbles.
- Excluded low-impact foods and moved the divider below the bubble row.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed four bubbles in high/high/medium/medium order, no low-impact bubble, no meal label, and a bottom divider.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- Unranked foods are excluded along with low-impact foods so the display stays limited to high and medium impact.
### Disproved
- n/a

## 2026-09-08 — Cap foods and add decrease comparison
### Solved
- Limited both food lists to a maximum of three bubbles.
- Added a separated decrease section showing higher → lower glucose with a green down triangle and the same unit/date treatment.
- Added up to three low-impact green foods from the paired comparison day to the decrease section.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed three upper high/medium foods, three lower low-impact foods, matching dates, and the decrease section below the divider.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Tighten summary and move chart below
### Solved
- Reduced insight card padding, section gaps, and divider spacing.
- Reordered the Brief report so the summary appears above the glucose chart.
- Left the Full Report timeline order unchanged.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the summary renders before the chart and the stacked summary-section gap is 10px.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Replace demo data with Chinese timestamp-driven records
### Solved
- Replaced English synthetic dishes with detailed Chinese, Korean, and Asian dishes using meaningful high/medium/low impact ranks.
- Removed demo record titles, summaries, and explicit phase fields; phases are now derived from entered timestamps.
- Ensured each demo day has one glucose reading per time slot without duplicate same-phase readings.
- Added a planned approximately 120 mg/dL baseline, occasional 108 mg/dL lows, and a 180 mg/dL spike after a high-impact meal day.
- Updated insight phase matching to derive the phase from reading time when no stored phase exists.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed timestamp-only readings produce the derived “Before dinner” phase and both increase/decrease comparison values.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- The visible demo-data controls remain removed from the Brief report; this update changes the existing guest-store demo generator for callers that use it.
### Disproved
- The first browser probe assumed one comparison title and failed because the new card correctly has both increase and decrease titles; the probe was corrected to target the first title.

## 2026-09-08 — Restore example data controls
### Solved
- Restored guest-only Load example data and Remove example data buttons.
- Added a recent 108 mg/dL example so low data appears in the generated report.
- Added Chinese and English labels for the controls.
### Verified
- `npm run build` passed.
- Guest browser probing clicked Load example data and confirmed 30 records, blank titles, no stored phase fields, one reading per derived phase, 108 and 180 examples, CJK dish names, and the Remove example data button.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- The controls remain guest-only; authenticated accounts continue to use server records.
### Disproved
- n/a

## 2026-09-08 — Add compact high-impact food summary
### Solved
- Added a third stacked section below Lowest blood sugar in the left summary card.
- Aggregated high and medium-impact foods across the selected interval.
- Sorted foods by impact, then occurrence count, and limited the list to five bubbles with counts.
- Kept low-impact foods out of this dangerous-food list.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the third section is below Lowest blood sugar and displays counted high/medium foods with a maximum of five.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Remove visible food counts
### Solved
- Kept occurrence frequency for internal ranking but removed all visible `×1`/`×2` counts from food bubbles.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed dangerous-food bubbles contain names only.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Simplify glucose chart hover details
### Solved
- Removed the Daily pattern chart mode and its toggle.
- Removed visible chart dots while preserving larger transparent hover targets.
- Added native hover/focus tooltips with the exact glucose value, unit, and timestamp.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed no Daily pattern toggle, no visible dots, and tooltip titles for each chart point.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Replace chart hover targets with real tooltip
### Solved
- Replaced the native SVG title-only behavior with a positioned tooltip that appears on mouse hover and keyboard focus.
- Removed the crosshair cursor and focus square styling.
- Tooltip now shows the exact value, unit, and timestamp beside the hovered reading.
### Verified
- `npm run build` passed.
- Guest browser probing hovered a chart reading and confirmed the visible tooltip, pointer cursor, and no outline.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- Native SVG titles alone were insufficient for the requested hover behavior because they did not provide a reliable visible tooltip.

## 2026-09-08 — Move glucose range control to page header
### Solved
- Moved the time-range selector out of the glucose chart card.
- Added a centered page-level range control in the Brief report header.
- Kept the existing range state and persistence so the selector continues to control insights and chart filtering together.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the selector is centered in the page header, absent from the chart card, and changes from All records to Last 7 days.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Open full-day editor from glucose readings
### Solved
- Made each glucose checkpoint clickable from the Brief report chart.
- Resolved the clicked reading to its calendar day and opened the existing full-day editor.
- The editor includes that day’s records, glucose readings, meals, and food details.
- Added Enter and Space keyboard activation for chart checkpoints.
### Verified
- `npm run build` passed.
- Guest browser probing clicked a glucose checkpoint and confirmed the full-day modal opened with the expected date, glucose value, and meal dish.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Consolidate Brief report controls
### Solved
- Removed the visible range label so only the accessible dropdown remains.
- Moved the page controls to the right side of the Brief report header.
- Consolidated guest example-data actions into one toggle button.
- The button now switches between Load example data and Remove example data without duplicate controls.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed no visible range label, right-aligned controls, exactly one demo button, and correct Load/Remove label switching.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Increase chart date-axis frequency
### Solved
- Replaced the chart’s start/end-only date labels with multiple interval-aware ticks.
- Added five ticks for day/week views, four for the three-month view, five for the yearly view, and six for all records.
- Uses time labels for short ranges and date labels for longer ranges.
- Added small axis tick marks to make each date position clear.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed four quarterly labels (`Jun 9`, `Jul 9`, `Aug 9`, `Sep 9`), five yearly labels, and six all-record labels.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- Day/week probes with the seeded timestamps filtered to an empty chart, so their tick labels were not rendered in that specific probe; the component is configured for five ticks when readings exist.
### Disproved
- n/a

## 2026-09-08 — Use numeric chart dates
### Solved
- Changed longer-range chart date labels from localized month names to universal numeric month/day values such as `9/2`.
- Kept time formatting for short day-range labels.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed quarterly labels render as numeric values such as `6/9`, `7/9`, `8/9`, and `9/9`.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Replace range dropdown with tabs
### Solved
- Replaced the Brief report interval dropdown with five localized tabs: one day, seven days, three months, one year, and all records.
- Preserved the selected range in local storage.
- Added selected-tab semantics with `role="tablist"`, `role="tab"`, and `aria-selected`.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed five tabs, no select element, correct localized English labels, active-tab switching, and persisted `quarter` selection.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Shorten Chinese range tabs
### Solved
- Simplified Chinese interval labels to `1天`, `7天`, `3个月`, `1年`, and `全部`.
- Kept the English labels unchanged.
### Verified
- `npm run build` passed.
- Guest browser probing with Chinese UI confirmed the compact labels and no dropdown.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Place range tabs beside page title
### Solved
- Positioned the range tabs immediately to the right of the Brief report title.
- Kept the guest demo toggle separate at the far right of the header.
- Preserved the stacked layout on narrow screens.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the tabs begin directly after the page title with an 18px gap and all five tabs render.
- PM2 restarted and the Brief report returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-08 — Automatically persist completed conclusions
### Solved
- Automatically save structured health conclusions to Full report when a chat response completes.
- Added guest session-keyed upsert behavior so repeated conclusions update one local report.
- Added authenticated session-keyed MongoDB upsert behavior to prevent duplicate report entries.
- Link the saved report ID back to the chat session so the existing editor opens the persisted report.
- Added a non-empty title fallback for conclusions that omit a title.
### Verified
- `npm run build` passed.
- Guest end-to-end browser testing completed a health-mode chat and confirmed one report entry with a session ID, glucose item, session record ID, and stored conclusion without manual modal saving.
- PM2 restarted and the chat route returned HTTP 200.
### Unresolved
- Free-form chats that do not produce a structured `<CONCLUDE>` conclusion remain chat-only; automatically converting arbitrary free-form text into health records would create unstructured report entries.
### Disproved
- The initial probe appeared to show no report because it inspected the deprecated `inschat_guest_records` key; the active store is `inschat_guest_report`, which the follow-up end-to-end probe confirmed.

## 2026-09-08 — Match sidebar icon to application icon
### Solved
- Replaced the sidebar’s separate Lucide Sparkles mark with the shared `/icon.svg` application icon.
- Added sizing and overflow styles so the sidebar uses the same dark background and white mark as the app icon.
### Verified
- `npm run build` passed.
- Guest browser probing confirmed the sidebar renders `/icon.svg` at 28×28 with the image loaded.
- PM2 restarted and the chat route returned HTTP 200.
### Unresolved
- n/a
### Disproved
- n/a

## 2026-09-09 — Persist chat runs across refresh
### Solved
- Added a durable pending model-message anchor before generation starts, with throttled progress writes, a heartbeat, completion/failure status, and stale-run closure.
- Changed server streaming so a disconnected browser only detaches the response writer; the model generator continues and finalizes the same message.
- Added guest run snapshots and local pending-message IDs, plus client polling that resumes the existing run without issuing a second chat request.
- Restored structured health conclusions when a resumed response finishes with a `<CONCLUDE>` payload, so refresh does not produce an apparently empty completed bubble.
- Kept the UI stable by updating only the existing pending bubble when polled data changes, rather than replacing the whole transcript or appending duplicate model messages.
### Verified
- `npm run build` passed.
- PM2 restarted only for `inschat`; the app returned HTTP 200 with the new production build.
- An early poll returned the same run as `status: "pending"` and a later poll returned `status: "complete"` with the final text.
- A guest stream was intentionally disconnected and then polled successfully; the existing run reached `status: "complete"` with its final text.
- A real browser probe on the main `/` chat refreshed during generation, restored two bubbles, and later displayed the completed response.
### Unresolved
- Guest run snapshots use MongoDB when configured and fall back to process memory when it is unavailable; the fallback cannot survive a full server/process restart.
### Disproved
- Treating the browser's streaming React state as the source of truth was the root failure: refreshing discarded the only partial transcript and the server stopped at the failed enqueue.

## 2026-09-09 — Complete InsChat refresh resume loop

### Solved
- Re-checked the live tree before editing and kept the work scoped to Issue 1; no OpenCode-session persistence changes were made.
- Added full authenticated-session resume polling against `/api/sessions/:id` and full guest resume polling against `/api/guest-runs/:id`, both updating the existing message in place.
- Restored persisted `processSteps` and the active pending trail after refresh, while keeping the composer in sending/stop state until the server reports completion or failure.
- Kept `X-Run-Persisted` and `X-Run-Message-Id` response headers, guest MongoDB snapshots, detached streaming, heartbeats, and stale pending finalization in the deployed path.

### Verified
- `npm run build` passed after the resume-loop fix.
- Restarted only PM2 app `inschat`; `pm2 logs inschat --lines 50 --nostream` showed the new server ready without startup-blocking errors.
- Live guest QA created a new chat, refreshed during a pending run, restored the trail and Stop generating control, then reached the completed answer without a second POST.

### Unresolved
- Signed-in QA was not run because no test credentials were provided; the authenticated path was build-verified and wired to the shared session/message store.
- Guest durability still depends on MongoDB being available; the documented in-memory fallback cannot survive a full process restart.

### Disproved
- A single initial guest-run fetch was insufficient: it could restore the first snapshot but did not reliably keep the refreshed UI synchronized while the detached run continued. Continuous guest resume polling fixed that gap.

## 2026-09-09 — Smooth resumed response updates

### Solved
- Changed refresh polling to target the exact pending message using `sessionId` and `messageId`, instead of refetching and remapping the entire session.
- Reduced resume polling and server progress snapshots to 500ms.
- Suppressed React updates when the persisted message snapshot has not changed, while retaining the existing message identity and process trail.

### Verified
- `npm run build` passed.
- PM2 restarted only for `inschat`.
- Live guest QA showed the restored Stop generating state and answer lengths increasing across successive 500ms samples after refresh, then settled successfully.

### Unresolved
- The resumed view is still persistence-backed polling rather than a replayable token stream; cadence is bounded by database progress writes.

### Disproved
- Polling the full session every 2.5 seconds produced the reported blocky post-refresh experience even though persistence itself worked.

## 2026-09-09 — Allow live resume polling through nginx

### Solved
- Found that the public nginx site explicitly rejected `GET /api/chat` with `405 Not Allowed`, so the browser could only display the initial restored snapshot.
- Updated only the InsChat nginx `/api/chat` method allow-list to include `GET`.
- Added no-store response headers and a per-poll cache-buster so pending snapshots cannot be reused by a proxy.

### Verified
- `nginx -t` passed and nginx reloaded successfully.
- Public `GET https://inschat.renstoolbox.com/api/chat?...` now reaches Next.js and returns JSON `404` for an unknown run instead of nginx `405`.
- Public live QA refreshed a guest response mid-run; poll responses returned `200 pending` with increasing text lengths, the Stop generating control stayed visible, and the run settled successfully.

### Unresolved
- The authenticated public path still needs a real signed-in QA run with user-provided test credentials.

### Disproved
- The React poller was not the primary live failure. It was running, but nginx blocked every resume request before the request reached the application.

## 2026-09-09 — Match refreshed replies to live typing

### Solved
- Removed internal process arrows and model names from assistant bubble content.
- Hid the model-name footer while retaining the completed elapsed-time display.
- Changed pending hydration to start with a clean thinking state, then reveal persisted response text through a short typing queue as polling receives new snapshots.
- Kept polling and final status synchronization independent from the visual typing queue so completion is not lost while text catches up.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Public QA refreshed after answer text had started; successive 300ms samples increased in length, contained no arrow or model name, and the run settled successfully.

### Unresolved
- The refreshed path remains persistence-backed rather than a literal replay of every original token.

### Disproved
- Rendering each persisted snapshot directly as the bubble text made refresh visibly different from the normal live stream and exposed internal `→ model` metadata.

## 2026-09-09 — Restore model metadata after resumed replies

### Solved
- Restored the bottom-right model label for normal live and completed replies.
- Kept the label hidden only for a refreshed pending reply while its typing queue is catching up.
- The model label becomes visible again when the resumed text reaches its settled state.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Public UI probe confirmed a completed reply displays `1.2s · Qwen3.8 Flash` in the bottom-right metadata area.

### Unresolved
- n/a

### Disproved
- Removing the model metadata block globally was too broad; it fixed the refresh artifact but also removed intended normal-response context.

## 2026-09-09 — Resume from the last persisted characters

### Solved
- Kept the latest persisted assistant text visible during refresh instead of clearing the pending bubble to zero.
- Seeded the resumed typing queue from that stored text, so only newly persisted characters are animated afterward.
- Preserved the pending process state and completion synchronization while resuming from the stored position.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Public QA measured 56 characters before refresh, then continued from 102, 142, 249, 319, and later samples without returning to zero; the run settled successfully.

### Unresolved
- n/a

### Disproved
- Clearing the hydrated pending text was unnecessary and caused every refresh to visually replay the answer from the beginning.

## 2026-09-09 — Cloud-backed guest-to-account migration

### Solved
- Added an authenticated `/api/account/migrate-guest` endpoint that imports guest sessions, messages, conclusions, reports, pins, and images into the signed-in MongoDB account.
- Added source guest IDs and a migration record so retries are idempotent and do not duplicate cloud sessions, messages, or report entries.
- Added client batching for large IndexedDB image payloads; local guest data is cleared only after every migration batch succeeds.
- Rebound active persisted guest runs to their new cloud message so a response that is still generating continues to update the account-owned transcript.
- Added nested migration validation for message content, images, process steps, conclusions, report items, and meals.
- Added the nginx route required for the migration POST to reach Next.js.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `nginx -t` passed and nginx reloaded successfully.
- Public homepage returned `200`.
- Unauthenticated migration POST reached the application and returned the expected `401`, replacing the previous nginx `405`.

### Unresolved
- Full signed-in browser migration QA requires a real user account and was not performed to avoid creating test account/session data.

### Disproved
- Guest-to-account migration did not require replacing the existing guest or signed-in storage models; a source-ID mapping layer safely bridges them.

## 2026-09-09 — Dedicated sign-in and sign-up pages

### Solved
- Replaced the legacy `/login` redirect with a dedicated sign-in page.
- Added a dedicated `/signup` page for open username/password registration.
- Shared the validated auth form between both pages and the sidebar modal.
- Kept automatic guest-data migration after successful sign-in or registration.
- No invite code or registration code is required.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Public `/login` and `/signup` both returned `200` after startup.
- Server validation remains username 3–32 characters and password 8–128 characters.

### Unresolved
- A real account sign-up/sign-in flow was not submitted during QA to avoid creating test account data.

### Disproved
- A separate registration-code mechanism was not present in the existing auth API.

## 2026-09-09 — Keep guest and account storage separate

### Solved
- Removed guest-data export, migration, rebinding, and local guest-data clearing from sign-in and sign-up.
- Sign-in and registration now switch the active view to the account without importing guest sessions, records, reports, images, or pending runs.
- Removed the migration API implementation, client coordinator, validation modules, and nginx route.
- Logout continues to clear only the auth cookie; the browser's guest store remains unchanged and is available again after logout.

### Verified
- `npm run build` passed after the code changes.
- `nginx -t` passed and nginx reloaded successfully with the migration route removed.
- Repository search found no active guest-migration imports or endpoint references.

### Unresolved
- A real sign-in/logout isolation test was not performed to avoid creating test account data.

### Disproved
- Automatically merging guest data into an account is not required for cloud-backed accounts and conflicts with the desired separate guest/account model.

## 2026-09-09 — Account data clearing controls

### Solved
- Added confirmation-gated signed-in settings actions for clearing all chats and clearing all saved reports.
- Added account-scoped bulk APIs that delete sessions with their messages and clear both current and legacy report storage.
- Kept the existing guest-only local-data deletion control separate from account deletion.
- Refreshed an open records page after reports are cleared.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- The bulk APIs remain protected by authentication.

### Unresolved
- Full signed-in browser QA requires a real account and was not performed to avoid creating test account data.

### Disproved
- Per-item deletion alone was not sufficient for the test-phase cleanup workflow; account-level bulk controls are needed.

## 2026-09-09 — Combine account cleanup into one action

### Solved
- Replaced the two signed-in cleanup buttons with one “Clear all chats and reports” action.
- The button uses one authenticated bulk request that clears sessions, messages, current reports, and legacy report records together.
- Kept the existing confirmation dialog and guest-only local-data action unchanged.

### Verified
- `npm run build` passed after consolidating the controls.
- The combined endpoint remains behind the existing `/api/sessions` authentication and DELETE method protection.

### Unresolved
- Full signed-in browser QA requires a real account and was not performed to avoid creating test account data.

### Disproved
- Separate signed-in buttons were unnecessary for this test-phase cleanup workflow.

## 2026-09-09 — Move logout into Settings

### Solved
- Removed the signed-in logout button from the account row in the sidebar footer.
- Added logout as a Settings row next to usage and account cleanup controls.
- Preserved the existing logout behavior, including returning to the separate guest account.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- The live homepage returned `200`.

### Unresolved
- Signed-in visual QA requires a real account and was not performed to avoid creating test account data.

### Disproved
- Keeping logout beside the username was not needed once account actions were grouped in Settings.

## 2026-09-09 — Make the guest footer login target explicit

### Solved
- Made the guest icon and “Guest” label one shared login button.
- Removed account-row hover highlighting so the bottom bar does not highlight as a whole.
- Reduced the guest login icon from 20px to 18px and its circle from 34px to 31px.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Live homepage returned `200`.

### Unresolved
- Signed-in/guest visual hover QA was not run in a browser session.

### Disproved
- Requiring users to click only the small guest icon was not an adequate login affordance.

## 2026-09-09 — Simplify application metadata

### Solved
- Changed the browser/application metadata title to simply “InsChat”.
- Removed the extra insulin and glucose tracker title and description text.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Live homepage returned `200` and rendered `<title>InsChat`.

### Unresolved
- n/a

### Disproved
- The longer product descriptor was not wanted as part of the application name.

## 2026-09-09 — Merge brief and full records views

### Solved
- Combined the brief insights/chart and full report tools/timeline into one `/records` page.
- Replaced the sidebar Records folder and two child links with one Records button above the account footer.
- Kept `/records/full` as a compatibility redirect to `/records`.
- Removed the unused brief/full navigation labels.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200`.
- `/records/full` redirected to `/records`.

### Unresolved
- Full guest and signed-in visual QA was not run in a browser session.

### Disproved
- Separate sidebar entries were necessary after the two records views were merged into one page.

## 2026-09-09 — Place Records above the account footer

### Solved
- Moved the single Records link outside the `.sidebar-foot` container.
- Records now sits directly above the bottom account/guest bar instead of inside it.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual spacing QA remains pending.

### Disproved
- Placing the Records link inside the footer did not satisfy the requested above-footer layout.

## 2026-09-09 — Make the Records entry visibly clickable

### Solved
- Redesigned the above-footer Records link as an always-visible bordered button.
- Switched the icon to a report/document icon and kept the label “Records”.
- The button no longer depends on hover to communicate that it is clickable.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- A plain sidebar link with hover feedback was not obvious enough as the entry point to the full report.

## 2026-09-09 — Match Records button to insulin mode styling

### Solved
- Applied the insulin-mode gradient-border accent to the Records button.
- Reduced the button padding and text size so it is compact.
- Removed the gray button treatment while keeping the control visibly clickable.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- The larger gray bordered treatment did not match the insulin-mode visual language.

## 2026-09-09 — Paginate the Records timeline

### Solved
- Moved the full-report date selector below the timeline.
- Limited the timeline to the newest seven days initially.
- Added a button that appends up to 30 more days per click.
- Added English and Chinese labels for the incremental timeline control.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA was blocked because the browser probe could not connect to the local app URL.

### Disproved
- Rendering every historical timeline day immediately made the records page unnecessarily long.

## 2026-09-09 — Improve Records button typography

### Solved
- Kept the existing Records button border and accent colors.
- Removed the inherited sidebar-label padding from the Records text.
- Matched the label color to the button accent and refined its weight, spacing, and line height.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- The generic sidebar label styling made the Records text look misaligned and muted inside the accent button.

## 2026-09-09 — Refine Records range controls

### Solved
- Replaced the raw time-range tabs with a labeled segmented control.
- Added clearer active-state contrast, spacing, borders, and mobile overflow behavior.
- Moved Import and Export controls ahead of the time-range selector at the top of the Records page.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- The unlabeled, lightly bordered range tabs did not provide enough visual hierarchy.

## 2026-09-09 — Simplify Records header controls

### Solved
- Removed the visible Time range label.
- Removed the gray range-control background and replaced it with a lighter border.
- Aligned Import and Export to the right side of the Records header.
- Preserved a stacked layout on mobile.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- The gray range-control container and left-positioned transfer actions did not match the requested header hierarchy.

## 2026-09-09 — Order Records header actions

### Solved
- Ordered the header actions as Export, Import, then Load example.
- Placed Load example at the far right of the guest header.
- Kept Import and Export grouped immediately to its left.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- `/records` returned `200` after deployment.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- Placing Load example before the transfer actions left the guest action order visually backwards.

## 2026-09-09 — Improve phone sidebar navigation

### Solved
- Restored chat history visibility inside the mobile sidebar drawer.
- Added body scroll locking while the drawer is open.
- Improved mobile drawer width, safe-area spacing, touch targets, and visual separation.
- Hid the desktop collapse control on phones.

### Verified
- `npm run build` passed after the sidebar pass.

### Unresolved
- Browser visual QA remains pending.

### Disproved
- Hiding `.session-nav` on phones made the drawer useful only for navigation buttons, not chat history.

## 2026-09-09 — Improve phone Records layout

### Solved
- Tightened Records page spacing for narrow screens.
- Made transfer, demo, range, date, and pagination controls easier to tap.
- Allowed insight dates, values, and chart tooltips to wrap.
- Removed desktop-only timeline width reservations and made timeline times flow below content on phones.
- Made day edit controls visible on touch screens.

### Verified
- `npm run build` passed after the Records pass.
- Restarted only PM2 app `inschat`.
- Guest `/`, `/records`, and redirected `/records/full` returned `200`.

### Unresolved
- Browser visual QA remains pending because no browser executable was available in the shell environment.

### Disproved
- Desktop timeline spacing and hover-only actions were not suitable for narrow touch layouts.

## 2026-09-10 — Keep report pictures local

### Solved
- Stored authenticated chat image references instead of image bytes in session messages.
- Associated original-session report entries with local image keys.
- Hydrated report pictures from browser IndexedDB and added an unavailable-on-this-device state.
- Kept report export/import metadata-only so local image data is never transferred.
- Prevented the legacy share endpoint from accepting or returning image bytes.

### Verified
- `npm run build` passed after the persistence, report, and rendering passes.

### Unresolved
- Existing MongoDB documents may still contain image bytes from before this change; new writes and API responses no longer persist or expose them.
- Images are intentionally unavailable on other devices because the browser-local sidecar is not synchronized.

### Disproved
- Persisting authenticated chat image data in MongoDB is incompatible with the local-only image requirement.

## 2026-09-10 — Include earlier session photos in reports

### Solved
- Added an explicit report-mode image flag to the chat request.
- Preserved earlier local photo parts for insulin/session-report model turns.
- Kept ordinary text turns on the existing text-only path.

### Verified
- Production build and guest route checks are required after this pass.

### Unresolved
- Report analysis still depends on the configured vision-capable model accepting the transient image request.

### Disproved
- Treating only the latest message as image context prevented later session reports from analyzing an earlier photo.

## 2026-09-10 — Preserve current image keys when saving reports

### Solved
- Report saves now collect image keys from the exact message snapshot that generated the report.
- Existing report updates also retain image keys from the parsed conclusion as a fallback.

### Verified
- `npm run build` passed.
- Restarted only PM2 app `inschat`.
- Guest `/` and `/records` returned `200`.

### Unresolved
- A report cannot display a photo if browser-local IndexedDB storage failed before the report was saved.

### Disproved
- Reading only the asynchronous React message ref was reliable enough for auto-saving the just-uploaded photo.

## 2026-09-10 — Show pictures inside chat reports

### Solved
- Added the local report-image gallery to the in-chat report modal.
- Reused the same local preview and unavailable-image behavior as the Records page.

### Verified
- Production build and guest route checks are required after this UI pass.

### Unresolved
- The gallery still depends on the original browser’s local IndexedDB image sidecar.

### Disproved
- Saving picture references alone was sufficient when the in-chat report itself had no image presentation.

## 2026-09-10 — Replace report image thumbnails with meal buttons

### Solved
- Replaced direct image display in both report locations with a Photos button.
- Positioned the button beside each meal name.
- Kept the gallery and full-screen preview behind the button.

### Verified
- Production build and guest route checks are required after this UI pass.

### Unresolved
- Each meal button currently opens the session’s complete local image set because image-to-meal mapping is not stored.

### Disproved
- Showing every report image inline was the requested report interaction.

## 2026-09-10 — Fix combined image and text requests

### Solved
- Split a user instruction and its attached images into consecutive provider-safe user messages instead of one mixed text/image content array.
- Classified provider timeouts as model-chain failures so the next vision model can be attempted.

### Verified
- Production build and guest image-plus-text chat check are required after this fix.

### Unresolved
- Vision availability still depends on the upstream provider and its model catalog.

### Disproved
- PC tab switching was the cause of the 120-second image request failure.

## 2026-09-10 — Hide unavailable vision-provider errors

### Solved
- Confirmed `qwen3.5-plus` currently returns an upstream model-unavailable error.
- Replaced leaked provider error text with a clear retry message when all image-capable models fail.

### Verified
- Production build and guest image failure-path check are required after this change.

### Unresolved
- The application cannot make an unavailable upstream vision model respond; successful image analysis still depends on provider availability.

### Disproved
- The `401 /api/auth/me` guest probe caused the vision-provider failure.

## 2026-09-11 — Reduce vision-provider latency

### Solved
- Confirmed the reported 99-second response was upstream DeepSeek time-to-first-token latency: 98,049 ms of a 99,807 ms request.
- Reordered image requests to use the responsive GLM-5.3 Flash vision model first, with DeepSeek and MiMo fallbacks.
- Removed the currently unavailable Qwen3.5 vision fallback.
- Reduced the per-attempt image timeout from 120 seconds to 30 seconds so a stalled vision provider fails over sooner.

### Verified
- Live provider probes returned first stream data in approximately 652 ms for DeepSeek, 866 ms for GLM-5.3 Flash, and 1.27 seconds for MiMo.

### Unresolved
- Upstream vision latency can still vary; the application cannot control provider capacity or routing.

### Disproved
- Image upload, authentication, nginx, and report persistence were not responsible for the 99-second delay.

## 2026-09-10 — Enforce Qwen3.8 Flash as the primary model

### Solved
- Enforced `qwen3.8-flash` as the primary model for text messages, conclusions, and image requests.
- Removed paid DeepSeek fallbacks from automatic chains; balance or availability failures now move to free models.
- Disabled manual model pins and `CONCLUDE_MODEL` overrides so they cannot change the enforced routing policy.
- Updated model-page text, routing display, README, and environment example to match the policy.

### Verified
- Production build passed twice after the routing changes.
- Guest `GET /api/models` correctly remains protected with `401 Not signed in`.
- Live provider fallback behavior was not exercised to avoid spending quota; it remains the next manual check.

### Unresolved
- The existing free catalog is marked text-only; free image fallback attempts may be rejected by the provider and then show the image error.

### Disproved
- Keeping the old peak/off-peak DeepSeek routing was not compatible with the requested Qwen-only primary policy.

## 2026-09-10 — Rebuild and restart InsChat

### Solved
- Rebuilt the production bundle successfully.
- Restarted only the `inschat` PM2 process from `/home/ubuntu/inschat`.
- Confirmed the new process starts Next.js successfully on port 3001.

### Verified
- PM2 reports `inschat` online after restart.
- Startup logs show `Next.js 16.3.3` and `Ready` with no new startup-blocking error.

### Unresolved
- The PM2 log tail retains historical GLM requests from before the restart; a fresh image request is still needed to verify the live marker end-to-end.

### Disproved
- The `inschat` process was not left running on the old build after the requested restart.

## 2026-09-10 — Health-mode Qwen image request compatibility

### Solved
- Image requests for every vision model now omit `reasoning_effort`; the gateway
  receives no reasoning parameter whenever image content is present.
- Text and image content are sent together in one standard multimodal user
  message, matching the image-only request shape.

### Root cause
- Health mode uses the full health system prompt and the normal reasoning setting.
- The OpenCode gateway rejects Qwen vision requests when reasoning metadata is present, making the failure look like a health-mode text/image mixing problem.
- A model-specific exception list was too easy to make stale after Qwen3.8
  became the image primary; checking for image content is the safer boundary.
- The earlier split into consecutive text and image user messages was
  disproved: image-only requests had two messages, while image-plus-text
  requests had three and Qwen timed out on the latter.

### Unresolved
- A fresh guest image request still needs to be run to verify the live provider response.

## 2026-09-10 — Simplify report image opening

### Solved
- Report image references now render as an icon-only trigger.
- Clicking the icon opens the first available report image directly in the centered image viewer.
- Removed the intermediate report image list dialog and its extra close/header layer.

### Unresolved
- Reports with multiple stored image references currently open the first image only.

## 2026-09-10 — Expand image viewer controls

### Solved
- Image viewer images now use the available viewport instead of a fixed
  720px width.
- Explicit auto sizing preserves the full image aspect ratio without cropping.
- Viewer overflow is hidden so opening an image does not create a scrollbar.
- Added a black circular X close button in the top-right corner.

### Verified
- Production build passed.
- PM2 `inschat` restarted successfully and port 3001 returns HTTP 200.

## 2026-09-11 — Preserve mixed-date report events and image ownership

### Solved
- Added durable event metadata to conclusions and saved records: each event
  keeps its source message, occurrence date, extracted items/meals, and only
  that message's image keys.
- Health-mode conclusion tails now describe the latest user message only;
  the client merges that event into the accumulated report without deleting
  earlier events.
- Fixed a stale `streamReply`/conclusion closure so later messages no longer
  replace the first event with a single-message report.
- Records timeline and glucose chart now use event dates and event-owned image
  keys, while legacy report-level image keys remain supported as unscoped
  fallback data.
- Added English month-name parsing (`August 15, 2026`) so model-produced dates
  are not silently interpreted as today's date.
- Guest and authenticated persistence/API/session conclusion paths carry the
  event list, and the guest browser flow verified separate September and
  August entries in one chat.

### Unresolved
- Existing legacy records have report-level image keys without reliable source
  ownership; they remain unscoped and are not guessed onto dated events.
- No real-image browser request was run in this pass because the workspace has
  no test image asset; the event/image-key path is covered by the implemented
  source association but still needs a real photo regression check.

### Disproved
- The report was not losing the August/September data only because the report
  list used one `savedAt` timestamp; stale conclusion state and English-date
  parsing were also required to reproduce the failure.

## 2026-09-10 — Route image turns to GLM-5.3 Flash

### Solved
- Kept Qwen3.8 Flash as the primary model for text chat and conclusions.
- Changed image-only and image-plus-text chat turns to start with
  `glm-5.3-flash`.
- Kept the free fallback chain after the paid image model is unavailable or
  its balance is exhausted.
- Preserved the existing multimodal request shape: text and image parts stay
  together in one OpenAI-compatible `messages[].content` array.
- Image turns continue to omit `reasoning_effort`, which avoids the gateway
  rejection seen when reasoning metadata is combined with image content.

### Verified
- Production build passed.
- PM2 `inschat` restarted successfully and port 3001 returns HTTP 200.
- A guest image-plus-text request returned
  `TRYING:glm-5.3-flash`, `MODEL:glm-5.3-flash`, and the expected answer.
- A guest image-only request returned the same GLM model markers and a correct
  description of the test image.

## 2026-09-10 — Restore report date alignment

### Solved
- Kept the meal name and image icon grouped on the left.
- Restored the report date/time to the top-right with `margin-left: auto`.

## 2026-09-10 — Keep report name and image icon adjacent

### Solved
- Wrapped the meal name and image trigger in a tight flex group.
- Removed the flexible growth from the meal name that was pushing the icon
  across the report header.

## 2026-09-10 — Simplify report image icon placement

### Solved
- Removed the square border and padding from the report image trigger.
- Replaced the overlapping `Images` glyph with a single `Image` glyph.
- The icon now sits immediately to the right of the meal name in report
  headers, with a tight 4px gap.

## 2026-09-10 — Reduce viewer size and close by click

### Solved
- Reduced the standalone image bounds to 80% of the viewport.
- Removed the X button; clicking anywhere in the overlay or pressing Escape
  closes the image.

## 2026-09-10 — Mount report image viewer outside report layout

### Solved
- Rendered `ImageViewer` through a `document.body` portal.
- Report image overlays now escape inline report spans and their layout constraints,
  matching the chat image viewer behavior.

### Verified
- Production build passed.
- PM2 `inschat` restarted successfully and port 3001 returns HTTP 200.
