import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// Only fixed, repository-authored wizard constants are read. This generator has
// no application-data, credentials, database, network, or renderer dependencies.
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../..');
const sourceRoot = 'src/lib/creation-wizard';
const sources = [];
const sourceBytes = new Map();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const taxonomyFields = {
  WIZARD_CHANNELS: 'channels',
  WIZARD_LENGTHS: 'lengths',
  WIZARD_LENGTH_META: 'lengthMeta',
  WIZARD_GENRES_BY_CHANNEL: 'genresByChannel',
  WIZARD_SUBGENRES: 'subgenres',
  WIZARD_BACKGROUNDS: 'backgrounds',
  WIZARD_STYLES_BY_CHANNEL: 'stylesByChannel',
  WIZARD_FLOWS: 'flows',
  WIZARD_ARCHETYPES: 'archetypes',
  WIZARD_GENRE_UNION: 'genreUnion',
  WIZARD_TAG_GROUP_VOCABS: 'tagGroupVocabs',
};

async function readSource(relativePath) {
  assert.ok(relativePath.startsWith(`${sourceRoot}/`), 'Read only the fixed wizard source directory.');
  assert.ok(!relativePath.split('/').includes('..'), 'Source paths may not escape their directory.');
  const bytes = await readFile(path.join(repository, relativePath));
  assert.ok(!sourceBytes.has(relativePath), `Read each source once: ${relativePath}`);
  sourceBytes.set(relativePath, bytes);
  sources.push({ path: relativePath, sha256: hash(bytes), bytes: bytes.length });
  const text = bytes.toString('utf8');
  const ast = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length, 0, `Invalid TypeScript source: ${relativePath}`);
  return { text, ast };
}

function unwrap(node) {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}

// The few derived taxonomy constants need Set/Object.values/flat. Explicitly
// allow these expressions instead of executing arbitrary module initialization.
function validateConstant(node, declaredNames) {
  node = unwrap(node);
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return;
  if (ts.isIdentifier(node)) {
    assert.ok(declaredNames.has(node.text), `Unexpected constant reference: ${node.text}`);
    return;
  }
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      assert.ok(ts.isPropertyAssignment(property), 'Only plain data properties are permitted.');
      assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name), 'Computed property names are not permitted.');
      validateConstant(property.initializer, declaredNames);
    }
    return;
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) validateConstant(ts.isSpreadElement(element) ? element.expression : element, declaredNames);
    return;
  }
  if (ts.isElementAccessExpression(node)) {
    validateConstant(node.expression, declaredNames);
    assert.ok(ts.isStringLiteral(node.argumentExpression), 'Only literal taxonomy lookups are permitted.');
    return;
  }
  if (ts.isPropertyAccessExpression(node)) {
    validateConstant(node.expression, declaredNames);
    assert.ok(node.name.text === 'default', 'Only the fixed style default property is permitted.');
    return;
  }
  if (ts.isNewExpression(node)) {
    assert.ok(ts.isIdentifier(node.expression) && node.expression.text === 'Set', 'Only Set construction is permitted.');
    assert.ok((node.arguments?.length ?? 0) <= 1);
    for (const argument of node.arguments ?? []) validateConstant(argument, declaredNames);
    return;
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const callee = node.expression;
    if (ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' && callee.name.text === 'values') {
      assert.equal(node.arguments.length, 1);
      validateConstant(node.arguments[0], declaredNames);
      return;
    }
    if (callee.name.text === 'flat') {
      assert.equal(node.arguments.length, 0);
      validateConstant(callee.expression, declaredNames);
      return;
    }
  }
  throw new Error(`Unsupported constant expression: ${ts.SyntaxKind[node.kind]}`);
}

function plainData(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => Object.prototype.toString.call(item) === '[object Set]' ? [...item] : item));
}

