// Permanent research tree (prototype lines 535–557, verbatim).
//
// WARNING: node order is the save-code mask (bit i = the i-th id in declaration
// order). It is an append-only contract — never reorder or insert, only append.
// TECH_IDS() pins the order in tests/unit/data.test.js.

export const TECH = [
  { branch: 'Infantry', nodes: [
    { id: 'marks', name: 'Marksman training', cost: 15, text: 'Riflemen deal 10% more damage.' },
    { id: 'kit', name: 'Field kit', cost: 30, text: 'Infantry have 10% more health.' },
    { id: 'craft', name: 'Fieldcraft', cost: 50, text: 'Infantry move 15% faster.' },
    { id: 'vets', name: 'Veteran cadre', cost: 80, text: 'Start each battle with extra riflemen worth 80 supplies.' }] },
  { branch: 'Fortification', nodes: [
    { id: 'deep', name: 'Deeper trenches', cost: 15, text: 'Your troops in trenches take 8% less damage.' },
    { id: 'walls', name: 'Concrete HQ', cost: 30, text: 'Your HQ has 400 more health.' },
    { id: 'guns', name: 'HQ gun pits', cost: 50, text: 'Your HQ guns hit 40% harder.' },
    { id: 'aid', name: 'Aid posts', cost: 80, text: 'Troops resting in a trench recover 1 health per second.' }] },
  { branch: 'Logistics', nodes: [
    { id: 'stock', name: 'Stockpile', cost: 15, text: 'Start each battle with 40 more supplies.' },
    { id: 'rail', name: 'Light railway', cost: 30, text: '+0.4 supplies every second.' },
    { id: 'econ', name: 'War economy', cost: 50, text: '+20% supplies from kills.' },
    { id: 'intel', name: 'Staff planning', cost: 80, text: 'Choose from 4 cards each time, up from 3.' }] },
  { branch: 'Armour', nodes: [
    { id: 'mech', name: 'Mechanics', cost: 20, text: 'Tanks have 10% more health.' },
    { id: 'gunnery', name: 'Gunnery school', cost: 40, text: 'Tanks and mortars deal 10% more damage.' },
    { id: 'works', name: 'Tank works', cost: 60, text: 'Tanks cost 10% less.' },
    { id: 'corps', name: 'Tank corps', cost: 90, text: 'The tank unlock is always offered in your first card choice.' },
    { id: 'titan', name: 'Landships', cost: 120, text: 'Super-heavy tanks, such as Germany\u2019s Ratte, are available from the start of every battle. No card needed.' }] },
  { branch: 'HQ Walls', nodes: [
    { id: 'bw1', name: 'HQ Walls I', cost: 25, text: 'Your HQ starts each battle with HQ Walls at tier 1.' },
    { id: 'bw2', name: 'HQ Walls II', cost: 60, text: 'Your HQ starts each battle with HQ Walls at tier 2.' }] },
  { branch: 'Supply Depot', nodes: [
    { id: 'bd1', name: 'Supply Depot I', cost: 25, text: 'Your HQ starts each battle with a Supply Depot at tier 1.' },
    { id: 'bd2', name: 'Supply Depot II', cost: 60, text: 'Your HQ starts each battle with a Supply Depot at tier 2.' }] },
  { branch: 'Field Hospital', nodes: [
    { id: 'bh1', name: 'Field Hospital I', cost: 25, text: 'Your HQ starts each battle with a Field Hospital at tier 1.' },
    { id: 'bh2', name: 'Field Hospital II', cost: 60, text: 'Your HQ starts each battle with a Field Hospital at tier 2.' }] },
  { branch: 'National works', nodes: [
    { id: 'bn1', name: 'National works I', cost: 40, text: 'Your nation\u2019s base upgrade starts each battle at tier 1.' },
    { id: 'bn2', name: 'National works II', cost: 90, text: 'Your nation\u2019s base upgrade starts each battle at tier 2.' }] }
];

/** Flat list of tech ids in declaration (= save-mask bit) order. */
export const TECH_IDS = () => TECH.flatMap(b => b.nodes.map(n => n.id));
