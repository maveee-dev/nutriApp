import { readFile, writeFile } from 'node:fs/promises';
import { FoodEvaluationValidation, FoodEvaluationValidationCase } from '../../src/nutrition/evaluation/validation/food-evaluation-validation.js';

const defaultInputPath = new URL('./fixtures/food-evaluation-validation-cases.json', import.meta.url);
const inputPath = process.env.FOOD_EVALUATION_VALIDATION_INPUT ?? defaultInputPath;

const outputPath = process.env.FOOD_EVALUATION_VALIDATION_OUTPUT ?? 'food-evaluation-validation-report.json';
const raw = JSON.parse(await readFile(inputPath, 'utf8')) as { cases?: FoodEvaluationValidationCase[] } | FoodEvaluationValidationCase[];
const cases = Array.isArray(raw) ? raw : raw.cases;
if (!Array.isArray(cases)) throw new Error('Validation input must be an array or an object with a cases array.');

const validator = new FoodEvaluationValidation();
const results = cases.map((testCase) => validator.evaluate(testCase));
await writeFile(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
console.log(`Wrote ${results.length} food evaluation validation results to ${outputPath}.`);
console.log(`Needs review: ${results.filter((result) => result.technicalResult === 'needs-review').length}.`);
