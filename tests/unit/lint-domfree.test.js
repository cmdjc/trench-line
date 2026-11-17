// Negative lint test: the flat config must NOT grant browser globals to the
// simulation trees (src/sim, src/data, src/core), so an accidental DOM reach
// there is a lint error. Verifies the config with the ESLint API in memory.

import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import config from '../../eslint.config.js';

const linter = new Linter({ configType: 'flat' });
const probe = 'document.title = "x";\nif (window) localStorage.setItem("a", "b");\n';

const errors = (filePath) => linter.verify(probe, config, filePath).filter(m => m.ruleId === 'no-undef');
const undefNames = (filePath) => errors(filePath).map(m => m.message);

describe('lint keeps the simulation DOM-free', () => {
  it.for([
    'src/sim/state.js',
    'src/sim/combat.js',
    'src/data/units.js',
    'src/core/rng.js',
  ])('%s rejects document/window/localStorage', (filePath) => {
    const names = undefNames(filePath);
    expect(names.join(' ')).toContain('document');
    expect(names.join(' ')).toContain('window');
    expect(names.join(' ')).toContain('localStorage');
  });

  it.for([
    'src/ui/hud.js',
    'src/main.js',
    'src/storage.js',
  ])('%s still allows browser globals', (filePath) => {
    expect(errors(filePath)).toHaveLength(0);
  });

  it('clean sim code produces no errors', () => {
    const msgs = linter.verify('export const rng = 1;\n', config, 'src/sim/state.js');
    expect(msgs).toHaveLength(0);
  });
});
