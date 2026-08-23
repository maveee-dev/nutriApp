# Food evaluation validation

The repository fixture at `prisma/import/fixtures/food-evaluation-validation-cases.json` contains representative USDA FoodData Central Foundation Foods cases across fruit, vegetables, grains, meat, dairy, and a processed food. Nutrient amounts are stored on the canonical per-100-gram basis used by the importer.

Run the validation with the checked-in fixture:

```powershell
npm.cmd run validate:food-evaluation
```

The report is written to `food-evaluation-validation-report.json`. To validate another reviewed dataset, set `FOOD_EVALUATION_VALIDATION_INPUT`; `FOOD_EVALUATION_VALIDATION_OUTPUT` can override the report path.

Expected scores and coverage in the fixture are the reviewed V1 baseline. A future evaluator or policy change should rerun this command and review any `needs-review` result before updating the baseline.
