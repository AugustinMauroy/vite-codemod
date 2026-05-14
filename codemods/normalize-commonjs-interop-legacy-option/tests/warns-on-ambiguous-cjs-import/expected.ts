// Expected warning:
// Warning: Ambiguous CJS default import semantics require manual review.
import value from './legacy-cjs.cjs'

export const exportedValue = value
