# Test set (RP-8, RP-14)

20 before/after pairs, same table, lighting and background. Name files
`NN-<slot>-before.jpg` / `NN-<slot>-after.jpg` in `test-set/photos/`.
Photos are gitignored; share them through the team drive.

| # | Scenario | Expected | Result | Notes |
| --- | --- | --- | --- | --- |
| 01 | No change | 0 findings | | |
| 02 | No change | 0 findings | | |
| 03 | Dirt only | 0 findings, dirt in ignored_changes | | |
| 04 | Dirt only | 0 findings, dirt in ignored_changes | | |
| 05 | Lighting change | 0 findings | | |
| 06 | Small angle change | 0 findings | | |
| 07 | One scratch (demo scratch) | 1 scratch, conf >= 0.80 | | |
| 08 | One scratch (demo scratch) | 1 scratch, conf >= 0.80 | | |
| 09 | One scratch (demo scratch) | 1 scratch, conf >= 0.80 | | |
| 10 | One small scratch | 1 scratch | | |
| 11 | One dent | 1 dent | | |
| 12 | One dent | 1 dent | | |
| 13 | Missing part | 1 missing_part | | |
| 14 | Missing part | 1 missing_part | | |
| 15 | Two damages in one photo | 2 findings | | |
| 16 | Two damages in one photo | 2 findings | | |
| 17 | Blurry photo | image_quality_ok false | | |
| 18 | Too dark | image_quality_ok false | | |
| 19 | Pre-existing scratch | 0 findings | | |
| 20 | Pre-existing scratch + new dirt | 0 findings | | |
