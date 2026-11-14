/* Dead Miles (next) - house generator. Seeded: the same (type, seed) always gives the same house.
   Output is a plain layout object consumed by house.js (see the format notes there). */
'use strict';
(() => {
  const D = DM.D;
  const GEN = DM.Gen = {};

  // ---------------------------------------------------------------- furniture specs
  // F(art, w, h, H, opts): opts.loot (table key), time, noise, place ('n' north wall | 's' side wall | 'c' centre | 'wall' wall-mounted),
  // n [min,max] count, p chance, lock difficulty, solid
  const F = (art, w, h, H, o = {}) => Object.assign({ art, w, h, H, place: 'n', n: [1, 1], p: 1 }, o);
  const L_ = (loot, name, time, noise) => ({ loot, name, time, noise });
  const ROOMS = {
    hall: { n: 'Hallway', st: 'h', f: [F('coat', 1, 1, 64, { ...L_('coat', 'Coat closet', 2.4, 4.5), place: 's', p: .7 }), F('sidetable', 1, 1, 24, { ...L_('hall', 'Hall table', 1.4, 2), place: 's', p: .6 }), F('shoerack', 1, 1, 14, { place: 's', p: .5 })] },
    foyer: { n: 'Foyer', st: 'h', f: [F('coat', 1, 1, 64, L_('coat', 'Coat closet', 2.4, 4.5)), F('sidetable', 1, 1, 24, L_('hall', 'Hall table', 1.4, 2)), F('plant', 1, 1, 20, { n: [1, 2] })] },
    living: { n: 'Living room', st: 'l', f: [F('sofa', 3, 1, 26, { sofa: 1 }), F('sidetable', 1, 1, 24, { ...L_('side', 'Side table', 1.4, 2), p: .8 }), F('coffee', 3, 1, 16, { place: 'c', p: .8 }),
      F('tvstand', 3, 1, 26, { ...L_('tv', 'TV stand', 1.8, 2.5), place: 'c' }), F('armchair', 1, 1, 22, { place: 'c', p: .6 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .6 }), F('plant', 1, 1, 20, { p: .7 })] },
    kitchen: { n: 'Kitchen', st: 'k', f: [F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('stove', 1, 1, 32), F('sink', 2, 1, 32),
      F('drawers', 1, 1, 32, { ...L_('kdrawers', 'Kitchen drawers', 1.6, 3.5), p: .8 }), F('pantry', 2, 1, 62, { ...L_('pantry', 'Pantry', 2.6, 4.5), p: .7 }), F('trash', 1, 1, 26, { p: .6 }),
      F('island', 3, 1, 32, { ...L_('island', 'Island drawers', 1.8, 3), place: 'c', p: .5 }), F('table', 3, 2, 24, { place: 'c', p: .6, table: 1, cloth: 1, items: 1 })] },
    dining: { n: 'Dining room', st: 'w', f: [F('table', 3, 2, 24, { place: 'c', table: 1, cloth: 1, items: 1 }), F('hutch', 2, 1, 62, L_('hutch', 'China hutch', 2.2, 4)), F('plant', 1, 1, 20, { p: .5 })] },
    bath: { n: 'Bathroom', st: 'b', f: [F('toilet', 1, 1, 24), F('vanity', 2, 1, 30, L_('vanity', 'Vanity', 1.6, 2.5)), F('medcab', 1, 1, 0, { ...L_('medcab', 'Medicine cabinet', 1.5, 2), place: 'wall', solid: 0, p: .85 }), F('tub', 2, 2, 24, { p: .7 })] },
    bedroom: { n: 'Bedroom', st: 'r', f: [F('bed', 2, 3, 18), F('nightstand', 1, 1, 24, L_('night', 'Nightstand', 1.5, 2)), F('wardrobe', 2, 1, 64, { ...L_('wardrobe', 'Wardrobe', 2.8, 5), lockable: 'easy' }),
      F('dresser', 3, 1, 34, { ...L_('dresser', 'Dresser', 2.4, 3.5), p: .7 }), F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), p: .35 }), F('safe', 1, 1, 46, { ...L_('safe', 'Gun safe', 2.2, 2), place: 's', p: .15, lockable: 'hard' })] },
    closet: { n: 'Utility closet', st: 'c', f: [F('shelves', 2, 1, 58, L_('shelves', 'Utility shelves', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Toolbox', 1.8, 3.5), lockable: 'medium' }), F('heater', 1, 1, 54, { p: .4 })] },
    office: { n: 'Office', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), desk: 1 }), F('filing', 1, 1, 40, { ...L_('filing', 'Filing cabinet', 1.8, 3), lockable: 'easy' }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .6 }), F('plant', 1, 1, 20, { p: .4 })] },
    study: { n: 'Study', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Writing desk', 2, 2.5), desk: 1 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), n: [2, 3] }), F('safe', 1, 1, 46, { ...L_('safe', 'Wall safe', 2.2, 2), place: 's', lockable: 'hard' }), F('armchair', 1, 1, 22, { place: 'c' })] },
    storage: { n: 'Storage', st: 'g', f: [F('shelves', 2, 1, 58, { ...L_('storage', 'Storage shelves', 2.4, 4), n: [2, 3] }), F('boxes', 2, 1, 40, { n: [1, 2], place: 's' }), F('crate', 2, 1, 30, { ...L_('storage', 'Crate', 2.4, 4), place: 'c', p: .5 })] },
    store: { n: 'Store', st: 'm', f: [F('fridge', 1, 1, 62, { ...L_('cooler', 'Drinks cooler', 2, 4.5), n: [2, 3] }), F('register', 3, 1, 34, { ...L_('register', 'Register', 1.6, 2.5), place: 'front' }), F('shopshelf', 3, 1, 34, { ...L_('store', 'Shelf', 1.8, 2.5), place: 'c', n: [2, 4] })] },
    pharmfloor: { n: 'Pharmacy', st: 'm', f: [F('register', 3, 1, 34, { ...L_('register', 'Counter', 1.6, 2.5), place: 'front' }), F('fridge', 1, 1, 62, L_('cooler', 'Drinks cooler', 2, 4.5)), F('shopshelf', 3, 1, 34, { ...L_('pharm', 'Shelf', 1.8, 2.5), place: 'c', n: [2, 4] })] },
    pharmback: { n: 'Back storage', st: 'g', f: [F('cage', 3, 1, 50, { ...L_('cage', 'Drug cage', 2.6, 2.5), lockable: 'medium', mustLock: 1 }), F('shelves', 2, 1, 58, { ...L_('pharmstore', 'Stock shelves', 2.4, 4), n: [1, 2] }), F('boxes', 2, 1, 40, { place: 's' })] },
    lobby: { n: 'Lobby', st: 't', f: [F('bench', 2, 1, 20, { n: [1, 2] }), F('plant', 1, 1, 20, { n: [1, 2] }), F('register', 3, 1, 34, { ...L_('register', 'Front desk', 1.6, 2.5), place: 'c', p: .7 })] },
    bullpen: { n: 'Bullpen', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), place: 'c', n: [2, 4], desk: 1 }), F('filing', 1, 1, 40, { ...L_('filing', 'Filing cabinet', 1.8, 3), n: [1, 2], lockable: 'easy' }), F('plant', 1, 1, 20, { p: .5 })] },
    lockers: { n: 'Locker room', st: 'g', f: [F('locker', 3, 1, 62, { ...L_('locker', 'Lockers', 2, 4), n: [1, 2], lockable: 'easy' }), F('bench', 2, 1, 20, { place: 'c' })] },
    evidence: { n: 'Evidence room', st: 'c', f: [F('shelves', 2, 1, 58, { ...L_('evidence', 'Evidence shelves', 2.4, 3), n: [1, 2] }), F('filing', 1, 1, 40, { ...L_('evidence', 'Evidence locker', 2, 3), lockable: 'medium' })] },
    armory: { n: 'Armory', st: 'x', f: [F('safe', 1, 1, 46, { ...L_('armory', 'Gun cabinet', 2.6, 2.5), lockable: 'hard', mustLock: 1 }), F('locker', 2, 1, 62, { ...L_('locker', 'Gear locker', 2, 4), lockable: 'medium' })] },
    breakroom: { n: 'Break room', st: 'k', f: [F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('table', 3, 2, 24, { place: 'c', table: 1, items: 1 })] },
    classroom: { n: 'Classroom', st: 't', f: [F('desk', 2, 1, 30, { ...L_('desk', "Teacher's desk", 2, 2.5), desk: 1 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .5 }), F('schooldesk', 1, 1, 20, { place: 'c', n: [3, 6] })] },
    nurse: { n: 'Nurse office', st: 'b', f: [F('medcab', 1, 1, 0, { ...L_('medcab', 'Medicine cabinet', 1.5, 2), place: 'wall', solid: 0 }), F('drawers', 1, 1, 32, L_('nurse', 'Supply drawers', 1.8, 3)), F('cot', 1, 2, 12, { place: 'c' })] },
    gym: { n: 'Gym', st: 'y', f: [F('shelves', 2, 1, 58, L_('gym', 'Equipment shelf', 2.4, 4)), F('locker', 3, 1, 62, { ...L_('locker', 'Gym lockers', 2, 4), lockable: 'easy' }), F('mat', 2, 2, 4, { place: 'c', n: [1, 2], solid: 0 }), F('bench', 2, 1, 20, { place: 'c' })] },
    janitor: { n: 'Janitor closet', st: 'c', f: [F('shelves', 2, 1, 58, L_('shelves', 'Janitor shelves', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Toolbox', 1.8, 3.5), lockable: 'medium' })] },
    bay: { n: 'Garage bay', st: 'g', f: [F('car', 3, 2, 30, { place: 'c' }), F('workbench', 3, 1, 34, L_('workbench', 'Workbench', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Tool chest', 1.8, 3.5), lockable: 'medium' }), F('shelves', 2, 1, 58, { ...L_('garage', 'Parts shelves', 2.4, 4), place: 's' })] },
    laundry: { n: 'Laundromat', st: 'q', f: [F('washer', 1, 1, 34, { ...L_('washer', 'Washer', 1.4, 2.5), n: [3, 5] }), F('washer', 1, 1, 34, { place: 'c', n: [2, 4] }), F('fridge', 1, 1, 62, L_('cooler', 'Vending machine', 2, 4.5)), F('register', 3, 1, 34, { ...L_('register', 'Attendant counter', 1.6, 2.5), place: 'front', p: .7 })] },
    backroom: { n: 'Back room', st: 'g', f: [F('shelves', 2, 1, 58, L_('storage', 'Supply shelves', 2.4, 4)), F('boxes', 2, 1, 40, { place: 's' })] },
    cellar: { n: 'Wine cellar', st: 'x', f: [F('winerack', 2, 1, 50, { ...L_('wine', 'Wine rack', 2, 3), n: [2, 3] }), F('crate', 2, 1, 30, L_('cellar', 'Old crate', 2.4, 4))] },
    // 0.14 (generator v4 only): extra rooms for more varied floor plans. Existing art and loot tables only.
    great: { n: 'Kitchen & living', st: 'k', f: [F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('stove', 1, 1, 32), F('sink', 2, 1, 32),
      F('drawers', 1, 1, 32, { ...L_('kdrawers', 'Kitchen drawers', 1.6, 3.5), p: .8 }), F('pantry', 2, 1, 62, { ...L_('pantry', 'Pantry', 2.6, 4.5), p: .45 }), F('sofa', 3, 1, 26, { sofa: 1, place: 'c' }),
      F('tvstand', 3, 1, 26, { ...L_('tv', 'TV stand', 1.8, 2.5), place: 'c', p: .8 }), F('coffee', 3, 1, 16, { place: 'c', p: .6 }), F('island', 3, 1, 32, { ...L_('island', 'Island drawers', 1.8, 3), place: 'c', p: .35 }), F('armchair', 1, 1, 22, { place: 'c', p: .4 }), F('plant', 1, 1, 20, { p: .5 })] },
    studio: { n: 'Studio', st: 'l', f: [F('bed', 2, 3, 18), F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('stove', 1, 1, 32), F('sink', 2, 1, 32),
      F('nightstand', 1, 1, 24, L_('night', 'Nightstand', 1.5, 2)), F('wardrobe', 2, 1, 64, { ...L_('wardrobe', 'Wardrobe', 2.8, 5), lockable: 'easy', p: .8 }), F('sofa', 3, 1, 26, { sofa: 1, place: 'c', p: .6 }),
      F('tvstand', 3, 1, 26, { ...L_('tv', 'TV stand', 1.8, 2.5), place: 'c', p: .6 }), F('drawers', 1, 1, 32, { ...L_('kdrawers', 'Kitchen drawers', 1.6, 3.5), p: .6 }), F('plant', 1, 1, 20, { p: .4 })] },
    porch: { n: 'Front porch', st: 'c', f: [F('bench', 2, 1, 20, { p: .6 }), F('plant', 1, 1, 20, { n: [1, 2], p: .7 }), F('coat', 1, 1, 64, { ...L_('coat', 'Porch closet', 2.2, 4), p: .35 }), F('shoerack', 1, 1, 14, { p: .4 })] },
    mudroom: { n: 'Mudroom', st: 'c', f: [F('coat', 1, 1, 64, L_('coat', 'Coat hooks', 2.2, 4)), F('shoerack', 1, 1, 14, { place: 's' }), F('bench', 2, 1, 20, { p: .6 }), F('shelves', 2, 1, 58, { ...L_('shelves', 'Mudroom shelves', 2.4, 4), p: .5 })] },
    pantryrm: { n: 'Pantry', st: 'k', f: [F('pantry', 2, 1, 62, L_('pantry', 'Pantry', 2.6, 4.5)), F('shelves', 2, 1, 58, { ...L_('pantry', 'Pantry shelves', 2.4, 4), p: .7 }), F('trash', 1, 1, 26, { p: .3 })] },
    laundryrm: { n: 'Laundry room', st: 'q', f: [F('washer', 1, 1, 34, { ...L_('washer', 'Washer', 1.4, 2.5), n: [1, 2] }), F('shelves', 2, 1, 58, { ...L_('shelves', 'Laundry shelves', 2.4, 4), p: .7 }), F('heater', 1, 1, 54, { p: .4 })] },
    nursery: { n: "Kids' room", st: 'r', f: [F('cot', 1, 2, 12), F('dresser', 3, 1, 34, L_('dresser', 'Dresser', 2.4, 3.5)), F('crate', 2, 1, 30, { ...L_('side', 'Toy chest', 1.6, 3), p: .7 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .4 }), F('plant', 1, 1, 20, { p: .3 })] },
    wc: { n: 'Half bath', st: 'b', f: [F('toilet', 1, 1, 24), F('vanity', 2, 1, 30, L_('vanity', 'Vanity', 1.6, 2.5)), F('medcab', 1, 1, 0, { ...L_('medcab', 'Medicine cabinet', 1.5, 2), place: 'wall', solid: 0, p: .6 })] },
    den: { n: 'Den', st: 'w', f: [F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .8 }), F('sofa', 3, 1, 26, { sofa: 1, p: .5 }), F('tvstand', 3, 1, 26, { ...L_('tv', 'TV stand', 1.8, 2.5), place: 'c', p: .7 }),
      F('armchair', 1, 1, 22, { place: 'c', n: [1, 2] }), F('sidetable', 1, 1, 24, { ...L_('side', 'Side table', 1.4, 2), p: .6 }), F('plant', 1, 1, 20, { p: .5 })] },
    sunroom: { n: 'Sunroom', st: 'l', f: [F('plant', 1, 1, 20, { n: [2, 3] }), F('armchair', 1, 1, 22, { place: 'c', n: [1, 2] }), F('sidetable', 1, 1, 24, { ...L_('side', 'Side table', 1.4, 2), p: .8 }), F('sofa', 3, 1, 26, { sofa: 1, p: .4 }), F('bench', 2, 1, 20, { p: .3 })] },
    courtyard: { n: 'Courtyard', st: 'Y', f: [F('plant', 1, 1, 20, { n: [2, 3] }), F('bench', 2, 1, 20, { place: 'c', n: [1, 2] }), F('plant', 1, 1, 20, { place: 'c', n: [1, 2] }), F('crate', 2, 1, 30, { ...L_('storage', 'Garden chest', 2.2, 3.5), place: 's', p: .5 })] },
  };
  // 0.14 (v4): a few extra optional pieces so rooms of the same kind are not furnished the same way every time
  const EXTRA4 = {
    bedroom: [F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .25 }), F('plant', 1, 1, 20, { p: .3 }), F('armchair', 1, 1, 22, { place: 'c', p: .2 })],
    living: [F('plant', 1, 1, 20, { p: .4 }), F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), p: .15, desk: 1 })],
    office: [F('armchair', 1, 1, 22, { place: 'c', p: .3 })],
    dining: [F('sidetable', 1, 1, 24, { ...L_('side', 'Sideboard', 1.4, 2), p: .4 })],
    kitchen: [F('plant', 1, 1, 20, { p: .25 })],
  };

  // ---------------------------------------------------------------- building recipes
  const R = {
    rowS: { w: [11, 13], h: [14, 17], spine: [2, 'side'], top: [5, 6, ['kitchen']], rooms: ['living', 'bedroom', 'bath', 'closet'], fill: ['bedroom', 'closet'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['shelf', 'rug', 'attic', 'panel'] },
    rowL: { w: [15, 18], h: [18, 21], spine: [3, 'side'], top: [5, 6, ['kitchen', 'dining']], rooms: ['living', 'bedroom', 'bedroom', 'bath', 'closet', 'office'], fill: ['bedroom', 'closet', 'bath'], roomH: [3, 6], zombies: [2, 3], locks: [1, 2], secrets: [1, 2], sec: ['shelf', 'rug', 'attic', 'panel'] },
    apt: { w: [11, 13], h: [10, 12], spine: [2, 'side'], top: [4, 5, ['living', 'kitchen']], rooms: ['bedroom', 'bath', 'closet'], fill: ['closet'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['rug', 'panel', 'shelf'] },
    bodega: { w: [12, 14], h: [11, 13], front: [6, 7, 'store'], spine: [2, 'side'], rooms: ['storage', 'office', 'bath'], fill: ['storage'], roomH: [3, 5], zombies: [1, 3], locks: [1, 1], secrets: [1, 1], sec: ['panel', 'rug', 'attic'] },
    laundro: { w: [12, 14], h: [11, 13], front: [6, 7, 'laundry'], spine: [2, 'side'], rooms: ['backroom', 'office', 'bath'], fill: ['backroom'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['panel', 'rug'] },
    garage: { w: [14, 16], h: [12, 14], front: [7, 8, 'bay'], spine: [2, 'side'], rooms: ['office', 'storage', 'bath'], fill: ['storage'], roomH: [3, 5], zombies: [2, 3], locks: [1, 2], secrets: [1, 1], sec: ['panel', 'attic', 'rug'] },
    pharmacy: { w: [15, 17], h: [14, 16], front: [6, 7, 'pharmfloor'], spine: [2, 'side'], rooms: ['pharmback', 'office', 'bath', 'storage'], fill: ['storage'], roomH: [3, 5], zombies: [2, 4], locks: [2, 2], secrets: [1, 1], sec: ['panel', 'rug', 'attic'] },
    school: { w: [20, 23], h: [21, 24], front: [4, 5, 'lobby'], spine: [3, 'center'], top: [6, 7, ['gym']], rooms: ['classroom', 'classroom', 'classroom', 'nurse', 'bath', 'janitor', 'office'], fill: ['classroom'], roomH: [4, 6], zombies: [4, 6], locks: [2, 3], secrets: [1, 2], sec: ['panel', 'attic', 'shelf'] },
    police: { w: [20, 23], h: [20, 23], front: [4, 5, 'lobby'], spine: [3, 'center'], top: [5, 6, ['bullpen']], rooms: ['armory', 'evidence', 'lockers', 'office', 'bath', 'breakroom'], fill: ['office'], roomH: [3, 6], zombies: [5, 7], tough: .6, locks: [2, 3], secrets: [1, 2], sec: ['panel', 'shelf', 'rug'] },
    mansion: { w: [24, 27], h: [24, 27], front: [4, 5, 'foyer'], spine: [3, 'center'], top: [6, 7, ['kitchen', 'dining']], rooms: ['living', 'study', 'bedroom', 'bedroom', 'bath', 'cellar', 'closet', 'bath'], fill: ['bedroom', 'closet', 'office'], roomH: [4, 6], zombies: [4, 6], tough: .25, locks: [2, 3], secrets: [2, 3], sec: ['shelf', 'rug', 'attic', 'panel'] },
  };
  GEN.RECIPES = R;

  const NOTES = {
    supper: '"Grandpa never trusted banks. Said the floor under supper was the safest place in Brooklyn."',
    tv: '"Ma kept the rent money where nobody looks - under the rug, right where we watched the game."',
    desk: '"Told the new guy: the good stuff is under the floor by the desk. Nobody checks the floor."',
    any: '"If anything happens, lift the rug. Third board is loose. Don\'t tell your brother."',
  };
  const CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789bcdefghijklmnpqrstuvwxyz';
  const CHARS4 = 'ABCDEFGHIJKLMNPQRTUVWXY123456789bcdefghijklmnpqrstuvwxyz';   // v4: never 'S' / 'Z' (hidden room, attic)

  // ---------------------------------------------------------------- generator v4 (0.14): floor-plan archetypes
  // Owner: "The layouts all look the same." v1-3 build every house from one recipe (side hallway + fixed top band).
  // v4 picks one of several believable plans per building type, mirrors it, and assigns rooms by size and by
  // how many doors they have (bathrooms / closets are never walk-through rooms). Everything after the floor plan
  // (furniture, secrets, locks, keys, zombies) is the same code as before.
  const LEAF4 = new Set(['bath', 'wc', 'closet', 'pantryrm', 'laundryrm', 'cellar', 'armory', 'evidence', 'janitor', 'nurse', 'nursery', 'pharmback', 'storage', 'backroom']);
  // [min short side, min area]
  const MIN4 = { kitchen: [3, 15], living: [4, 16], dining: [3, 12], bedroom: [3, 12], study: [3, 12], office: [3, 9], den: [3, 12], sunroom: [3, 9], nursery: [3, 9],
    bath: [3, 9], wc: [2, 4], closet: [2, 3], pantryrm: [2, 4], laundryrm: [2, 4], mudroom: [2, 6], cellar: [3, 9], great: [5, 35], studio: [6, 42],
    gym: [5, 36], bullpen: [5, 30], classroom: [4, 16], lockers: [3, 12], breakroom: [3, 15], armory: [3, 6], evidence: [3, 6], storage: [3, 9], backroom: [3, 9], pharmback: [3, 12], nurse: [3, 9], janitor: [2, 4], hall: [2, 2] };
  const PUBLIC4 = new Set(['living', 'dining', 'kitchen', 'great', 'den', 'sunroom', 'mudroom', 'hall', 'office', 'breakroom', 'bullpen', 'gym', 'study', 'lockers', 'classroom']);
  const REQ4 = {
    rowS: { req: ['kitchen', 'living', 'bedroom', 'bath'], opt: ['closet', 'pantryrm', 'laundryrm', 'mudroom', 'nursery', 'wc', 'den', 'office', 'closet'], fill: ['bedroom', 'closet'], must: ['kitchen', 'bedroom', 'bath'] },
    rowL: { req: ['kitchen', 'living', 'dining', 'bedroom', 'bedroom', 'bath'], opt: ['bath', 'closet', 'office', 'nursery', 'laundryrm', 'pantryrm', 'den', 'sunroom', 'mudroom', 'wc', 'closet'], fill: ['bedroom', 'closet'], must: ['kitchen', 'bedroom', 'bath'] },
    apt: { req: ['kitchen', 'living', 'bedroom', 'bath'], opt: ['closet', 'wc', 'laundryrm', 'office', 'closet'], fill: ['closet'], must: ['kitchen', 'bedroom', 'bath'] },
    bodega: { req: ['storage', 'office', 'bath'], opt: ['backroom', 'closet', 'breakroom'], fill: ['storage'], must: [] },
    laundro: { req: ['backroom', 'office', 'bath'], opt: ['storage', 'closet'], fill: ['backroom'], must: [] },
    garage: { req: ['office', 'storage', 'bath'], opt: ['closet', 'breakroom', 'storage'], fill: ['storage'], must: [] },
    pharmacy: { req: ['pharmback', 'office', 'bath', 'storage'], opt: ['closet', 'breakroom'], fill: ['storage'], must: ['pharmback'] },
    school: { req: ['gym', 'classroom', 'classroom', 'classroom', 'nurse', 'bath', 'janitor', 'office'], opt: ['classroom', 'bath', 'storage', 'breakroom', 'office'], fill: ['classroom', 'storage'], must: ['bath'], tol: 3 },
    police: { req: ['bullpen', 'armory', 'evidence', 'lockers', 'office', 'bath', 'breakroom'], opt: ['office', 'closet', 'storage', 'bath'], fill: ['office', 'closet'], must: ['armory', 'bath'], tol: 2 },
    mansion: { req: ['kitchen', 'dining', 'living', 'study', 'bedroom', 'bedroom', 'bath', 'cellar', 'closet', 'bath'], opt: ['bedroom', 'nursery', 'office', 'laundryrm', 'pantryrm', 'sunroom', 'den', 'wc', 'closet'], fill: ['bedroom', 'closet', 'office'], must: ['kitchen', 'bedroom', 'bath'] },
  };
  const ARCH4 = {
    rowS: ['side', 'center', 'rail', 'open', 'lhall', 'front'],
    rowL: ['side', 'center', 'rail', 'open', 'lhall', 'front'],
    apt: ['studio', 'corridor', 'through', 'twobed', 'galley'],
    shop: ['side', 'back', 'direct', 'nook'],
    big: ['spine', 'cross', 'twin'],
    mansion: ['central', 'wings', 'grand', 'court'],
  };
  GEN.ARCH4 = ARCH4;

  function plan4(type, I, rnd, rc) {
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const rooms = [], links = [];
    const bw = b => b.x1 - b.x0 + 1, bh = b => b.y1 - b.y0 + 1, area = b => bw(b) * bh(b);
    const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
    const add = (b, t, o) => { const r = Object.assign({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, t: t || null }, o || {}); rooms.push(r); return r; };
    const link = (a, b) => { if (a && b && a !== b && !links.some(l => (l[0] === a && l[1] === b) || (l[0] === b && l[1] === a))) links.push([a, b]); };
    // a strip of n tiles off side s: [strip, rest] (the wall between them is one tile)
    const take = (b, s, n) => s === 's' ? [box(b.x0, b.y1 - n + 1, b.x1, b.y1), box(b.x0, b.y0, b.x1, b.y1 - n - 1)]
      : s === 'n' ? [box(b.x0, b.y0, b.x1, b.y0 + n - 1), box(b.x0, b.y0 + n + 1, b.x1, b.y1)]
      : s === 'w' ? [box(b.x0, b.y0, b.x0 + n - 1, b.y1), box(b.x0 + n + 1, b.y0, b.x1, b.y1)]
      : [box(b.x1 - n + 1, b.y0, b.x1, b.y1), box(b.x0, b.y0, b.x1 - n - 1, b.y1)];
    const parts = (total, mn, mx) => { const o = []; let rem = total; while (rem > 0) { let s = ri(mn, mx); if (rem - s - 1 < mn) s = rem; o.push(s); rem -= s + 1; } return o; };
    const slice = (b, axis, sizes) => { const o = []; let p = axis === 'y' ? b.y0 : b.x0; for (const s of sizes) { o.push(axis === 'y' ? box(b.x0, p, b.x1, p + s - 1) : box(p, b.y0, p + s - 1, b.y1)); p += s + 1; } return o; };
    const ok = b => b && bw(b) >= 2 && bh(b) >= 2;
    // highest score wins; scores are rolled once each, in list order (never inside a sort: engines sort differently)
    const best = (arr, f) => { const sc = arr.map(f); let bi = 0; for (let i = 1; i < sc.length; i++) if (sc[i] > sc[bi]) bi = i; return arr[bi]; };
    const need = (...bs) => { for (const b of bs) if (!ok(b)) throw 0; };
    // rooms along a corridor (or any room list): cor is on side `side` of region reg. Deep rooms split into a
    // near room (on the corridor) and a far room that opens into it; now and then a room opens only into its neighbour.
    function along(reg, cors, side, mn, mx, o = {}) {
      need(reg); cors = [].concat(cors);
      const vert = side === 'w' || side === 'e', out = [];
      const pcs = slice(reg, vert ? 'y' : 'x', parts(vert ? bh(reg) : bw(reg), mn, mx));
      let prev = null;
      for (const p of pcs) {
        need(p);
        const depth = vert ? bw(p) : bh(p);
        let near = p, far = null;
        const dmin = o.dmin || 3;
        if (depth >= 2 * dmin + 1 && rnd() < (depth >= 9 ? .65 : .45) * (o.split == null ? 1 : o.split)) {
          const k = ri(dmin, depth - dmin - 1);
          [near, far] = take(p, side, k);
        }
        const r = add(near, o.t);
        const c = cors.find(c => shared(r, c));
        if (prev && rnd() < (o.chain || .12) && shared(r, prev)) link(r, prev);
        else if (c) link(r, c); else if (prev && shared(r, prev)) link(r, prev); else throw 0;
        out.push(r);
        if (far) {
          const f = add(far); out.push(f);
          // the far room opens into the near one, or (on wide plans) its neighbour's far room
          link(f, r);
        }
        prev = r;
      }
      return out;
    }
    // hang a room on whichever neighbour suits it best (a hallway or a public room first)
    function attach(r, pool) {
      const c = (pool || rooms).filter(q => q !== r && shared(q, r));
      if (!c.length) throw 0;
      const sc = q => (q.t === 'hall' ? 3 : PUBLIC4.has(q.t) ? 2 : q.t ? (LEAF4.has(q.t) ? -5 : 0) : 1) + rnd();
      const q = best(c, sc); link(r, q); return q;
    }
    const bandSplit = (b, kinds) => { // one or two rooms side by side
      if (kinds.length > 1 && bw(b) >= 9) { const k = ri(Math.floor(bw(b) * .4), Math.ceil(bw(b) * .6) - 1); const [a, c] = take(b, 'w', k); need(a, c); const A = add(a, kinds[0]), C = add(c, kinds[1]); return [A, C]; }
      return [add(b, kinds[0])];
    };

    let entry = null, front = null, arch = '';
    const req = REQ4[type];
    const why = w => { if (GEN.dbg) GEN.dbg(arch, w); return null; };
    const drop = new Set();   // required kinds already covered by a combined room
    let req2 = [];            // extra required kinds for this plan
    try {
      if (type === 'rowS' || type === 'rowL') {
        const big = type === 'rowL';
        arch = pick(ARCH4[type]);
        let C = I, porch = null, back = null;
        if (rnd() < (big ? .3 : .22)) { const [p, rest] = take(C, 's', 2); porch = add(p, 'porch'); C = rest; arch += '+porch'; }
        if (rnd() < (big ? .35 : .2) && arch.indexOf('lhall') < 0) { const [b, rest] = take(C, 'n', ri(3, 4)); back = b; C = rest; arch += '+back'; }
        need(C);
        const hw = big ? ri(2, 3) : 2, rmn = 3, rmx = big ? 6 : 5;
        const kind = arch.split('+')[0];
        const kband = (H, p) => { // kitchen (+dining) across the back
          if (rnd() >= p) return H;
          const [b, rest] = take(H, 'n', ri(4, big ? 6 : 5)); need(rest);
          const ks = big && rnd() < .75 ? shuffle(['kitchen', 'dining']) : rnd() < .25 ? ['great'] : ['kitchen'];
          if (ks[0] === 'great') { if (bh(b) < 5) ks[0] = 'kitchen'; else { drop.add('kitchen'); drop.add('living'); } }
          H.band = bandSplit(b, ks); return rest;
        };
        const linkBand = (band, hubs) => { if (!band) return; for (const b of band) { const h = hubs.find(h => shared(b, h)); if (h) link(b, h); } for (const b of band) if (!links.some(l => l.includes(b))) attach(b, band.concat(hubs)); if (band.length === 2 && rnd() < .5) link(band[0], band[1]); };
        if (kind === 'side' || kind === 'front') {
          const H0 = { ...C }; let H = kband(H0, kind === 'front' ? .4 : .6);
          let fr = null;
          if (kind === 'front') { const [f, rest] = take(H, 's', ri(4, 5)); need(rest); fr = add(f, rnd() < .8 ? 'living' : null); H = rest; }
          const [hall, reg] = take(H, 'w', hw); need(hall, reg);
          const hl = add(hall, 'hall', { spine: 1 });
          along(reg, hl, 'w', rmn, rmx);
          linkBand(H0.band, [hl]);
          if (fr) { link(fr, hl); entry = fr; } else entry = hl;
        } else if (kind === 'center') {
          const H0 = { ...C }; const H = kband(H0, .5);
          const W = bw(H), lw = ri(3, W - hw - 2 - 3);
          const [l, rest] = take(H, 'w', lw), [hall, r] = take(rest, 'w', hw); need(l, hall, r);
          const hl = add(hall, 'hall', { spine: 1 });
          along(l, hl, 'e', rmn, rmx); along(r, hl, 'w', rmn, rmx);
          linkBand(H0.band, [hl]); entry = hl;
        } else if (kind === 'rail') { // railroad: a line of walk-through rooms, small rooms off the side
          const sw = big ? ri(4, 6) : ri(3, 4);
          const [col, main] = take(C, 'e', sw); need(col, main);
          const chain = slice(main, 'y', parts(bh(main), big ? 4 : 3, big ? 6 : 5)).reverse().map(b => add(b));
          for (let i = 1; i < chain.length; i++) link(chain[i], chain[i - 1]);
          chain[0].t = rnd() < .75 ? 'living' : null;
          const ki = rnd() < .6 ? chain.length - 1 : ri(1, chain.length - 1); if (chain[ki] && !chain[ki].t && area(chain[ki]) >= 12) chain[ki].t = 'kitchen';
          for (const b of slice(col, 'y', parts(bh(col), 3, big ? 5 : 4))) { need(b); attach(add(b), chain); }
          entry = chain[0];
        } else if (kind === 'open') { // open plan: kitchen + living in one big front room
          const [g, rest] = take(C, 's', ri(5, big ? 8 : 7)); need(g, rest);
          const gr = add(g, 'great'); drop.add('kitchen'); drop.add('living'); entry = gr;
          const v = pick(['cross', 'side', 'none']);
          if (v === 'cross') { const [h, top] = take(rest, 's', 2); need(h, top); const hl = add(h, 'hall', { spine: 1 }); link(hl, gr); along(top, hl, 's', 3, big ? 6 : 5); }
          else if (v === 'side') { const [h, reg] = take(rest, 'w', 2); need(h, reg); const hl = add(h, 'hall', { spine: 1 }); link(hl, gr); along(reg, hl, 'w', 3, big ? 6 : 5); }
          else along(rest, gr, 's', 3, big ? 6 : 5, { chain: .2 });
          arch += '/' + v;
        } else { // lhall: the hall runs up one side, then turns across the house
          const [top, r1] = take(C, 'n', ri(4, big ? 6 : 5)), [hh, r2] = take(r1, 'n', 2), [vh, reg] = take(r2, 'w', 2); need(top, hh, vh, reg);
          const H1 = add(hh, 'hall', { spine: 1 }), V = add(vh, 'hall'); link(V, H1);
          along(top, H1, 's', 3, big ? 6 : 5); along(reg, [V, H1], 'w', 3, big ? 6 : 5);
          entry = V;
        }
        if (back) { const bs = bandSplit(back, rnd() < .5 ? [null, null] : [null]); for (const b of bs) { b.opt = 1; attach(b); } }
        if (porch) { link(porch, entry); entry = porch; }
      } else if (type === 'apt') {
        arch = pick(ARCH4.apt);
        if (arch === 'studio') { // one big room + bath; maybe a tiny entry hall
          const [col, main] = take(I, 'w', ri(3, 4)); need(col, main);
          const st = add(main, 'studio'); drop.add('kitchen'); drop.add('living'); drop.add('bedroom');
          if (rnd() < .55) { const [h, up] = take(col, 's', ri(2, 3)); need(h, up); const hl = add(h, 'hall'); link(hl, st); entry = hl;
            for (const b of slice(up, 'y', parts(bh(up), 3, 4))) attach(add(b), [hl, st]); }
          else { entry = st; for (const b of slice(col, 'y', parts(bh(col), 3, 5))) attach(add(b), [st]); }
        } else if (arch === 'corridor') {
          const [b, rest] = take(I, 'n', ri(4, 5)); need(b, rest);
          const ks = rnd() < .3 ? ['great'] : shuffle(['living', 'kitchen']); if (ks[0] === 'great') { drop.add('kitchen'); drop.add('living'); }
          const band = bandSplit(b, ks);
          const [h, reg] = take(rest, 'w', 2); need(h, reg); const hl = add(h, 'hall', { spine: 1 });
          along(reg, hl, 'w', 3, 4, { split: .5 }); for (const x of band) { if (shared(x, hl)) link(x, hl); else attach(x, band); }
          entry = hl;
        } else if (arch === 'through') { // walk straight into the living room, everything opens off it
          const [fb, back] = take(I, 's', ri(5, 6)); need(fb, back);
          const fr = rnd() < .6 && bw(fb) >= 10 ? bandSplit(fb, shuffle(['living', 'kitchen'])) : [add(fb, 'living')];
          const lv = fr.find(r => r.t === 'living'); entry = lv; if (fr.length > 1) link(fr[0], fr[1]);
          along(back, fr, 's', 3, 6, { split: 0, chain: .3 });
        } else if (arch === 'twobed') {
          const W = bw(I), lw = ri(5, W - 2 - 2 - 4);
          const [l, rest] = take(I, 'w', lw), [h, r] = take(rest, 'w', 2); need(l, h, r);
          const hl = add(h, 'hall', { spine: 1 });
          const [lb, lt] = take(l, 's', ri(5, 7)); need(lb);
          const gr = add(lb, 'great'); drop.add('kitchen'); drop.add('living'); link(gr, hl);
          if (ok(lt)) attach(add(lt), [gr, hl]);
          along(r, hl, 'w', 4, 5, { split: 0 }); entry = rnd() < .5 ? hl : gr;
          req2 = ['bedroom'];
        } else { // galley: a narrow kitchen beside the living room, bedroom + bath behind
          const [fb, back] = take(I, 's', ri(5, 6)); need(fb, back);
          const [k, lvb] = take(fb, 'w', 3); need(k, lvb);
          const K = add(k, 'kitchen'), LV = add(lvb, 'living'); link(K, LV); entry = LV;
          const [h, top] = take(back, 's', 2);
          if (rnd() < .5 && bh(back) >= 5) { const hl = add(h, 'hall', { spine: 1 }); link(hl, LV); along(top, hl, 's', 3, 6, { split: 0 }); }
          else { const tops = slice(box(back.x0, back.y0, back.x1, back.y1), 'x', parts(bw(back), 3, 6)).map(b => add(b)); for (const t of tops) attach(t, [LV, K]); }
        }
      } else if (rc.front && (type === 'bodega' || type === 'laundro' || type === 'garage' || type === 'pharmacy')) {
        arch = pick(ARCH4.shop);
        const [fb, B] = take(I, 's', ri(rc.front[0], rc.front[1])); need(fb, B);
        let st;
        if (arch === 'nook') { const [nk, sb] = take(fb, 'e', ri(3, 4)); need(nk, sb); st = add(sb, rc.front[2]); link(add(nk), st); arch += pick(['/side', '/direct']); }
        else st = add(fb, rc.front[2]);
        entry = front = st;
        const sub = arch.replace('nook/', '');
        if (sub === 'side') { const [h, reg] = take(B, 'w', 2); need(h, reg); const hl = add(h, 'hall', { spine: 1 }); link(hl, st); along(reg, hl, 'w', 3, 5); }
        else if (sub === 'back') { const [h, reg] = take(B, 's', 2); need(h, reg); const hl = add(h, 'hall', { spine: 1 }); link(hl, st); along(reg, hl, 's', 3, 6); }
        else along(B, [st].concat(rooms.filter(r => r !== st)), 's', 3, 6, { chain: .2 });
      } else if (type === 'school' || type === 'police') {
        arch = pick(ARCH4.big);
        const hw = ri(2, 3), topK = type === 'school' ? 'gym' : 'bullpen';
        const [lb, B] = take(I, 's', ri(4, 5)); need(lb, B);
        const lob = add(lb, 'lobby'); entry = front = lob;
        if (arch === 'spine') {
          const [tb, H] = take(B, 'n', ri(5, 7)); need(tb, H); const T = add(tb, topK);
          const lw = ri(Math.floor((bw(H) - hw) / 2) - 2, Math.floor((bw(H) - hw) / 2) + 2);
          const [l, rest] = take(H, 'w', lw), [h, r] = take(rest, 'w', hw); need(l, h, r);
          const hl = add(h, 'hall', { spine: 1 }); link(hl, lob); link(T, hl);
          along(l, hl, 'e', 4, 6); along(r, hl, 'w', 4, 6);
        } else if (arch === 'cross') {
          const [tp, r1] = take(B, 'n', ri(6, 8)), [xh, low] = take(r1, 'n', hw); need(tp, xh, low);
          const X = add(xh, 'hall', { spine: 1 });
          const lw = ri(Math.floor((bw(low) - hw) / 2) - 2, Math.floor((bw(low) - hw) / 2) + 2);
          const [l, rest] = take(low, 'w', lw), [h, r] = take(rest, 'w', hw); need(l, h, r);
          const V = add(h, 'hall'); link(V, X); link(V, lob);
          along(l, V, 'e', 4, 6); along(r, V, 'w', 4, 6);
          const tops = along(tp, X, 's', 5, 9, { split: 0 });
          tops.sort((a, b) => area(b) - area(a))[0].t = topK;
        } else { // twin: a hallway down each side, rooms in the middle, the big room across the back
          const [tb, H] = take(B, 'n', ri(5, 7)); need(tb, H); const T = add(tb, topK);
          const [hl0, r] = take(H, 'w', hw), [hr0, mid] = take(r, 'e', hw); need(hl0, hr0, mid);
          const HL = add(hl0, 'hall', { spine: 1 }), HR = add(hr0, 'hall'); link(HL, lob); link(HR, lob); link(T, HL); if (rnd() < .6) link(T, HR);
          if (bw(mid) >= 8) { const [ml, mr] = take(mid, 'w', ri(Math.floor(bw(mid) / 2) - 1, Math.floor(bw(mid) / 2))); need(ml, mr); along(ml, HL, 'w', 4, 6, { split: 0 }); along(mr, HR, 'e', 4, 6, { split: 0 }); }
          else along(mid, HL, 'w', 4, 6, { split: 0 });
        }
      } else if (type === 'mansion') {
        arch = pick(ARCH4.mansion);
        if (arch === 'central') {
          const [fb, B] = take(I, 's', ri(4, 5)); const fo = add(fb, 'foyer'); entry = front = fo;
          const [tb, H] = take(B, 'n', ri(6, 7)); need(tb, H); const band = bandSplit(tb, shuffle(['kitchen', 'dining']));
          const hw = 3, lw = ri(Math.floor((bw(H) - hw) / 2) - 2, Math.floor((bw(H) - hw) / 2) + 2);
          const [l, rest] = take(H, 'w', lw), [h, r] = take(rest, 'w', hw); need(l, h, r);
          const hl = add(h, 'hall', { spine: 1 }); link(hl, fo);
          along(l, hl, 'e', 4, 6); along(r, hl, 'w', 4, 6);
          for (const b of band) { if (shared(b, hl)) link(b, hl); } for (const b of band) if (!links.some(l => l.includes(b))) attach(b, band); if (rnd() < .5) link(band[0], band[1]);
        } else if (arch === 'wings') { // foyer in the middle, a gallery across, a wing hallway on each side
          const [fb, B] = take(I, 's', ri(5, 6)); need(fb, B);
          const fw = ri(7, 9), lx = ri(Math.floor((bw(fb) - fw) / 2) - 1, Math.floor((bw(fb) - fw) / 2) + 1);
          const [fl, r1] = take(fb, 'w', lx - 1), [fm, fr] = take(r1, 'w', fw); need(fl, fm, fr);
          const fo = add(fm, 'foyer'); entry = front = fo;
          link(add(fl), fo); link(add(fr), fo);
          const [gal, up] = take(B, 's', 2); need(gal, up); const G = add(gal, 'hall', { spine: 1 }); link(G, fo);
          const ww = ri(8, 9);
          const [lw, r2] = take(up, 'w', ww), [rw, mid] = take(r2, 'e', ww); need(lw, rw, mid);
          const [lh, lr] = take(lw, 'e', 2), [rh, rr] = take(rw, 'w', 2); need(lh, lr, rh, rr);
          const LH = add(lh, 'hall'), RH = add(rh, 'hall'); link(LH, G); link(RH, G);
          along(lr, LH, 'e', 4, 6, { split: 0 }); along(rr, RH, 'w', 4, 6, { split: 0 });
          const ms = slice(mid, 'y', parts(bh(mid), 5, 7)).reverse().map(b => add(b));
          ms[0] && link(ms[0], G); for (let i = 1; i < ms.length; i++) { if (rnd() < .5 && shared(ms[i], LH)) link(ms[i], LH); else link(ms[i], ms[i - 1]); }
          if (ms.length >= 2) { ms[ms.length - 1].t = 'kitchen'; ms[ms.length - 2].t = 'dining'; }
        } else if (arch === 'grand') { // a grand foyer with the main rooms opening off it
          const fh = ri(7, 9), [fb, up] = take(I, 's', fh); need(fb, up);
          const fw = ri(8, 10), lx = ri(Math.floor((bw(fb) - fw) / 2) - 2, Math.floor((bw(fb) - fw) / 2) + 2);
          const [fl, r1] = take(fb, 'w', lx - 1), [fm, fr] = take(r1, 'w', fw); need(fl, fm, fr);
          const fo = add(fm, 'foyer'); entry = front = fo;
          along(fl, fo, 'e', 3, 5, { split: .6 }); along(fr, fo, 'w', 3, 5, { split: .6 });
          const [xh, top] = take(up, 's', ri(2, 3)); need(xh, top); const X = add(xh, 'hall', { spine: 1 }); link(X, fo);
          along(top, X, 's', 4, 7, { dmin: 4 });
        } else { // court: rooms around a courtyard, a ring of hallways
          const [fb, B] = take(I, 's', ri(4, 5)); need(fb, B); const fo = add(fb, 'foyer'); entry = front = fo;
          const [tr, r1] = take(B, 'n', ri(5, 6)), [th, r2] = take(r1, 'n', 2); need(tr, th, r2);
          const ow = ri(5, 6), [lr, r3] = take(r2, 'w', ow), [lh, r4] = take(r3, 'w', 2), [rr, r5] = take(r4, 'e', ow), [rh, ct] = take(r5, 'e', 2); need(lr, lh, rr, rh, ct);
          const TH = add(box(lh.x0, th.y0, rh.x1, th.y1), 'hall', { spine: 1 });
          // the top hall only spans between the side halls: the outer top corners join the outer room columns
          const LH = add(lh, 'hall'), RH = add(rh, 'hall'), CT = add(ct, 'courtyard');
          link(LH, TH); link(RH, TH); link(LH, fo); link(RH, fo); link(CT, rnd() < .5 ? fo : TH);
          // corners next to the top hall belong to the side room columns
          const lcol = box(lr.x0, th.y0, lr.x1, lr.y1), rcol = box(rr.x0, th.y0, rr.x1, rr.y1);
          const lp = along(lcol, LH, 'e', 4, 6, { split: 0 }), rp = along(rcol, RH, 'w', 4, 6, { split: 0 });
          along(tr, [TH].concat(lp, rp), 's', 4, 7, { split: 0 });
          for (const r of rooms) if (!links.some(l => l.includes(r))) attach(r);
          drop.add('closet');
        }
      } else return null;
    } catch (e) { if (e === 0) return why('geom'); throw e; }
    if (!entry || entry.y1 !== I.y1) return why('entry');
    for (const r of rooms) if (!ok(r)) return why('small');
    // every room linked to the entrance
    const seen = new Set([entry]), q = [entry];
    while (q.length) { const a = q.pop(); for (const [x, y] of links) { const b = x === a ? y : y === a ? x : null; if (b && !seen.has(b)) { seen.add(b); q.push(b); } } }
    if (seen.size !== rooms.length) return why('island');

    // ---- not enough rooms for this building? split the biggest free rooms (the new part opens into the old one)
    const needN = req.req.filter(t => !drop.has(t)).length + req2.length - rooms.filter(r => r.t && r.t !== 'hall' && r.t !== 'porch').length + (rooms.length > 8 ? 1 : 0);
    for (let guard = 0; guard < 12 && rooms.filter(r => !r.t).length < needN; guard++) {
      const c = rooms.filter(r => !r.t && Math.max(bw(r), bh(r)) >= 7).sort((a, b) => area(b) - area(a))[0];
      if (!c) break;
      const vert = bw(c) >= bh(c), len = vert ? bw(c) : bh(c), k = ri(3, len - 4);
      const side = vert ? (rnd() < .5 ? 'w' : 'e') : (rnd() < .5 ? 'n' : 's');
      if (c === entry && side === 's') continue;
      const [nb, rest] = take(c, side, k);
      Object.assign(c, rest);
      const n = add(nb);
      for (const l of links) for (let i = 0; i < 2; i++) if (l[i] === c && !shared(c, l[1 - i]) && shared(n, l[1 - i])) l[i] = n;
      link(n, c);
    }
    if (entry.y1 !== I.y1) return why('entry2');
    // ---- room kinds: required ones by size and number of doors, then optional extras, then fillers
    const deg =r => links.reduce((n, l) => n + (l[0] === r || l[1] === r ? 1 : 0), 0) + (r === entry ? 1 : 0);
    const fits = (r, t) => { const m = MIN4[t] || [3, 9]; return Math.min(bw(r), bh(r)) >= m[0] && area(r) >= m[1] && !(LEAF4.has(t) && deg(r) > 1) && !(r === entry && LEAF4.has(t)); };
    const BIGT = ['great', 'studio', 'gym', 'bullpen', 'living', 'kitchen', 'dining', 'classroom', 'lockers', 'breakroom', 'study', 'bedroom', 'pharmback', 'cellar', 'office', 'storage', 'backroom', 'den'];
    const need4 = req.req.filter(t => !drop.has(t)).concat(req2);
    for (const r of rooms) if (r.t && need4.includes(r.t)) need4.splice(need4.indexOf(r.t), 1);
    const ord = t => (LEAF4.has(t) && !BIGT.includes(t) ? -100 + (MIN4[t] || [3, 9])[1] : 0) + (BIGT.indexOf(t) < 0 ? 99 : BIGT.indexOf(t));   // dead-end-only kinds (bath...) first, then big rooms
    need4.sort((a, b) => ord(b) < ord(a) ? 1 : ord(b) > ord(a) ? -1 : 0);
    let missing = [];
    for (const t of need4) {
      const c = rooms.filter(r => !r.t && fits(r, t));
      if (!c.length) { missing.push(t); continue; }
      const nearEntry = r => r === entry || links.some(l => (l[0] === r && l[1] === entry) || (l[1] === r && l[0] === entry));
      const sc = r => {
        let s = (BIGT.includes(t) ? area(r) : -area(r)) * (.7 + rnd() * .6);
        if (t === 'living' && nearEntry(r)) s += 12;
        if ((t === 'bedroom' || t === 'study') && r === entry) s -= 40;
        if (PUBLIC4.has(t) && deg(r) > 1) s += 4;
        if (t === 'bedroom' && deg(r) > 2) s -= 10;
        return s;
      };
      best(c, sc).t = t;
    }
    if (missing.some(t => req.must.includes(t)) || missing.length > (req.tol || (rooms.length > 9 ? 2 : 1)) || !rooms.some(r => r.t === 'classroom' || type !== 'school')) return why('missing:' + missing.join(','));
    const opt = shuffle(req.opt.slice());
    for (const r of shuffle(rooms.filter(r => !r.t))) {
      let t = opt.find(t => fits(r, t));
      if (t) opt.splice(opt.indexOf(t), 1);
      else t = shuffle(req.fill.slice()).find(t => fits(r, t)) || (deg(r) > 1 || r === entry ? 'hall' : 'closet');
      r.t = t;
    }
    // ---- mirror half the time (doors are placed afterwards, so they follow)
    if (rnd() < .5) { for (const r of rooms) { const a = I.x0 + I.x1 - r.x1, b = I.x0 + I.x1 - r.x0; r.x0 = a; r.x1 = b; } arch += '~'; }
    return { rooms, links, entry, front, arch };
  }
  // the wall two rooms share, if any: {v: vertical wall, x|y, lo..hi along it}
  function shared(a, b) {
    if (a.x1 + 2 === b.x0 || b.x1 + 2 === a.x0) { const lo = Math.max(a.y0, b.y0), hi = Math.min(a.y1, b.y1); if (lo <= hi) return { v: 1, x: a.x1 + 2 === b.x0 ? a.x1 + 1 : b.x1 + 1, lo, hi }; }
    if (a.y1 + 2 === b.y0 || b.y1 + 2 === a.y0) { const lo = Math.max(a.x0, b.x0), hi = Math.min(a.x1, b.x1); if (lo <= hi) return { v: 0, y: a.y1 + 2 === b.y0 ? a.y1 + 1 : b.y1 + 1, lo, hi }; }
    return null;
  }

  // ---------------------------------------------------------------- generator
  GEN.generate = function (type, seed, opts = {}) {
    for (let attempt = 0; attempt < ((opts.gv || 1) >= 2 ? 60 : 30); attempt++) {
      const out = tryGen(type, (seed + attempt * 7919) >>> 0, opts);
      if (out) { out.seed = seed; out.attempts = attempt + 1; return out; }
    }
    if ((opts.gv || 1) >= 2) return GEN.generate(type, seed, Object.assign({}, opts, { gv: 1 }));   // never fail: fall back to the v1 rules
    throw new Error('generator failed for ' + type + ' ' + seed);
  };

  function tryGen(type, seed, opts) {
    const rnd = D.mulberry32(seed);
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const rc = R[type], bt = D.BTYPES[type];
    // 0.9 (generator v2, houses scouted from 0.9 on): walkways in small rooms, containers open at the front, no sealed-off
    // floor, rugs on open floor. Houses already in a list keep v1, so they (and a saved half-done run) stay exactly the same.
    const V2 = (opts.gv || 1) >= 2;
    const V4 = (opts.gv || 1) >= 4;   // 0.14: floor-plan archetypes (plan4)

    // secrets chosen first: they reserve space around the house
    const nSec = ri(rc.secrets[0], rc.secrets[1]);
    const secTypes = shuffle(rc.sec.slice()).slice(0, nSec);
    const wantAttic = secTypes.includes('attic');

    const w = ri(rc.w[0], rc.w[1]), h = ri(rc.h[0], rc.h[1]);
    const yT = 5, xR = w + 2, yB = yT + h + 1;
    const MW = xR + 2 + (wantAttic ? 7 : 0), MH = yB + 3;
    const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill(' '));
    for (let y = yT; y <= yB; y++) for (let x = 1; x <= xR; x++) g[y][x] = '#';
    for (let y = yB + 1; y < MH; y++) for (let x = 0; x < MW; x++) g[y][x] = 'o';

    const rooms = [], doors = []; // doors: {x, y, a, b, horiz}
    let ci = 0;
    const addRoom = (t, x0, y0, x1, y1) => { const r = { t, x0, y0, x1, y1, ch: (V4 ? CHARS4 : CHARS)[ci++], id: rooms.length }; rooms.push(r); return r; };
    const door = (x, y, a, b, horiz) => doors.push({ x, y, a, b, horiz });
    let top = yT + 1, bottom = yB - 1;
    const left = 2, right = xR - 1;

    let front = null, spine = null, fdx, plan = null, entry4 = null;
    if (V4) {
      plan = plan4(type, { x0: left, y0: top, x1: right, y1: bottom }, rnd, rc);
      if (!plan) return null;
      const idx = new Map();
      for (const p of plan.rooms) { const r = addRoom(p.t, p.x0, p.y0, p.x1, p.y1); idx.set(p, r); if (p.spine) r.spine = true; }
      spine = plan.rooms.filter(p => p.spine).map(p => idx.get(p))[0] || null;
      front = plan.front ? idx.get(plan.front) : null;
      const used = new Set(), near = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (used.has((x + dx) + ',' + (y + dy))) return true; return false; };
      for (const [pa, pb] of plan.links) {
        const a = idx.get(pa), b = idx.get(pb), w = shared(a, b);
        if (!w) return null;
        const cs = shuffle(range(w.lo, w.hi)).filter(v => !(w.v ? near(w.x, v) : near(v, w.y)));
        if (!cs.length) return null;
        const v = cs[0], x = w.v ? w.x : v, y = w.v ? v : w.y; used.add(x + ',' + y);
        door(x, y, a.id, b.id, !w.v);
      }
      const en = idx.get(plan.entry), ew = en.x1 - en.x0 + 1;
      fdx = ew >= 5 ? ri(en.x0 + 1, en.x1 - 1) : ri(en.x0, en.x1);
      entry4 = en;
    } else {
    if (rc.front) { const hf = ri(rc.front[0], rc.front[1]); front = addRoom(rc.front[2], left, bottom - hf + 1, right, bottom); bottom = bottom - hf - 1; }
    let bandRooms = [];
    if (rc.top) {
      const tb = ri(rc.top[0], rc.top[1]); const kinds = rc.top[2];
      if (kinds.length > 1 && right - left + 1 >= 11) { const sx = left + ri(Math.floor((right - left) * .4), Math.floor((right - left) * .6)); bandRooms.push(addRoom(kinds[0], left, top, sx - 1, top + tb - 1)); bandRooms.push(addRoom(kinds[1], sx + 1, top, right, top + tb - 1)); }
      else bandRooms.push(addRoom(kinds[0], left, top, right, top + tb - 1));
      top = top + tb + 1;
    }
    // hallway spine
    const sw = rc.spine[0], W = right - left + 1;
    let sx;
    if (rc.spine[1] === 'side') sx = rnd() < .5 ? left : right - sw + 1;
    else { const lw = ri(Math.max(3, Math.floor((W - sw) / 2) - 2), Math.min(W - sw - 4, Math.floor((W - sw) / 2) + 2)); sx = left + lw + 1; }
    spine = addRoom(rc.front ? 'hall' : 'hall', sx, top, sx + sw - 1, bottom);
    spine.spine = true;
    const regions = [];
    if (sx - 2 >= left + 2) regions.push({ x0: left, x1: sx - 2, wallX: sx - 1, side: -1 });
    if (sx + sw + 1 <= right - 2) regions.push({ x0: sx + sw + 1, x1: right, wallX: sx + sw, side: 1 });
    if (!regions.length) return null;
    const side = [];
    for (const rg of regions) {
      let y = top;
      while (y <= bottom) {
        let hh = ri(rc.roomH[0], rc.roomH[1]);
        if (bottom - (y + hh) < rc.roomH[0]) hh = bottom - y + 1;
        const r = addRoom(null, rg.x0, y, rg.x1, y + hh - 1); r.region = rg;
        door(rg.wallX, ri(r.y0, r.y1), spine.id, r.id, false);
        // wide rooms are split in two; the far half opens into the near half
        if (r.x1 - r.x0 + 1 >= 7 && rnd() < (r.x1 - r.x0 + 1 >= 9 ? .6 : .45)) {
          const wx = rg.side > 0 ? r.x0 + ri(3, r.x1 - r.x0 - 3) : r.x0 + ri(3, r.x1 - r.x0 - 3);
          const far = rg.side > 0 ? addRoom(null, wx + 1, r.y0, r.x1, r.y1) : addRoom(null, r.x0, r.y0, wx - 1, r.y1);
          if (rg.side > 0) r.x1 = wx - 1; else r.x0 = wx + 1;
          if (r.x1 - r.x0 < 2 || far.x1 - far.x0 < 2) { rooms.pop(); ci--; if (rg.side > 0) r.x1 = rg.x1; else r.x0 = rg.x0; }
          else { far.region = rg; door(wx, ri(r.y0, r.y1), r.id, far.id, false); side.push(far); }
        }
        side.push(r);
        y += hh + 1;
      }
    }
    // the spine reaches the top band and the front room through doors in their walls
    for (const br of bandRooms) {
      const lo = Math.max(br.x0, sx), hi = Math.min(br.x1, sx + sw - 1);
      if (lo <= hi) door(ri(lo, hi), top - 1, br.id, spine.id, true);
    }
    if (bandRooms.length === 2) { const a = bandRooms[0], b = bandRooms[1]; if (!doors.some(d => d.a === a.id || d.b === a.id) || !doors.some(d => d.a === b.id || d.b === b.id)) door(a.x1 + 1, ri(a.y0, a.y1), a.id, b.id, false); else if (rnd() < .5) door(a.x1 + 1, ri(a.y0, a.y1), a.id, b.id, false); }
    if (front) { door(ri(sx, sx + sw - 1), bottom + 1, spine.id, front.id, true); fdx = ri(front.x0 + 2, front.x1 - 2); }
    else fdx = ri(sx, sx + sw - 1);

    // assign room types to the side rooms: required list by size, then fillers
    const req = rc.rooms.slice(), sorted = side.slice().sort((a, b) => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1));
    const big = ['living', 'classroom', 'bedroom', 'study', 'dining', 'bullpen', 'breakroom', 'lockers', 'storage', 'office', 'cellar', 'pharmback', 'backroom'];
    const reqBig = req.filter(t => big.includes(t)), reqSmall = req.filter(t => !big.includes(t));
    for (const r of sorted) {
      const small = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) < 14;
      r.t = (small ? reqSmall.shift() || reqBig.shift() : reqBig.shift() || reqSmall.shift()) || pick(rc.fill);
    }
    if (reqBig.length + reqSmall.length > (rooms.length > 9 ? 2 : 1)) return null; // too few rooms for this building, try again
    // a room too small for its type becomes a closet
    for (const r of side) if ((r.x1 - r.x0 + 1) < 3 || (r.y1 - r.y0 + 1) < 3) r.t = 'closet';
    if (rc.front) spine.t = 'hall';
    }

    // paint rooms + doors
    for (const r of rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) g[y][x] = r.ch;
    const doorMap = {};
    for (const d of doors) { g[d.y][d.x] = '+'; doorMap[d.x + ',' + d.y] = (d.horiz ? rooms[d.a] : rooms[d.a]).ch; }
    const roomOfCh = {}; rooms.forEach(r => roomOfCh[r.ch] = r);
    const entry = V4 ? entry4 : front || spine;
    g[yB][fdx] = '+'; doorMap[fdx + ',' + yB] = entry.ch;

    // occupancy: 1 solid furniture, 2 non-solid, 3 reserved (keep clear)
    const occ = []; for (let y = 0; y < MH; y++) occ.push(new Uint8Array(MW));
    const isFloor = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && (roomOfCh[g[y][x]] || g[y][x] === '+' || g[y][x] === 'o');
    for (const d of doors.concat([{ x: fdx, y: yB }])) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2], [-2, 0], [2, 0]]) { const x = d.x + dx, y = d.y + dy; if (isFloor(x, y)) occ[y][x] = 3; }
    const start = { x: fdx + .5, y: yB + 1.6 };

    function reach() {
      const dist = new Int16Array(MW * MH).fill(-1), q = [[fdx, yB + 1]]; dist[(yB + 1) * MW + fdx] = 0;
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; const i = ny * MW + nx; if (dist[i] >= 0 || !isFloor(nx, ny) || occ[ny][nx] === 1) continue; dist[i] = 1; q.push([nx, ny]); } }
      return dist;
    }
    const furn = [], tallAt = new Set();
    function accessible(f, dist) {
      const [x0, y0, w, h] = f.at;
      if (f.wall) return dist[(y0 + 1) * MW + x0] >= 0;
      // 0.9: a container needs a free tile in FRONT of it (south), or on its open side when it stands against a side wall
      if (V2 && f.loot && f.room !== 'o' && roomOfCh[f.room]) {
        const r = roomOfCh[f.room], ok = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && dist[y * MW + x] >= 0;
        for (let x = x0; x < x0 + w; x++) if (ok(x, y0 + h)) return true;
        if (x0 === r.x0) for (let y = y0; y < y0 + h; y++) if (ok(x0 + w, y)) return true;
        if (x0 + w - 1 === r.x1) for (let y = y0; y < y0 + h; y++) if (ok(x0 - 1, y)) return true;
        return false;
      }
      for (let x = x0; x < x0 + w; x++) { if (y0 + h < MH && dist[(y0 + h) * MW + x] >= 0) return true; if (y0 - 1 >= 0 && dist[(y0 - 1) * MW + x] >= 0) return true; }
      for (let y = y0; y < y0 + h; y++) { if (dist[y * MW + x0 - 1] >= 0 || dist[y * MW + x0 + w] >= 0) return true; }
      return false;
    }
    function valid() {
      const dist = reach();
      for (const d of doors) if (dist[d.y * MW + d.x] < 0) return false;
      for (const f of furn) if ((f.loot || f.mustReach) && !f.pocket && !accessible(f, dist)) return false;
      // 0.9: no open floor sealed off behind furniture - every free tile of a room can be walked to
      if (V2) for (const r of rooms) { if (r.hidden || r.isolated) continue; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (occ[y][x] !== 1 && g[y][x] === r.ch && dist[y * MW + x] < 0) return false; }
      return true;
    }
    function tryPlace(r, spec, x, y) {
      const w = spec.w, h = spec.h;
      if (spec.place === 'wall') {
        if (g[y][x] !== '#' || !roomOfCh[g[y + 1] && g[y + 1][x]] || occ[y + 1][x] === 1 || furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) return null;
        const f = mk(spec, r, x, y); f.wall = 1; f.solid = 0; furn.push(f);
        occ[y + 1][x] = 3; return f;
      }
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < r.x0 || xx > r.x1 || yy < r.y0 || yy > r.y1 || occ[yy][xx]) return null; }
      const solid = spec.solid !== 0;
      // 0.9: small rooms (under ~4x4, or 3 wide) keep a walkway - furniture may cover at most ~40% of the floor
      const rw = r.x1 - r.x0 + 1, rh = r.y1 - r.y0 + 1;
      if (V2 && solid && !r.hidden && !r.isolated && (rw * rh < 16 || Math.min(rw, rh) <= 3)) {
        let used = 0; for (let yy = r.y0; yy <= r.y1; yy++) for (let xx = r.x0; xx <= r.x1; xx++) if (occ[yy][xx] === 1) used++;
        if (used + w * h > Math.max(2, Math.floor(rw * rh * .4))) return null;
      }
      // 0.9: a tall piece (shelf, wardrobe, fridge...) never stands right in front of another piece, where its
      // picture would hide that piece's front and the floor she needs to search it from
      if (V2 && solid) {
        const tall = spec.H >= 40;
        for (let xx = x; xx < x + w; xx++) {
          if (tall && y - 1 >= r.y0 && (occ[y - 1][xx] === 1 || (y - 2 >= r.y0 && occ[y - 2][xx] === 1))) return null;
          if (y + h + 1 <= r.y1 && tallAt.has(xx + ',' + (y + h + 1))) return null;
        }
      }
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occ[yy][xx] = solid ? 1 : 2;
      const f = mk(spec, r, x, y); furn.push(f);
      if (solid && !valid()) { furn.pop(); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occ[yy][xx] = 0; return null; }
      if (V2 && solid && spec.H >= 40) for (let xx = x; xx < x + w; xx++) tallAt.add(xx + ',' + y);
      return f;
    }
    function mk(spec, r, x, y) {
      const f = { art: spec.art, at: [x, y, spec.w, spec.h], H: spec.H, room: r.ch };
      for (const k of ['loot', 'name', 'time', 'noise', 'cloth', 'items', 'seed']) if (spec[k] != null) f[k] = spec[k];
      if (spec.solid === 0) f.solid = 0;
      if (spec.lockable) f.lockable = spec.lockable; if (spec.mustLock) f.mustLock = 1;
      if (spec.sofa) f.sofa = 1; if (spec.table) f.table = 1; if (spec.desk) f.desk = 1;
      if (spec.art === 'bookshelf') f.seed = ri(0, 9);
      return f;
    }
    function candidates(r, spec) {
      const out = [], w = spec.w, h = spec.h;
      if (spec.place === 'wall') { for (let x = r.x0; x <= r.x1; x++) out.push([x, r.y0 - 1]); return shuffle(out); }
      if (spec.place === 'n' || spec.place === 'front') for (let x = r.x0; x <= r.x1 - w + 1; x++) out.push([x, spec.place === 'front' ? r.y1 - h + 1 - 1 : r.y0]);
      if (spec.place === 's' || spec.place === 'n') for (let y = r.y0 + 1; y <= r.y1 - h + 1; y++) { out.push([r.x0, y]); out.push([r.x1 - w + 1, y]); }
      if (spec.place === 'c' || spec.place === 'front') for (let y = r.y0 + 1; y <= r.y1 - h; y++) for (let x = r.x0 + 1; x <= r.x1 - w; x++) out.push([x, y]);
      // north-wall spots first (furniture faces south), then the rest
      if (V4 && spec.place === 'n' && r.mix) return shuffle(out);   // 0.14: this room puts its wall pieces along any wall
      const nn = spec.place === 'n' ? shuffle(out.filter(c => c[1] === r.y0)) : [];
      return nn.concat(shuffle(out.filter(c => !(spec.place === 'n' && c[1] === r.y0))));
    }
    function furnish(r) {
      const def = ROOMS[r.t]; if (!def) return;
      let specs = def.f;
      if (V4) { // 0.14: the first piece keeps its claim on the room, the rest come in a seeded order, plus a few optional extras
        specs = [specs[0]].concat(shuffle(specs.slice(1).concat(EXTRA4[r.t] || [])));
        r.mix = rnd() < .35 && !['kitchen', 'great', 'studio', 'breakroom', 'store', 'pharmfloor', 'laundry'].includes(r.t);
      }
      for (const spec of specs) {
        if (rnd() > spec.p) continue;
        const n = ri(spec.n[0], spec.n[1]);
        for (let i = 0; i < n; i++) {
          let placed = null;
          for (const [x, y] of candidates(r, spec)) { placed = tryPlace(r, spec, x, y); if (placed) break; }
          if (placed && spec.art === 'table') { // chairs around the table (non-solid)
            for (const [cx, cy] of [[placed.at[0] - 1, placed.at[1]], [placed.at[0] + 3, placed.at[1]], [placed.at[0] + 1, placed.at[1] - 1]]) tryPlace(r, { art: 'chair', w: 1, h: 1, H: 16, solid: 0 }, cx, cy);
          }
          if (placed && spec.art === 'desk' && rnd() < .7) tryPlace(r, { art: 'chair', w: 1, h: 1, H: 16, solid: 0 }, placed.at[0], placed.at[1] + 1);
        }
      }
    }

    // ---- secrets that need floor plan space are carved before furnishing
    const L = { rooms: {}, doors: doorMap, decor: {}, furn, rugs: [], zombies: [], secrets: [] };
    const secOut = [];
    if (secTypes.includes('shelf')) {
      const cand = shuffle(rooms.filter(r => r.y0 === yT + 1 && r.x1 - r.x0 + 1 >= 4 && !r.spine && r !== front));
      let ok = false;
      for (const r of cand) {
        for (const dx of shuffle(range(r.x0, r.x1 - 2))) {
          if ([dx, dx + 1, dx + 2].some(x => occ[r.y0][x] || occ[r.y0 + 1][x] || g[yT][x] !== '#') || g[yT][dx - 1] !== '#' || g[yT][dx + 1] !== '#') continue;
          const hx = Math.max(2, Math.min(dx - ri(0, 2), xR - 4));
          if (hx + 3 > xR - 1 || dx < hx || dx > hx + 3) continue;
          // hidden room above the house
          for (let y = yT - 4; y <= yT - 1; y++) for (let x = hx - 1; x <= hx + 4; x++) g[y][x] = '#';
          const hr = { t: 'hidden', x0: hx, y0: yT - 3, x1: hx + 3, y1: yT - 1, ch: 'S', id: rooms.length, hidden: 1 }; rooms.push(hr); roomOfCh.S = hr;
          for (let y = hr.y0; y <= hr.y1; y++) for (let x = hr.x0; x <= hr.x1; x++) g[y][x] = 'S';
          g[yT][dx] = '='; doorMap[dx + ',' + yT] = 'S';
          const shelf = { art: 'bookshelf', name: 'Bookshelf', at: [dx, r.y0, 2, 1], H: 62, secret: 1, seed: 2, room: r.ch, mustReach: 1 };
          furn.push(shelf); occ[r.y0][dx] = 1; occ[r.y0][dx + 1] = 1; occ[r.y0][dx + 2] = V2 ? 1 : 3; occ[r.y0 + 1][dx] = 3; occ[r.y0 + 1][dx + 1] = 3;   // 0.9 (v2): the shelf slides into dx+2, so nothing may need that tile as a path
          furn.push({ art: 'crate', name: 'Hidden crate', at: [hx, hr.y0, 2, 1], H: 30, time: 3, noise: 4, loot: 'crate', rare: 1, secretLoot: 1, room: 'S', pocket: 1 });
          furn.push({ art: 'supply', at: [hx + 2, hr.y0, 2, 1], H: 56, room: 'S', pocket: 1 });
          secOut.push({ type: 'shelf', furn: furn.indexOf(shelf), room: 'S' });
          ok = true; break;
        }
        if (ok) break;
      }
    }
    let atticSpec = null;
    if (wantAttic) {
      const ax0 = xR + 2, ay0 = ri(yT + 1, Math.max(yT + 1, yB - 7));
      for (let y = ay0; y <= ay0 + 5; y++) for (let x = ax0; x <= ax0 + 5; x++) g[y][x] = (y === ay0 || y === ay0 + 5 || x === ax0 || x === ax0 + 5) ? '#' : 'Z';
      const ar = { t: 'attic', x0: ax0 + 1, y0: ay0 + 1, x1: ax0 + 4, y1: ay0 + 4, ch: 'Z', id: rooms.length, isolated: 1 }; rooms.push(ar); roomOfCh.Z = ar;
      furn.push({ art: 'crate', name: 'Old trunk', at: [ax0 + 1, ay0 + 1, 2, 1], H: 30, time: 2.6, noise: 3, loot: 'attic', rare: 1, secretLoot: 1, room: 'Z', pocket: 1 });
      atticSpec = { ar };
    }

    // ---- furnish every room
    for (const r of rooms) if (!r.hidden && !r.isolated) furnish(r);
    // the street: lamp post and a bin right by the stoop (always has something: the first container near the start)
    const binX = fdx + (fdx > 4 ? -3 : 3);
    furn.push({ art: 'trash', name: 'Garbage bin', at: [binX, yB + 1, 1, 1], H: 26, time: 1.4, noise: 3, loot: 'trash', noEmpty: 1, room: 'o' });
    const lampX = Math.max(1, Math.min(MW - 2, fdx + (rnd() < .5 ? -7 : 6)));
    if (Math.abs(lampX - binX) > 1) furn.push({ art: 'lamppost', at: [lampX, yB + 1, 1, 1], H: 112, room: 'o' });

    // ---- remaining secrets
    const conts = () => furn.filter(f => f.loot && !f.secretLoot && f.room !== 'o');
    if (atticSpec) {
      const hallCells = [];
      for (const r of rooms) if (r.spine || r.t === 'hall' || r.t === 'foyer') for (let y = r.y0 + 1; y <= r.y1 - 1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x] && !occ[y - 1][x]) hallCells.push([x, y]);
      if (V4 && !hallCells.length) for (const r of rooms) if (['living', 'great', 'studio', 'den', 'porch', 'mudroom', 'dining', 'lobby', 'office', 'storage', 'backroom'].includes(r.t)) for (let y = r.y0 + 1; y <= r.y1 - 1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x] && !occ[y - 1][x]) hallCells.push([x, y]);
      if (hallCells.length) {
        const [hx, hy] = pick(hallCells); occ[hy][hx] = 3;
        const ar = atticSpec.ar;
        const holders = conts().filter(f => ['toolbox', 'shelves', 'coat', 'wardrobe', 'locker', 'workbench'].includes(f.art) && !f.lockable);
        const holder = holders.length ? pick(holders) : pick(conts());
        if (holder) { (holder.extra = holder.extra || []).push('pole'); holder.noEmpty = 1;
          secOut.push({ type: 'attic', hatch: { x: hx + .5, y: hy + .6 }, hole: { x: ar.x0 + 1.5, y: ar.y1 + .2 }, room: 'Z' }); }
      }
    }
    if (secTypes.includes('rug')) {
      const tables = furn.filter(f => (f.table || f.art === 'coffee' || f.desk) && !f.pocket);
      const rdist = reach();   // the loose board must be a floor cell she can actually stand on
      for (const t of shuffle(tables)) {
        const r = roomOfCh[t.room];
        const rx0 = Math.max(r.x0, t.at[0] - 1), ry0 = Math.max(r.y0, t.at[1] - 1), rx1 = Math.min(r.x1, t.at[0] + t.at[2]), ry1 = Math.min(r.y1, t.at[1] + t.at[3]);
        const cells = [], good = [];
        for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) if (!occ[y][x] && (y === t.at[1] + t.at[3] || x === t.at[0] + t.at[2])) cells.push([x, y]);
        if (!cells.length) continue;
        // 0.9: the rug has to lie mostly on open floor, with at least 2 tiles of it she can stand on
        let open = 0, all = 0; for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) { all++; if (occ[y][x] !== 1 && rdist[y * MW + x] >= 0) open++; }
        if (V2 && (open < 2 || open < all * .45)) continue;
        // 0.8: prefer a board cell she can stand on (also left of the table). Same single roll as before, so seeds keep their houses.
        for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) if (!occ[y][x] && rdist[y * MW + x] >= 0 && (y === t.at[1] + t.at[3] || x === t.at[0] + t.at[2] || x === t.at[0] - 1)) good.push([x, y]);
        const v = rnd(), orig = cells[Math.floor(v * cells.length)], use = good.length ? good : cells, [bx, by] = use[Math.floor(v * use.length)]; occ[orig[1]][orig[0]] = 3;   // reserve the old cell: the rest of the house rolls exactly as before
        const holders = conts().filter(f => f.room !== t.room && !f.lockable);
        if (!holders.length) continue;
        const holder = pick(holders); (holder.extra = holder.extra || []).push('note'); holder.noEmpty = 1;
        L.note = t.table && ['kitchen', 'dining', 'breakroom', 'great', 'studio'].includes(r.t) ? NOTES.supper : t.art === 'coffee' ? NOTES.tv : t.desk ? NOTES.desk : NOTES.any;
        secOut.push({ type: 'rug', rug: { x: rx0 + .15, y: ry0 + .2, w: rx1 - rx0 + .7, h: ry1 - ry0 + .6 }, board: { x: bx, y: by }, orig: { x: orig[0], y: orig[1] }, room: t.room });
        break;
      }
    }
    if (secTypes.includes('panel')) {
      const spots = [];
      for (const r of rooms) if (!r.hidden && !r.isolated && r !== front) for (let x = r.x0; x <= r.x1; x++) { const y = r.y0 - 1; if (g[y][x] === '#' && g[y][x - 1] === '#' && g[y][x + 1] === '#' && !occ[r.y0][x] && !furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) spots.push([x, y, r]); }
      if (spots.length) {
        const [x, y, r] = pick(spots); occ[y + 1][x] = 3;
        const f = { art: 'wallpanel', at: [x, y, 1, 1], H: 0, wall: 1, solid: 0, room: r.ch, panel: 1 }; furn.push(f);
        secOut.push({ type: 'panel', furn: furn.indexOf(f), room: r.ch });
        if (rnd() < .6) { const hs = conts().filter(c => !c.lockable); if (hs.length) { const hh = pick(hs); (hh.extra = hh.extra || []).push('crowbar'); hh.noEmpty = 1; } }
      }
    }
    if (!secOut.length) return null;

    // ---- locks: some containers are locked, harder in dangerous places
    const nLocks = ri(rc.locks[0], rc.locks[1]);
    const lockables = shuffle(furn.filter(f => f.lockable && !(f.extra && f.extra.length)));
    lockables.sort((a, b) => (b.mustLock || 0) - (a.mustLock || 0));
    let locked = 0;
    for (const f of lockables) { if (locked >= nLocks && !f.mustLock) break; f.lock = f.mustLock && type === 'pharmacy' && rnd() < .5 ? 'hard' : f.lockable; locked++; }
    if (locked < nLocks) { // add a safe somewhere sensible
      for (const r of shuffle(rooms.filter(r => ['bedroom', 'office', 'study', 'storage', 'backroom'].includes(r.t)))) {
        let p = null; for (const [x, y] of candidates(r, F('safe', 1, 1, 46, { place: 's' }))) { p = tryPlace(r, F('safe', 1, 1, 46, { ...L_('safe', 'Safe', 2.2, 2), place: 's' }), x, y); if (p) break; }
        if (p) { p.lock = 'hard'; locked++; if (locked >= nLocks) break; }
      }
    }

    // ---- zombies
    const dist = reach();
    const nZ = ri(rc.zombies[0], rc.zombies[1]);
    const zCells = [];
    for (const r of rooms) if (!r.hidden && !r.isolated) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x] && dist[y * MW + x] >= 0 && Math.hypot(x - fdx, y - yB) > 6) zCells.push([x, y, r]);
    const sofas = furn.filter(f => f.sofa);
    for (let i = 0; i < nZ && zCells.length; i++) {
      const tough = rc.tough && rnd() < rc.tough;
      const zd = { st: 'idle' };
      if (tough) { zd.hp = 150; zd.dmg = 1.3; zd.kind = 'tough'; }
      const sofa = sofas.find(s => !s.used);
      if (i === 0 && sofa && rnd() < .7) {
        const [tx, ty, tw] = sofa.at; sofa.used = 1;
        if (!occ[ty + 1][tx + 1]) { Object.assign(zd, { st: 'sleep', x: tx + 2.4, y: ty + .62, sleep: { furn: furn.indexOf(sofa), draw: { x: tx + tw * .82, y: ty + .12 }, key: ty + 1, wake: { x: tx + 1.5, y: ty + 1.55 } } }); L.zombies.push(zd); continue; }
      }
      const k = Math.floor(rnd() * zCells.length), [x, y] = zCells.splice(k, 1)[0];
      zd.x = x + .5; zd.y = y + .6; L.zombies.push(zd);
    }

    // ---- decor and rugs
    const facade = [];
    for (let x = 2; x <= xR - 1; x++) facade.push(x);
    const pair = (x, y, k) => { if (!L.decor[x + ',' + y] && !L.decor[(x + 1) + ',' + y] && g[y][x] === '#' && g[y][x + 1] === '#') { L.decor[x + ',' + y] = k; L.decor[(x + 1) + ',' + y] = k; } };
    for (let x = 2; x < xR - 1; x += ri(3, 5)) if (Math.abs(x - fdx) > 2 && Math.abs(x + 1 - fdx) > 2) pair(x, yB, 'fwin');
    if (g[yB][fdx - 1] === '#') L.decor[(fdx - 1) + ',' + yB] = 'num';
    if (g[yB][fdx + 1] === '#') L.decor[(fdx + 1) + ',' + yB] = 'lamp';
    for (const r of rooms) {
      if (r.hidden || r.isolated) continue;
      const y = r.y0 - 1, ext = y === yT;
      for (let x = r.x0; x <= r.x1; x++) {
        if (g[y][x] !== '#' || L.decor[x + ',' + y] || furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) continue;
        const above = furn.find(f => f.at[1] === r.y0 && x >= f.at[0] && x < f.at[0] + f.at[2]);
        if (r.t === 'kitchen' || r.t === 'breakroom' || (V4 && (r.t === 'great' || r.t === 'studio'))) { if (above && ['counter', 'sink', 'drawers', 'stove'].includes(above.art)) L.decor[x + ',' + y] = 'upper'; continue; }
        if (r.t === 'bath' && rnd() < .4 && x < r.x1) { pair(x, y, 'mirror'); continue; }
        if (above && above.H > 50) continue;
        const q = rnd();
        if (ext && q < .35 && x < r.x1) pair(x, y, 'window');
        else if (q < .12) L.decor[x + ',' + y] = pick(['frame', 'frame2', 'clock']);
        else if (q < .18 && x < r.x1 && (r.t === 'living' || r.t === 'study' || r.t === 'foyer' || r.t === 'dining')) pair(x, y, 'painting');
        else if (q < .2 && (r.t === 'closet' || r.t === 'storage' || r.t === 'backroom')) L.decor[x + ',' + y] = pick(['tally', 'scrawl', 'hooks']);
      }
    }
    for (const f of furn) if (f.art === 'coffee') { const r = roomOfCh[f.room]; L.rugs.push([Math.max(r.x0, f.at[0] - .6), Math.max(r.y0, f.at[1] - 1.3), f.at[2] + 1.2, 3, 1]); }
    for (const f of furn) if (f.art === 'bed') { const r = roomOfCh[f.room], rx = f.at[0] + f.at[2] + .3; if (!r || rx + 2.6 <= r.x1 + 1) L.rugs.push([rx, f.at[1] + 1, 2.6, 1.8, 0]); else if (f.at[0] - 2.9 >= r.x0) L.rugs.push([f.at[0] - 2.9, f.at[1] + 1, 2.6, 1.8, 0]); }   // 0.9: never outside the room
    if (!V4) { if (spine.y1 - spine.y0 > 4 && !secOut.some(s => s.type === 'rug' && s.room === spine.ch)) L.rugs.push([spine.x0 + (spine.x1 - spine.x0) / 2 - .5 + .25, spine.y0 + 1, 1.5, spine.y1 - spine.y0 - 1, 2]); }
    else for (const r of rooms) if (r.t === 'hall' && !secOut.some(s => s.type === 'rug' && s.room === r.ch)) {   // 0.14: a runner down every longer hallway, either way round
      if (r.y1 - r.y0 > 4 && r.y1 - r.y0 >= r.x1 - r.x0) L.rugs.push([r.x0 + (r.x1 - r.x0) / 2 - .5 + .25, r.y0 + 1, 1.5, r.y1 - r.y0 - 1, 2]);
      else if (r.x1 - r.x0 > 4 && r.x1 - r.x0 > r.y1 - r.y0) L.rugs.push([r.x0 + 1, r.y0 + (r.y1 - r.y0) / 2 - .5 + .25, r.x1 - r.x0 - 1, 1.5, 2]);
    }
    for (const r of rooms) if (r.t === 'bath') L.rugs.push([r.x0 + .5, r.y1 - .2, 1.6, 1, 3]);

    // ---- final check: every room reachable, every container reachable
    const fd = reach();
    for (const r of rooms) { if (r.hidden || r.isolated) continue; let any = false; for (let y = r.y0; y <= r.y1 && !any; y++) for (let x = r.x0; x <= r.x1; x++) if (fd[y * MW + x] >= 0) { any = true; break; } if (!any) return null; }
    for (const f of furn) if ((f.loot || f.mustReach) && !f.pocket && !accessible(f, fd)) return null;

    // 0.8: if anything later landed on the preferred board cell (or it cannot be stood on), fall back to the old cell
    for (const sc of secOut) if (sc.type === 'rug' && sc.orig) { const b = sc.board; if (occ[b.y][b.x] === 1 || fd[b.y * MW + b.x] < 0) sc.board = sc.orig; delete sc.orig; }
    // ---- output
    for (const r of rooms) { const def = ROOMS[r.t]; L.rooms[r.ch] = r.hidden ? { name: 'Hidden room', style: 's', hidden: true } : r.isolated ? { name: 'Attic', style: 'a', isolated: true } : { name: def ? def.n : 'Room', style: def ? def.st : 'h', kind: r.t }; }
    L.rooms.o = { name: front ? 'Sidewalk' : 'Stoop', style: 'o' };
    if (V4) L.plan = plan.arch;   // 0.14: which floor-plan archetype (debug / tests)
    const num = ri(2, 480), street = pick(D.STREETS);
    rnd();   // 0.4-0.5 rolled the Thanksgiving turkey here: keep the sequence so a seed still makes the same house
    Object.assign(L, {
      type, name: bt.n, size: bt.size, rows: g.map(row => row.join('')), street: 'o', streetY: yB + 1, frontDoor: fdx + ',' + yB,
      stoop: { x: fdx + .5 }, start, houseNum: num, address: num + ' ' + street, secrets: secOut,
      boss: bossSpots(seed, rooms, zCells, fdx, yB, V4),
      wanderer: rnd() < .55 || type === 'police', wandererT: ri(60, 110), wanderHp: rc.tough ? 150 : 100,
      emptyPct: .2, danger: bt.danger + (nZ > rc.zombies[0] + 1 ? 1 : 0),
      nZombies: L.zombies.length, nLocks: furn.filter(f => f.lock).length,
      lockNames: furn.filter(f => f.lock).map(f => f.name),
    });
    L.danger = Math.min(5, L.danger);
    keyExtras();
    // ---- 0.8: brass-key extras (a locked room, a parked car). They roll from their OWN random stream after
    // the house is finished, so every seed still makes exactly the same house as before - plus, now and then, these.
    function keyExtras() {
      const kr = D.mulberry32((seed ^ 0x4b1d5eed) >>> 0);
      const kshuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(kr() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      const V3 = (opts.gv || 1) >= 3;
      // 0.10: rarer, but each one is worth a key (owner: "less common")
      const pRoom = V3 ? ({ mansion: .3, police: .3, pharmacy: .2, school: .15 }[type] || .1) : ({ mansion: .5, police: .5, school: .3 }[type] || .2), pCar = V3 ? .2 : .42;
      const wantRoom = kr() < pRoom, wantCar = kr() < pCar;
      if (wantRoom) lockedRoom();
      if (wantCar) parkedCar();
      if (V3) jackpots();
      // 0.10: every locked room holds one guaranteed prize that fits the building, the car trunk too;
      // about half the time the room's key is hidden in a drawer somewhere else in the same house.
      function jackpots() {
        if (L.keyRoom) {
          const inRoom = furn.filter(f => f.keyRoom && f.loot && !f.secretLoot);
          if (inRoom.length) inRoom[0].jack = { police: 'gun', pharmacy: 'meds', mansion: 'safe' }[type] || 'stash';
          if (kr() < .5) {
            const PREF = ['dresser', 'desk', 'night', 'side', 'cabinet', 'hutch', 'coat', 'locker', 'storage', 'shelves'];
            const outs = furn.filter(f => f.loot && !f.keyRoom && !f.car && !f.secretLoot && !f.secret && !f.pocket && !f.lock && f.room !== 'o' && !f.empty);
            const pick = kshuf(outs.filter(f => PREF.includes(f.loot)))[0] || kshuf(outs)[0];
            if (pick) { pick.extra = (pick.extra || []).concat('key'); pick.noEmpty = 1; L.keyRoom.keyHere = 1; }
          }
        }
        if (L.car) { const t = furn.find(f => f.car && f.car.half === 1); if (t) t.jack = 'trunk'; }
      }
      function roomAtCell(x, y) { return roomOfCh[g[Math.floor(y)] && g[Math.floor(y)][Math.floor(x)]] || null; }
      function lockedRoom() {
        const bad = new Set(secOut.map(s => s.room));
        for (const f of furn) if (f.secret || f.panel || f.wall && f.panel || (f.extra && f.extra.length)) bad.add(f.room);
        for (const s of secOut) if (s.hatch) { const r = roomAtCell(s.hatch.x, s.hatch.y); if (r) bad.add(r.ch); }
        for (const z of L.zombies) { const r = roomAtCell(z.x, z.y); if (r) bad.add(r.ch); }
        if (L.boss && L.boss.kitchen) { const r = roomAtCell(L.boss.kitchen.x, L.boss.kitchen.y); if (r) bad.add(r.ch); }
        const PREF = ['study', 'evidence', 'armory', 'office', 'bedroom', 'storage', 'cellar', 'backroom', 'pharmback', 'lockers', 'closet', 'janitor', 'nurse'];
        if (V4) PREF.push('den', 'nursery', 'pantryrm', 'laundryrm', 'mudroom');   // 0.14: v4's extra rooms can be locked too
        const cands = kshuf(rooms.filter(r => !r.spine && r !== front && !r.hidden && !r.isolated && PREF.includes(r.t) && !bad.has(r.ch) && doors.filter(d => d.a === r.id || d.b === r.id).length === 1))
          .sort((a, b) => PREF.indexOf(a.t) - PREF.indexOf(b.t));
        for (const r of cands.slice(0, 3)) {
          const d = doors.find(d => d.a === r.id || d.b === r.id), other = rooms[d.a === r.id ? d.b : d.a];
          const prev = occ[d.y][d.x]; occ[d.y][d.x] = 1;
          // everything outside the room must still be reachable with the door shut
          const dist = reach(); let ok = true;
          for (const q of rooms) { if (q === r || q.hidden || q.isolated) continue; let any = false; for (let y = q.y0; y <= q.y1 && !any; y++) for (let x = q.x0; x <= q.x1; x++) if (dist[y * MW + x] >= 0) { any = true; break; } if (!any) { ok = false; break; } }
          if (ok) for (const f of furn) if ((f.loot || f.mustReach) && !f.pocket && f.room !== r.ch && !accessible(f, dist)) { ok = false; break; }
          if (!ok) { occ[d.y][d.x] = prev; continue; }
          // the room's containers get the better table; add a strongbox if it has fewer than 2
          let conts = furn.filter(f => f.room === r.ch && f.loot && !f.secretLoot);
          if (conts.length < 2) {
            occ[d.y][d.x] = prev; // check the strongbox against the room with the door open
            const cells = []; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x]) cells.push([x, y]);
            for (const [x, y] of kshuf(cells)) {
              const f = { art: 'toolbox', name: 'Strongbox', at: [x, y, 1, 1], H: 20, time: 2.2, noise: 2.5, loot: 'lockedroom', room: r.ch };
              occ[y][x] = 1; furn.push(f); const dd = reach();
              if (furn.every(o => !(o.loot || o.mustReach) || o.pocket || accessible(o, dd)) && dd[d.y * MW + d.x] >= 0) break;
              furn.pop(); occ[y][x] = 0;
            }
            occ[d.y][d.x] = 1; conts = furn.filter(f => f.room === r.ch && f.loot && !f.secretLoot);
          }
          if (!conts.length) { occ[d.y][d.x] = prev; continue; }
          for (const f of conts.slice(0, 3)) f.loot = 'lockedroom';
          for (const f of furn) if (f.room === r.ch) { f.keyRoom = 1; if (f.loot) f.noEmpty = 1; }
          furn.push({ art: 'keydoor', name: 'Locked door', at: [d.x, d.y, 1, 1], H: 56, keyDoor: 1, keyLock: 'room', vert: d.horiz ? 0 : 1, room: other.ch, inner: r.ch });
          L.keyRoom = { room: r.ch, kind: r.t, door: [d.x, d.y] };
          return;
        }
      }
      function parkedCar() {
        const y = yB + 1, boss = fdx - 9, xs = [];
        for (let x = 1; x + 4 <= MW - 1; x++) {
          if (x + 4 > fdx - 2 && x < fdx + 3) continue;               // keep the stoop clear
          if (x <= boss + 1.5 && x + 4 >= boss - 1.5) continue;        // the event mini-boss stands here
          let ok = true;
          for (let xx = x - 1; xx < x + 5 && ok; xx++) if (g[y][xx] !== 'o' || g[y - 1][xx] !== '#' || occ[y][xx] || furn.some(f => f.at[1] === y && xx >= f.at[0] && xx < f.at[0] + f.at[2])) ok = false;
          if (ok) xs.push(x);
        }
        if (!xs.length) return;
        const x = xs[Math.floor(kr() * xs.length)], col = Math.floor(kr() * 5), flip = kr() < .5 ? 1 : 0;
        // two halves of one car: the glove box at the front, the trunk at the back
        const front = { art: 'pcar', name: 'Glove box', at: [flip ? x + 2 : x, y, 2, 1], H: 34, time: 1.8, noise: 3, loot: 'car', keyLock: 'car', car: { half: 0, col, flip }, noEmpty: 1, room: 'o' };
        const back = { art: 'pcar', name: 'Trunk', at: [flip ? x : x + 2, y, 2, 1], H: 34, time: 2.4, noise: 3.5, loot: 'car', keyLock: 'car', car: { half: 1, col, flip }, noEmpty: 1, room: 'o' };
        furn.push(front, back);
        for (let xx = x; xx < x + 4; xx++) occ[y][xx] = 1;
        const dd = reach(); if (!accessible(front, dd) || !accessible(back, dd) || dd[(y + 1) * MW + fdx] < 0) { furn.splice(-2); for (let xx = x; xx < x + 4; xx++) occ[y][xx] = 0; return; }
        L.car = { x, y };
      }
    }
    // furniture: drop generator-only fields
    for (const f of furn) { delete f.lockable; delete f.mustLock; delete f.used; delete f.mustReach; }
    return L;
  }
  // Event mini-boss spots (events.js decides whether one shows up): rolled from their own random stream so the
  // event never changes the house itself. yard = the sidewalk left of the stoop; kitchen = a free kitchen floor tile.
  function bossSpots(seed, rooms, zCells, fdx, yB, v4) {
    const br = D.mulberry32((seed ^ 0x7b3a1f29) >>> 0), roll = br(), roll2 = br();
    const kc = zCells.filter(c => c[2] && (c[2].t === 'kitchen' || c[2].t === 'breakroom' || (v4 && (c[2].t === 'great' || c[2].t === 'studio'))));
    const k = kc.length ? kc[Math.floor(br() * kc.length)] : null;
    return { roll, roll2, yard: { x: Math.max(1.5, fdx - 9), y: yB + 1.95 }, kitchen: k ? { x: k[0] + .5, y: k[1] + .6 } : null };
  }
  function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }

  // ---------------------------------------------------------------- the hand-made tutorial house (first run)
  GEN.tutorial = function () {
    const r = (s, n) => s.repeat(n);
    const ATTIC = { 11: '######', 12: '#ZZZZ#', 13: '#ZZZZ#', 14: '#ZZZZ#', 15: '#ZZZZ#', 16: '######' };
    const raw = [
      r(' ', 24), ' ' + r('#', 22) + ' ', ...Array(7).fill(' #' + r('k', 20) + '# '), ' ' + r('#', 19) + 'K## ',
      ' #ssss#bbbbbb#cccc#hhh# ', ' #ssss#bbbbbb#cccc#hhh# ', ' #ssss#bbbbbb#ccccChhh# ', ' #ssss#bbbbbb#cccc#hhh# ', ' ##X#####B#########hhh# ',
      ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + 'Rhhh# ', ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + '#hhh# ',
      ' ' + r('#', 18) + 'hhh# ',
      ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + 'Lhhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ',
      ' ' + r('#', 19) + 'F## ', r('o', 24), r('o', 24),
    ].map((row, y) => row + (y >= 28 ? r('o', 6) : ATTIC[y] || r(' ', 6)));
    const DOORCH = { K: 'k', C: 'c', R: 'r', L: 'l', B: 'b', F: 'h', X: 's' };
    const doors = {};
    const rows = raw.map((row, y) => row.split('').map((c, x) => { if (DOORCH[c]) { doors[x + ',' + y] = DOORCH[c]; return c === 'X' ? '=' : '+'; } return c === 's' ? 'S' : c; }).join(''));
    doors['3,14'] = 'S';
    const furn = [
      { art: 'fridge', name: 'Fridge', at: [2, 2, 1, 1], H: 62, time: 2.4, noise: 5.5, loot: 'fridge' },
      { art: 'counter', name: 'Cabinets', at: [3, 2, 2, 1], H: 32, time: 1.8, noise: 2.5, loot: 'cabinet' },
      { art: 'stove', at: [5, 2, 1, 1], H: 32 }, { art: 'sink', at: [6, 2, 2, 1], H: 32 },
      { art: 'drawers', name: 'Kitchen drawers', at: [8, 2, 1, 1], H: 32, time: 1.6, noise: 3.5, loot: 'kdrawers' },
      { art: 'pantry', name: 'Pantry', at: [10, 2, 2, 1], H: 62, time: 2.6, noise: 4.5, loot: 'pantry' },
      { art: 'trash', at: [13, 2, 1, 1], H: 26 }, { art: 'hutch', at: [19, 2, 2, 1], H: 62 },
      { art: 'island', name: 'Island drawers', at: [4, 5, 3, 1], H: 32, time: 1.8, noise: 3, loot: 'island' },
      { art: 'table', at: [15, 4, 3, 2], H: 24, solid: 1, cloth: 1, items: 1 },
      { art: 'chair', at: [14, 4, 1, 1], H: 16, solid: 0 }, { art: 'chair', at: [18, 4, 1, 1], H: 16, solid: 0 }, { art: 'chair', at: [16, 3, 1, 1], H: 16, solid: 0 },
      { art: 'toilet', at: [7, 10, 1, 1], H: 24 },
      { art: 'vanity', name: 'Vanity', at: [8, 10, 2, 1], H: 30, time: 1.6, noise: 2.5, loot: 'vanity' },
      { art: 'medcab', name: 'Medicine cabinet', at: [10, 9, 1, 1], H: 0, time: 1.5, noise: 2, loot: 'medcab', wall: 1, solid: 0 },
      { art: 'tub', at: [11, 10, 2, 2], H: 24, solid: 1 },
      { art: 'shelves', name: 'Utility shelves', at: [14, 10, 2, 1], H: 58, time: 2.4, noise: 4, loot: 'shelves', extra: ['crowbar'] },
      { art: 'toolbox', name: 'Toolbox', at: [17, 10, 1, 1], H: 20, time: 1.8, noise: 3.5, loot: 'toolbox', lock: 'medium', extra: ['pole'] },
      { art: 'heater', at: [14, 13, 1, 1], H: 54, solid: 1 },
      { art: 'supply', at: [2, 10, 2, 1], H: 56 },
      { art: 'crate', name: 'Hidden crate', at: [4, 10, 2, 1], H: 30, time: 3, noise: 4, loot: 'crate', rare: 1, secretLoot: 1 },
      { art: 'crate', name: 'Old trunk', at: [25, 12, 2, 1], H: 30, time: 2.6, noise: 3, loot: 'attic', rare: 1, secretLoot: 1 },
      { art: 'cot', at: [5, 11, 1, 2], H: 12, solid: 1 },
      { art: 'bookshelf', name: 'Bookshelf', at: [3, 15, 2, 1], H: 62, secret: 1, seed: 2 },
      { art: 'bed', at: [6, 15, 2, 3], H: 18 },
      { art: 'nightstand', name: 'Nightstand', at: [8, 15, 1, 1], H: 24, time: 1.5, noise: 2, loot: 'night' },
      { art: 'wardrobe', name: 'Bedroom closet', at: [12, 15, 2, 1], H: 64, time: 2.8, noise: 5, loot: 'wardrobe', lock: 'easy' },
      { art: 'safe', name: 'Gun safe', at: [2, 19, 1, 1], H: 46, time: 2.2, noise: 2, loot: 'safe', lock: 'hard' },
      { art: 'dresser', name: 'Dresser', at: [14, 15, 3, 1], H: 34, time: 2.4, noise: 3.5, loot: 'dresser', extra: ['note'] },
      { art: 'desk', name: 'Desk', at: [15, 19, 2, 1], H: 30, time: 2, noise: 2.5, loot: 'desk' },
      { art: 'chair', at: [15, 18, 1, 1], H: 16, solid: 0 },
      { art: 'sofa', at: [4, 21, 3, 1], H: 26 }, { art: 'sidetable', at: [7, 21, 1, 1], H: 24 }, { art: 'coffee', at: [4, 23, 3, 1], H: 16, solid: 1 },
      { art: 'tvstand', name: 'TV stand', at: [4, 26, 3, 1], H: 26, time: 1.8, noise: 2.5, loot: 'tv' },
      { art: 'armchair', at: [9, 22, 1, 1], H: 22, solid: 1 }, { art: 'bookshelf', at: [13, 21, 2, 1], H: 62, seed: 5 }, { art: 'plant', at: [16, 21, 1, 1], H: 20, solid: 1 },
      { art: 'coat', name: 'Coat closet', at: [21, 10, 1, 1], H: 64, time: 2.4, noise: 4.5, loot: 'coat' },
      { art: 'sidetable', name: 'Hall table', at: [21, 19, 1, 1], H: 24, time: 1.4, noise: 2, loot: 'hall' },
      { art: 'shoerack', at: [21, 26, 1, 1], H: 14, solid: 1 },
      { art: 'trash', name: 'Garbage bin', at: [15, 28, 1, 1], H: 26, time: 1.4, noise: 3, loot: 'trash', noEmpty: 1 },
      { art: 'lamppost', at: [12, 28, 1, 1], H: 112, solid: 1 },
    ];
    furn.forEach(f => { if (['Dresser', 'Toolbox', 'Utility shelves'].includes(f.name)) f.noEmpty = 1; });
    const sofaIdx = furn.findIndex(f => f.art === 'sofa'), shelfIdx = furn.findIndex(f => f.secret);
    return {
      id: 'tutorial', type: 'tutorial', name: 'Rowhouse', size: 'M', address: '14 Halsey St', houseNum: 14, danger: 1,
      rows, doors, street: 'o', streetY: 28, frontDoor: '20,27', stoop: { x: 20.5 }, start: { x: 20.5, y: 28.6 },
      rooms: { k: { name: 'Kitchen', style: 'k' }, b: { name: 'Bathroom', style: 'b' }, c: { name: 'Utility closet', style: 'c' }, S: { name: 'Hidden room', style: 's', hidden: true },
        r: { name: 'Bedroom', style: 'r' }, l: { name: 'Living room', style: 'l' }, h: { name: 'Hallway', style: 'h' }, o: { name: 'Stoop', style: 'o' }, Z: { name: 'Attic', style: 'a', isolated: true } },
      furn,
      decor: {
        '3,1': 'upper', '4,1': 'upper', '6,1': 'upper', '7,1': 'upper', '8,1': 'upper', '12,1': 'clock', '15,1': 'window', '16,1': 'window', '17,1': 'window',
        '2,9': 'tally', '3,9': 'scrawl', '5,9': 'tally2', '8,9': 'mirror', '9,9': 'mirror', '15,9': 'hooks', '19,9': 'frame',
        '10,14': 'window', '11,14': 'window', '16,14': 'frame2', '5,20': 'painting', '6,20': 'painting', '10,20': 'window', '11,20': 'window', '16,20': 'clock',
        '4,27': 'fwin', '5,27': 'fwin', '10,27': 'fwin', '11,27': 'fwin', '15,27': 'fwin', '16,27': 'fwin', '19,27': 'num', '21,27': 'lamp',
      },
      rugs: [[9.3, 16, 4.4, 2.6, 0], [3.4, 22.2, 4.2, 3.4, 1], [19.5, 11, 2, 14, 2], [7.5, 12.2, 1.8, 1.2, 3]],
      zombies: [
        { x: 6.4, y: 21.62, st: 'sleep', sleep: { furn: sofaIdx, draw: { x: 6.45, y: 21.12 }, key: 22, wake: { x: 5.5, y: 22.55 } } },
        { x: 8.6, y: 12.7, st: 'idle' },
      ],
      secrets: [
        { type: 'shelf', furn: shelfIdx, room: 'S' },
        { type: 'rug', rug: { x: 14.2, y: 3.2, w: 4.6, h: 3.4 }, board: { x: 17.845, y: 5.436 }, room: 'k' },
        { type: 'attic', hatch: { x: 20.5, y: 15.6 }, hole: { x: 26.5, y: 15.2 }, room: 'Z' },
      ],
      note: NOTES.supper, turkey: { x: 8, y: 28.95 }, wanderer: true, wandererT: 70,
      nZombies: 2, nLocks: 3, lockNames: ['Toolbox', 'Bedroom closet', 'Gun safe'],
    };
  };
})();
