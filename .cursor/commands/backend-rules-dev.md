# backend-rules-dev

Update the rules to add multi-language support (internationalization and localization) so that everything is localized. the response should include the locale. During development, define the en locale first and ensure it is complete. All the other locales will be implemented in the last phase of the development process. The locale files must be organized in the locale folder for resuability and maintainability.

Organize the dev-plan chronologically such that the app cores, logic and setup are implemented first. All the app specific aspects such as: db models, modules, enpoints, etc, should be implemented last.

No app specific aspects should be included in the rules. All app specific aspects should be moved to the dev-plan folder and created chronologically. Before implementing any app specific aspects, the app/server should minimally run without any errors.

Create and always update the seeder (use facker). Create a seeding script and add it to the package.json. There should be a dynamic way to set the number of records to be seeded, maybe via environment variables or in a special seeds constants table for each table

If it means creating new files, do so. Make sure the dev-plan is chronological and each step implements an atomic feature/aspect of the app. Whoever uses the dev-plan and rules, should produce a similar project/app. Create one file at a time and ensure: preciseness, conciseness, brevity, completeness without duplicates and contradictions.

Ensure there are no duplicates and contradictions.