function evaluateSelectedConstants(source, expectedNames, allowOtherStatements = false) {
  const names = new Set();
  const selected = [];
  for (const statement of source.ast.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        assert.ok(ts.isIdentifier(declaration.name), 'Destructuring constants are not supported.');
        const name = declaration.name.text;
        if (!expectedNames.includes(name)) {
          assert.ok(allowOtherStatements, `Unexpected taxonomy export: ${name}`);
          continue;
        }
        assert.ok(statement.declarationList.flags & ts.NodeFlags.Const);
        assert.ok(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
        assert.ok(declaration.initializer);
        assert.ok(!names.has(name), `Duplicate constant: ${name}`);
        validateConstant(declaration.initializer, names);
        selected.push(`export const ${name} = ${declaration.initializer.getText(source.ast)};`);
        names.add(name);
      }
    } else if (!allowOtherStatements) {
      assert.ok(ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement), 'Taxonomy must contain only data and types.');
    }
  }
  assert.deepEqual([...names].sort(), [...expectedNames].sort(), 'Every expected constant must be extracted.');
  const compiled = ts.transpileModule(selected.join('\n'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
  const context = vm.createContext({ exports: Object.create(null) }, {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });
  vm.runInContext(compiled.outputText, context, { timeout: 1000 });
  return plainData(context.exports);
}

const taxonomySource = await readSource(`${sourceRoot}/taxonomy.ts`);
const taxonomyExports = evaluateSelectedConstants(taxonomySource, Object.keys(taxonomyFields));
const taxonomy = Object.fromEntries(Object.entries(taxonomyFields).map(([original, field]) => [field, taxonomyExports[original]]));
const filterSource = await readSource(`${sourceRoot}/filter.ts`);
const filterExports = evaluateSelectedConstants(filterSource, ['DEFAULT_FILTERS', 'WIZARD_CATEGORIES'], true);
const defaultFilters = filterExports.DEFAULT_FILTERS;
const categories = filterExports.WIZARD_CATEGORIES;
assert.deepEqual(defaultFilters.tags, { sub: [], bg: [], style: [], flow: [] });

// Follow the real index imports and spread order; never reconstruct or sample
// the corpus from titles, categories, or a separate design-time corpus.
const indexSource = await readSource(`${sourceRoot}/templates/index.ts`);
const imports = new Map();
let templateOrder;
for (const statement of indexSource.ast.statements) {
  if (ts.isImportDeclaration(statement)) {
    if (statement.importClause?.isTypeOnly) continue;
    assert.ok(ts.isStringLiteral(statement.moduleSpecifier));
    assert.match(statement.moduleSpecifier.text, /^\.\/[a-z-]+$/);
    const bindings = statement.importClause?.namedBindings;
    assert.ok(bindings && ts.isNamedImports(bindings));
    for (const specifier of bindings.elements) {
      assert.ok(!specifier.isTypeOnly && !specifier.propertyName, 'Template imports must use their original constant names.');
      assert.ok(!imports.has(specifier.name.text));
      imports.set(specifier.name.text, `${sourceRoot}/templates/${statement.moduleSpecifier.text.slice(2)}.ts`);
    }
  } else if (ts.isVariableStatement(statement)) {
    assert.equal(statement.declarationList.declarations.length, 1);
    const declaration = statement.declarationList.declarations[0];
    assert.ok(ts.isIdentifier(declaration.name) && declaration.name.text === 'WIZARD_TEMPLATES');
    const array = unwrap(declaration.initializer);
    assert.ok(ts.isArrayLiteralExpression(array));
    templateOrder = array.elements.map((element) => {
      assert.ok(ts.isSpreadElement(element) && ts.isIdentifier(element.expression));
      assert.ok(imports.has(element.expression.text));
      return element.expression.text;
    });
  } else {
    throw new Error('Unexpected executable statement in the template index.');
  }
}
assert.ok(templateOrder?.length > 0);
assert.deepEqual([...new Set(templateOrder)].sort(), [...imports.keys()].sort(), 'Every imported corpus must be included exactly once.');
assert.equal(templateOrder.length, imports.size);

const templates = [];
const templateGroups = [];
for (const constant of templateOrder) {
  const relativePath = imports.get(constant);
  const source = await readSource(relativePath);
  let records;
  for (const statement of source.ast.statements) {
    if (ts.isImportDeclaration(statement)) {
      assert.ok(statement.importClause?.isTypeOnly, 'Template modules may only have type imports.');
      continue;
    }
    assert.ok(ts.isVariableStatement(statement) && statement.declarationList.declarations.length === 1, 'Template modules must contain one fixed array.');
    const declaration = statement.declarationList.declarations[0];
    assert.ok(ts.isIdentifier(declaration.name) && declaration.name.text === constant);
    assert.ok(records === undefined, 'Duplicate template constant.');
    const array = unwrap(declaration.initializer);
    assert.ok(ts.isArrayLiteralExpression(array));
    records = array.elements.map((element) => {
      assert.ok(ts.isObjectLiteralExpression(element), 'Templates must be literal JSON objects.');
      return JSON.parse(element.getText(source.ast));
    });
  }
  assert.ok(records?.length > 0);
  templateGroups.push({ constant, source: relativePath, count: records.length });
  templates.push(...records);
}

assert.equal(new Set(templates.map((template) => template.id)).size, templates.length, 'Template IDs must be unique.');
for (const template of templates) {
  for (const field of ['id', 'cat', 'title', 'summary', 'prompt']) assert.ok(typeof template[field] === 'string' && template[field].length > 0, `Missing template field: ${field}`);
  assert.ok(categories.includes(template.cat));
  for (const field of ['channels', 'genres', 'tags']) assert.ok(Array.isArray(template[field]) && template[field].every((item) => typeof item === 'string'));
  if (template.lengths !== undefined) assert.ok(Array.isArray(template.lengths) && template.lengths.every((item) => taxonomy.lengths.includes(item)));
  if (template.archetype !== undefined) assert.equal(typeof template.archetype, 'string');
}
assert.equal(taxonomy.genreUnion.length, new Set(Object.values(taxonomy.genresByChannel).flat()).size);

const data = {
  taxonomy,
  defaultFilters,
  categories,
  templates,
  metadata: {
    schemaVersion: 1,
    generator: 'design/chat-empty-state/build-wizard-data.mjs',
    globalName: 'XAANINK_WIZARD_DATA',
    sourcePolicy: 'Repository-authored fixed wizard presets only; no user data, credentials, network, or database access.',
    serialization: 'All original template fields and source index order preserved; DEFAULT_FILTERS Sets become arrays; JSON less-than signs and JavaScript line separators are escaped.',
    sources,
    taxonomyFieldSources: taxonomyFields,
    defaultFiltersSource: `${sourceRoot}/filter.ts#DEFAULT_FILTERS`,
    categoriesSource: `${sourceRoot}/filter.ts#WIZARD_CATEGORIES`,
    templateGroups,
    counts: {
      templates: templates.length,
      uniqueIds: new Set(templates.map((template) => template.id)).size,
      byCategory: Object.fromEntries(categories.map((category) => [category, templates.filter((template) => template.cat === category).length])),
      withLengths: templates.filter((template) => template.lengths !== undefined).length,
      withArchetype: templates.filter((template) => template.archetype !== undefined).length,
    },
  },
};

const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const output = `// Generated by build-wizard-data.mjs from fixed repository presets.\n// Source paths and SHA-256 hashes are in metadata.sources.\nwindow.XAANINK_WIZARD_DATA = ${json};\n`;
assert.ok(!json.includes('<'));
const verification = vm.createContext({ window: Object.create(null) }, { codeGeneration: { strings: false, wasm: false } });
vm.runInContext(output, verification, { timeout: 1000 });
assert.deepEqual(plainData(verification.window.XAANINK_WIZARD_DATA), data, 'The ordinary browser script must preserve the entire source payload.');

// Confirm that every source still matches the bytes used for this run before
// writing the only generated artifact. Source edits always require regeneration.
for (const source of sources) {
  const currentBytes = await readFile(path.join(repository, source.path));
  assert.equal(hash(currentBytes), source.sha256, `Source changed during generation: ${source.path}`);
}
const outputPath = path.join(directory, 'wizard-data.js');
await writeFile(outputPath, output);
const written = await readFile(outputPath, 'utf8');
assert.equal(written, output);
console.log(JSON.stringify({ output: 'design/chat-empty-state/wizard-data.js', bytes: Buffer.byteLength(output), sha256: hash(output), sourceFiles: sources.length, counts: data.metadata.counts, verified: ['complete preset corpus', 'source index order', 'unique template IDs', 'source SHA-256 hashes', 'all template fields', 'default Set serialization', 'ordinary window script round trip', 'escaped less-than characters'] }, null, 2));
