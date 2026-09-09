# Parallel Work Planner

Parallelize only independent slices, maximum 2–3 tasks. Every task declares owned paths, read-only paths, and prohibited overlaps; migrations and shared contracts have a single owner. Prefer sequential execution when dependencies are strong.
