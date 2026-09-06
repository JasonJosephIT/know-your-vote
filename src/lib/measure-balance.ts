/* The measure symmetry rule, kept in its own dependency-free module so
   scripts/verify-measure-balance.ts can run it under Node's native type
   stripping — the same reason notifications/schedule.ts is separate from its
   route. Importing it from measures.ts would drag in next/cache.

   This mirrors measure_sides_balanced() in 0010_ballot_measure.sql. The two
   must agree: the database refuses to publish a measure that fails it, and
   the read layer refuses to render one. */
export function sidesBalanced(supportCount: number, opposeCount: number): boolean {
  return (
    supportCount > 0 && opposeCount > 0 && Math.abs(supportCount - opposeCount) <= 1
  );
}
