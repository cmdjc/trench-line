// Maps (prototype lines 656–664). River x-extents were computed from the
// default 9-trench layout (LX[i] = 150 + i*230, so LX[4]=1070, LX[5]=1300,
// LX[6]=1530); the river map only plays at 9 trenches, so the literals below
// preserve the prototype's arithmetic exactly.

export const MAPS = {
  open: { name: 'No man\u2019s land', blurb: 'Open, cratered ground and nine trenches.', rivers: [] },
  river: { name: 'River crossing', blurb: 'Two river channels cut the field around a central island at trench 5. Troops and tanks can only cross at the bridges, where they bunch up under fire.',
           rivers: [{ x0: 1149, x1: 1221, b: [72, 228] }, { x0: 1379, x1: 1451, b: [72, 228] }] },
  plain: { name: 'Wide open plain', blurb: 'A long front: 17 trenches and no cover between them. Trenches 4 and 14 are super trenches, a double line with a wall between: far stronger cover, room for 5 emplacements, 1 extra supply a second for whoever holds them, and belts of steel hedgehogs that stop the attacker\u2019s tanks until infantry take the trench.',
           rivers: [], n: 17, dbl: [4, 14] },
  march: { name: 'The Long March', blurb: '45 trenches in nine fortified belts with wide empty ground between them, and a super trench in the middle. Troops walk a long way from the HQ, so each side starts with a railway through its first belt of trenches and one transport train. The track only runs as far as you hold, and you can build it on.',
           rivers: [], belts: 9, per: 5, tight: 150, gap: 520, super: true, startTrack: 5, startTrains: 1 }
  // startTrack: segments pre-laid free for each side (the first belt, = per); startTrains: free transport trains each
};
