// ============================================================
// pet-types.js  — Pet type definitions, patterns, accessories,
//                 hybrids, personalities, preferences & elder config
// Extracted from constants.js
// ============================================================

// ==================== PET PATTERNS ====================

const PET_PATTERNS = {
    solid: { name: 'Solid', description: 'Solid color' },
    spotted: { name: 'Spotted', description: 'Cute spots' },
    striped: { name: 'Striped', description: 'Bold stripes' },
    patchy: { name: 'Patchy', description: 'Color patches' }
};

// ==================== PET ACCESSORIES ====================

const ACCESSORIES = {
    // Hats
    partyHat: { name: 'Party Hat', emoji: '🎉', type: 'hat', position: 'top' },
    crown: { name: 'Crown', emoji: '👑', type: 'hat', position: 'top' },
    topHat: { name: 'Top Hat', emoji: '🎩', type: 'hat', position: 'top' },
    // Bows
    bow: { name: 'Bow', emoji: '🎀', type: 'bow', position: 'head' },
    ribbonBow: { name: 'Ribbon Bow', emoji: '🎗️', type: 'bow', position: 'head' },
    // Collars
    collar: { name: 'Collar', emoji: '⭕', type: 'collar', position: 'neck' },
    bandana: { name: 'Bandana', emoji: '🔺', type: 'collar', position: 'neck' },
    // Glasses
    glasses: { name: 'Glasses', emoji: '👓', type: 'glasses', position: 'eyes' },
    sunglasses: { name: 'Sunglasses', emoji: '🕶️', type: 'glasses', position: 'eyes' },
    // Costumes
    superhero: { name: 'Superhero Cape', emoji: '🦸', type: 'costume', position: 'body' },
    wizard: { name: 'Wizard Hat', emoji: '🧙', type: 'costume', position: 'top' }
};

// ==================== PET TYPES ====================

const PET_TYPES = {
    dog: {
        name: 'Puppy',
        emoji: '🐕',
        colors: ['#D4A574', '#8B7355', '#F5DEB3', '#A0522D', '#FFE4C4'],
        sounds: ['Woof!', 'Bark!', 'Arf!'],
        happySounds: ['Happy bark!', 'Tail wagging!', 'Playful woof!'],
        sadSounds: ['Whimper...', 'Sad whine...'],
        mythical: false
    },
    cat: {
        name: 'Kitty',
        emoji: '🐱',
        colors: ['#FFA500', '#808080', '#FFFFFF', '#000000', '#DEB887'],
        sounds: ['Meow!', 'Purr!', 'Mew!'],
        happySounds: ['Loud purring!', 'Happy meow!', 'Content purr!'],
        sadSounds: ['Sad meow...', 'Quiet mew...'],
        mythical: false
    },
    bunny: {
        name: 'Bunny',
        emoji: '🐰',
        colors: ['#FFFFFF', '#D4A574', '#808080', '#F5DEB3', '#FFB6C1'],
        sounds: ['Hop hop!', 'Sniff sniff!', 'Thump!'],
        happySounds: ['Binky jump!', 'Happy hop!', 'Excited thump!'],
        sadSounds: ['Quiet sniff...', 'Slow hop...'],
        mythical: false
    },
    bird: {
        name: 'Birdie',
        emoji: '🐦',
        colors: ['#FFD700', '#87CEEB', '#98FB98', '#FF6347', '#DDA0DD'],
        sounds: ['Tweet!', 'Chirp!', 'Whistle!'],
        happySounds: ['Happy song!', 'Joyful chirp!', 'Cheerful tweet!'],
        sadSounds: ['Quiet chirp...', 'Soft tweet...'],
        mythical: false
    },
    hamster: {
        name: 'Hammy',
        emoji: '🐹',
        colors: ['#D4A574', '#F5DEB3', '#FFFFFF', '#DEB887', '#FFE4C4'],
        sounds: ['Squeak!', 'Nibble nibble!', 'Scurry!'],
        happySounds: ['Happy squeak!', 'Wheel spinning!', 'Excited nibble!'],
        sadSounds: ['Soft squeak...', 'Quiet nibble...'],
        mythical: false
    },
    turtle: {
        name: 'Shelly',
        emoji: '🐢',
        colors: ['#228B22', '#556B2F', '#6B8E23', '#8FBC8F', '#2E8B57'],
        sounds: ['*slow blink*', '*head bob*', '*shell tap*'],
        happySounds: ['Happy waddle!', 'Excited stretch!', 'Shell shimmy!'],
        sadSounds: ['Hiding in shell...', 'Slow retreat...'],
        mythical: false
    },
    fish: {
        name: 'Bubbles',
        emoji: '🐟',
        colors: ['#FF6347', '#4169E1', '#FFD700', '#FF69B4', '#00CED1'],
        sounds: ['Blub!', 'Splash!', 'Bubble!'],
        happySounds: ['Happy splashing!', 'Joyful bubbles!', 'Excited swim!'],
        sadSounds: ['Slow swim...', 'Quiet blub...'],
        mythical: false
    },
    frog: {
        name: 'Hoppy',
        emoji: '🐸',
        colors: ['#32CD32', '#228B22', '#9ACD32', '#6B8E23', '#00FA9A'],
        sounds: ['Ribbit!', 'Croak!', 'Hop!'],
        happySounds: ['Happy croak!', 'Joyful ribbit!', 'Bouncy hop!'],
        sadSounds: ['Quiet ribbit...', 'Slow croak...'],
        mythical: false
    },
    hedgehog: {
        name: 'Spike',
        emoji: '🦔',
        colors: ['#8B7355', '#D2B48C', '#A0522D', '#DEB887', '#C4A882'],
        sounds: ['Snuffle!', '*nose twitch*', 'Squeak!'],
        happySounds: ['Happy snuffle!', 'Excited wiggle!', 'Joyful squeak!'],
        sadSounds: ['Curling up...', 'Quiet snuffle...'],
        mythical: false
    },
    panda: {
        name: 'Bamboo',
        emoji: '🐼',
        colors: ['#FFFFFF', '#F5F5F5', '#FFFAF0', '#FFF8DC', '#FAEBD7'],
        sounds: ['*munch munch*', '*happy roll*', 'Squeak!'],
        happySounds: ['Rolling around!', 'Happy munching!', 'Playful tumble!'],
        sadSounds: ['Sad eyes...', 'Slow munch...'],
        mythical: false
    },
    penguin: {
        name: 'Waddles',
        emoji: '🐧',
        colors: ['#2F4F4F', '#36454F', '#1C1C1C', '#4A4A4A', '#333333'],
        sounds: ['Honk!', 'Squawk!', '*waddle waddle*'],
        happySounds: ['Happy slide!', 'Joyful honk!', 'Belly slide!'],
        sadSounds: ['Sad honk...', 'Slow waddle...'],
        mythical: false
    },
    unicorn: {
        name: 'Sparkle',
        emoji: '🦄',
        colors: ['#FFB6C1', '#DDA0DD', '#E6E6FA', '#F0E68C', '#B0E0E6'],
        sounds: ['*magical neigh*', '*sparkle*', '*whinny*'],
        happySounds: ['Rainbow sparkles!', 'Magical gallop!', 'Joyful neigh!'],
        sadSounds: ['Dim sparkles...', 'Quiet whinny...'],
        mythical: true,
        unlockRequirement: 2,
        unlockMessage: 'Raise 2 pets to adult to unlock!'
    },
    dragon: {
        name: 'Ember',
        emoji: '🐉',
        colors: ['#DC143C', '#8B0000', '#FF4500', '#B22222', '#FF6347'],
        sounds: ['*tiny roar*', '*puff of smoke*', 'Rawr!'],
        happySounds: ['Fire breath!', 'Happy roar!', 'Wing flutter!'],
        sadSounds: ['Sad smoke puff...', 'Quiet growl...'],
        mythical: true,
        unlockRequirement: 3,
        unlockMessage: 'Raise 3 pets to adult to unlock!'
    }
};

const TREAT_TYPES = [
    { name: 'Cookie', emoji: '🍪' },
    { name: 'Cupcake', emoji: '🧁' },
    { name: 'Ice Cream', emoji: '🍦' },
    { name: 'Candy', emoji: '🍬' },
    { name: 'Donut', emoji: '🍩' },
    { name: 'Honey', emoji: '🍯' }
];

const FEEDBACK_MESSAGES = {
    feed: ['Yummy!', 'Delicious!', 'So tasty!', 'Nom nom!', 'Thank you!'],
    wash: ['So clean!', 'Sparkly!', 'Fresh!', 'Squeaky clean!', 'Shiny!'],
    play: ['So fun!', 'Wheee!', 'Again!', 'Yay!', 'Love it!'],
    sleep: ['So cozy!', 'Sweet dreams!', 'Zzz...', 'Night night!', 'Sleepy time!'],
    medicine: ['All better!', 'Feeling great!', 'So much better!', 'Healthy!', 'Happy again!'],
    groom: ['So fluffy!', 'Looking good!', 'Nice and tidy!', 'Beautiful!', 'Well groomed!'],
    exercise: ['Great run!', 'I fetched it!', 'So much fun!', 'Let\'s go again!', 'What a workout!'],
    treat: ['Yummy treat!', 'So special!', 'Best snack ever!', 'More please!', 'What a delight!'],
    cuddle: ['So cozy!', 'Loves cuddles!', 'Purr purr!', 'Snuggle time!', 'More pets please!']
};

const MOOD_MESSAGES = {
    happy: ['is super happy!', 'is feeling great!', 'is full of joy!', 'loves you!'],
    neutral: ['is doing okay.', 'is content.', 'is relaxed.'],
    sad: ['needs some love.', 'misses you.', 'wants attention.'],
    sleepy: ['is getting sleepy...', 'is yawning!', 'can barely keep eyes open...', 'is ready for bed!'],
    energetic: ['is full of energy!', 'is bright-eyed and bushy-tailed!', 'is raring to go!', 'had a great sleep!']
};

// ==================== BREEDING & GENETICS SYSTEM ====================

const BREEDING_CONFIG = {
    minAge: 'adult',                // Both pets must be adult stage
    minRelationship: 'friend',      // Minimum relationship level between parents
    cooldownMs: 30 * 60 * 1000,     // 30-minute cooldown between breedings per pet
    maxBreedingEggs: 2,             // Maximum incubating eggs at once
    mutationChance: 0.08,           // 8% chance of a mutation per breeding
    hybridChance: 0.35,             // 35% chance of hybrid when different species breed
    incubationBaseTicks: 20,        // Base ticks needed to hatch (1 tick per minute)
    statInheritanceNoise: 10,       // +/- random noise when inheriting hidden stats
    colorBlendChance: 0.6,          // 60% chance of color blending vs picking one parent's color
    patternInheritChance: 0.5       // 50/50 chance of inheriting either parent's pattern
};

// Hidden genetic stats that pass from parent to offspring
// These affect growth speed, care sensitivity, and competition potential
const GENETIC_STATS = {
    vigor: { label: 'Vigor', emoji: '💪', description: 'Growth speed and energy recovery', min: 1, max: 20, default: 10 },
    charm: { label: 'Charm', emoji: '💫', description: 'Happiness gain and show appeal', min: 1, max: 20, default: 10 },
    resilience: { label: 'Resilience', emoji: '🛡️', description: 'Slower stat decay and neglect resistance', min: 1, max: 20, default: 10 },
    appetite: { label: 'Appetite', emoji: '🍽️', description: 'Food efficiency and hunger decay rate', min: 1, max: 20, default: 10 }
};

// Mutation color palettes - rare colors not normally available
const MUTATION_COLORS = {
    prismatic: { name: 'Prismatic', hex: '#FF69B4', description: 'A shimmering rainbow hue' },
    ghostly: { name: 'Ghostly', hex: '#E8E8FF', description: 'An ethereal pale glow' },
    golden: { name: 'Golden', hex: '#FFD700', description: 'A radiant golden sheen' },
    obsidian: { name: 'Obsidian', hex: '#1C1C2E', description: 'Deep dark with purple undertones' },
    celestial: { name: 'Celestial', hex: '#7B68EE', description: 'A starry purple shimmer' },
    ember: { name: 'Ember', hex: '#FF4500', description: 'Glowing orange-red like hot coals' },
    frosted: { name: 'Frosted', hex: '#B0E0E6', description: 'Icy blue with white accents' },
    jade: { name: 'Jade', hex: '#00A86B', description: 'A deep polished green' }
};

// Mutation patterns - rare patterns not normally available
const MUTATION_PATTERNS = {
    galaxy: { name: 'Galaxy', description: 'Swirling cosmic patterns' },
    crystalline: { name: 'Crystalline', description: 'Geometric crystal facets' },
    flame: { name: 'Flame', description: 'Flickering fire-like markings' },
    floral: { name: 'Floral', description: 'Delicate flower patterns' }
};

// Hybrid pet types - created by breeding two different species
const HYBRID_PET_TYPES = {
    pegasus: {
        name: 'Pegasus',
        emoji: '🪽',
        parents: ['unicorn', 'bird'],
        colors: ['#E6E6FA', '#FFB6C1', '#87CEEB', '#F0E68C', '#DDA0DD'],
        sounds: ['*majestic whinny*', '*wing flutter*', '*magical chirp*'],
        happySounds: ['Soaring high!', 'Rainbow flight!', 'Magical wings!'],
        sadSounds: ['Drooping wings...', 'Quiet whinny...'],
        mythical: true,
        hybrid: true,
        description: 'A magical winged horse born from unicorn and bird'
    },
    kirin: {
        name: 'Kirin',
        emoji: '🦌',
        parents: ['dragon', 'unicorn'],
        colors: ['#FFD700', '#DC143C', '#DDA0DD', '#FF6347', '#E6E6FA'],
        sounds: ['*mystical roar*', '*ethereal bell*', '*gentle flame*'],
        happySounds: ['Blazing sparkles!', 'Mystical dance!', 'Radiant glow!'],
        sadSounds: ['Fading glow...', 'Quiet chime...'],
        mythical: true,
        hybrid: true,
        description: 'A mythical creature of fire and magic'
    },
    catbird: {
        name: 'Gryphkitten',
        emoji: '🐱',
        parents: ['cat', 'bird'],
        colors: ['#FFA500', '#FFD700', '#808080', '#87CEEB', '#DEB887'],
        sounds: ['Meow-tweet!', '*purring chirp*', 'Mew-whistle!'],
        happySounds: ['Pounce-flutter!', 'Happy soaring purr!', 'Feathered bounce!'],
        sadSounds: ['Quiet mew-chirp...', 'Droopy feathers...'],
        mythical: false,
        hybrid: true,
        description: 'A fluffy feline with tiny wings'
    },
    turtlefrog: {
        name: 'Shellhopper',
        emoji: '🐸',
        parents: ['turtle', 'frog'],
        colors: ['#228B22', '#32CD32', '#6B8E23', '#8FBC8F', '#00FA9A'],
        sounds: ['Ribbit-bonk!', '*shell hop*', 'Croak-clonk!'],
        happySounds: ['Armored hop!', 'Shell spin!', 'Bouncy shell!'],
        sadSounds: ['Slow shell drag...', 'Quiet croak...'],
        mythical: false,
        hybrid: true,
        description: 'A hopping amphibian with a protective shell'
    },
    bundgehog: {
        name: 'Fuzzspike',
        emoji: '🦔',
        parents: ['bunny', 'hedgehog'],
        colors: ['#FFFFFF', '#D4A574', '#8B7355', '#FFB6C1', '#D2B48C'],
        sounds: ['Hop-snuffle!', '*wiggle bounce*', 'Squeak-thump!'],
        happySounds: ['Spiky binky!', 'Fuzzy roll!', 'Bouncy snuffle!'],
        sadSounds: ['Curled and quiet...', 'Slow hop-snuffle...'],
        mythical: false,
        hybrid: true,
        description: 'A fluffy bunny with tiny protective spikes'
    },
    pandapenguin: {
        name: 'Snowpanda',
        emoji: '🐼',
        parents: ['panda', 'penguin'],
        colors: ['#FFFFFF', '#2F4F4F', '#F5F5F5', '#333333', '#FAEBD7'],
        sounds: ['*waddle munch*', '*slide and roll*', 'Honk-squeak!'],
        happySounds: ['Belly slide!', 'Snow roll!', 'Bamboo dance!'],
        sadSounds: ['Slow waddle...', 'Quiet munch...'],
        mythical: false,
        hybrid: true,
        description: 'A roly-poly bear that loves ice and bamboo'
    },
    dogfish: {
        name: 'Splashpup',
        emoji: '🐕',
        parents: ['dog', 'fish'],
        colors: ['#D4A574', '#4169E1', '#FFD700', '#87CEEB', '#00CED1'],
        sounds: ['Bark-blub!', '*splash woof*', 'Woof-bubble!'],
        happySounds: ['Splashing fetch!', 'Wave riding!', 'Bubble bark!'],
        sadSounds: ['Slow paddle...', 'Quiet blub-whimper...'],
        mythical: false,
        hybrid: true,
        description: 'An aquatic puppy with fins and a wagging tail'
    },
    hamsterbird: {
        name: 'Fluffwing',
        emoji: '🐹',
        parents: ['hamster', 'bird'],
        colors: ['#D4A574', '#FFD700', '#F5DEB3', '#87CEEB', '#FFE4C4'],
        sounds: ['Squeak-tweet!', '*flutter nibble*', 'Chirp-scurry!'],
        happySounds: ['Wheel-flight!', 'Seed shower!', 'Tiny soar!'],
        sadSounds: ['Quiet flutter...', 'Slow nibble...'],
        mythical: false,
        hybrid: true,
        description: 'A tiny hamster with delicate feathered wings'
    },
    dragonturtle: {
        name: 'Dracoturtle',
        emoji: '🐉',
        parents: ['dragon', 'turtle'],
        colors: ['#DC143C', '#228B22', '#8B0000', '#556B2F', '#FF4500'],
        sounds: ['*fire hiss*', '*shell rumble*', 'Rawr-bonk!'],
        happySounds: ['Flame shell!', 'Lava waddle!', 'Fire fortress!'],
        sadSounds: ['Smoke sigh...', 'Shell retreat...'],
        mythical: true,
        hybrid: true,
        description: 'An armored dragon with a fire-proof shell'
    }
};

// Map of parent type pairs to their hybrid result
// Both orderings map to the same hybrid
const HYBRID_LOOKUP = {};
(function buildHybridLookup() {
    for (const [hybridId, data] of Object.entries(HYBRID_PET_TYPES)) {
        const [p1, p2] = data.parents;
        HYBRID_LOOKUP[`${p1}-${p2}`] = hybridId;
        HYBRID_LOOKUP[`${p2}-${p1}`] = hybridId;
    }
})();

// Hybrids inherit combined type advantages from their parent species.
(function applyHybridTypeAdvantages() {
    for (const [hybridId, data] of Object.entries(HYBRID_PET_TYPES)) {
        const combined = new Set();
        (data.parents || []).forEach((parentType) => {
            (PET_TYPE_ADVANTAGES[parentType] || []).forEach((targetType) => combined.add(targetType));
        });
        PET_TYPE_ADVANTAGES[hybridId] = [...combined];
    }
})();

// Incubation room bonuses - certain rooms speed up or add benefits
const INCUBATION_ROOM_BONUSES = {
    bedroom: { speedMultiplier: 1.3, bonusStat: 'vigor', label: 'Cozy warmth (+30% speed, +Vigor)' },
    kitchen: { speedMultiplier: 1.1, bonusStat: 'appetite', label: 'Warm kitchen (+10% speed, +Appetite)' },
    bathroom: { speedMultiplier: 1.0, bonusStat: 'resilience', label: 'Humid air (+Resilience)' },
    backyard: { speedMultiplier: 1.2, bonusStat: 'vigor', label: 'Fresh air (+20% speed, +Vigor)' },
    park: { speedMultiplier: 1.0, bonusStat: 'charm', label: 'Natural setting (+Charm)' },
    garden: { speedMultiplier: 1.15, bonusStat: 'resilience', label: 'Garden warmth (+15% speed, +Resilience)' }
};

// Care actions that benefit incubating eggs
const INCUBATION_CARE_BONUSES = {
    cuddle: { tickBonus: 2, description: 'Cuddling the egg warms it up!' },
    sleep: { tickBonus: 1, description: 'Resting near the egg is soothing.' },
    play: { tickBonus: 1, description: 'The egg responds to playful energy!' }
};

// Get the hybrid type for two parent types, or null if no hybrid exists
function getHybridForParents(type1, type2) {
    return HYBRID_LOOKUP[`${type1}-${type2}`] || null;
}

// Check if a pet type is a hybrid
function isHybridType(type) {
    return !!HYBRID_PET_TYPES[type];
}

// Get all pet type data (including hybrids)
function getAllPetTypeData(type) {
    return PET_TYPES[type] || HYBRID_PET_TYPES[type] || null;
}

// ==================== PERSONALITY SYSTEM ====================

const PERSONALITY_TRAITS = {
    lazy: {
        label: 'Lazy',
        emoji: '😴',
        description: 'Loves napping and prefers slow activities',
        statModifiers: {
            energyDecayMultiplier: 0.7,      // Energy decays slower (conserves it)
            happinessDecayMultiplier: 0.9,
            hungerDecayMultiplier: 1.2,       // Gets hungry faster (snacking)
            cleanlinessDecayMultiplier: 1.1
        },
        careModifiers: {
            sleep: 1.4,    // Sleeps more effectively
            cuddle: 1.2,
            exercise: 0.7, // Doesn't enjoy exercise as much
            play: 0.8
        },
        relationshipModifier: 1.0,
        speechMessages: [
            "*yawns*", "Five more minutes...", "Too comfy to move...",
            "Nap time?", "I'll do it later...", "Zzz... oh, hi!",
            "*stretches lazily*", "This spot is perfect..."
        ],
        thoughtMessages: [
            "wants to nap...", "is feeling sleepy...", "dreams of a cozy bed..."
        ],
        idleBehavior: 'yawn'
    },
    energetic: {
        label: 'Energetic',
        emoji: '⚡',
        description: 'Always on the go, needs lots of activity',
        statModifiers: {
            energyDecayMultiplier: 1.3,       // Burns energy faster
            happinessDecayMultiplier: 1.2,     // Gets bored faster
            hungerDecayMultiplier: 1.3,        // Needs more food
            cleanlinessDecayMultiplier: 1.2
        },
        careModifiers: {
            exercise: 1.5,  // Loves exercise!
            play: 1.4,
            sleep: 0.7,     // Too wired to sleep well
            cuddle: 0.8
        },
        relationshipModifier: 1.2,
        speechMessages: [
            "LET'S GO!", "Can't sit still!", "ZOOM ZOOM!",
            "Race you!", "More! More! More!", "I have SO much energy!",
            "*bouncing around*", "What's next?!"
        ],
        thoughtMessages: [
            "wants to run!", "needs to play!", "is bursting with energy!"
        ],
        idleBehavior: 'bounce'
    },
    curious: {
        label: 'Curious',
        emoji: '🔍',
        description: 'Loves exploring and discovering new things',
        statModifiers: {
            energyDecayMultiplier: 1.1,
            happinessDecayMultiplier: 1.1,
            hungerDecayMultiplier: 1.0,
            cleanlinessDecayMultiplier: 1.2    // Gets dirty from exploring
        },
        careModifiers: {
            play: 1.3,
            exercise: 1.2,
            groom: 0.9,
            wash: 0.9
        },
        relationshipModifier: 1.3,             // Curious pets bond faster
        speechMessages: [
            "What's that?!", "Ooh, shiny!", "Let me see!",
            "*sniffs everything*", "I wonder...", "There's something over there!",
            "*investigates*", "What does this do?"
        ],
        thoughtMessages: [
            "sees something interesting!", "wants to explore!", "is investigating..."
        ],
        idleBehavior: 'sniff'
    },
    shy: {
        label: 'Shy',
        emoji: '🙈',
        description: 'Takes time to warm up but forms deep bonds',
        statModifiers: {
            energyDecayMultiplier: 0.9,
            happinessDecayMultiplier: 1.1,
            hungerDecayMultiplier: 0.9,
            cleanlinessDecayMultiplier: 0.9
        },
        careModifiers: {
            cuddle: 1.4,     // Loves gentle affection
            sleep: 1.2,
            play: 0.8,       // Overwhelmed by play
            exercise: 0.7    // Too many stimuli
        },
        relationshipModifier: 0.6,              // Takes longer to warm up
        speechMessages: [
            "*peeks out*", "H-hi...", "*hides behind you*",
            "Is it safe?", "*quiet squeak*", "Stay close, okay?",
            "*timid wave*", "I trust you..."
        ],
        thoughtMessages: [
            "is feeling nervous...", "wants to hide...", "needs comfort..."
        ],
        idleBehavior: 'hide'
    },
    playful: {
        label: 'Playful',
        emoji: '🎪',
        description: 'Everything is a game! Mischievous and fun-loving',
        statModifiers: {
            energyDecayMultiplier: 1.2,
            happinessDecayMultiplier: 1.3,     // Needs constant stimulation
            hungerDecayMultiplier: 1.1,
            cleanlinessDecayMultiplier: 1.2
        },
        careModifiers: {
            play: 1.5,       // Play is life!
            treat: 1.3,      // Loves treats
            exercise: 1.2,
            groom: 0.7       // Can't sit still for grooming
        },
        relationshipModifier: 1.4,
        speechMessages: [
            "Catch me!", "Tag, you're it!", "*mischievous grin*",
            "Play play play!", "Wheee!", "Again again!",
            "*does a trick*", "Watch this!"
        ],
        thoughtMessages: [
            "wants to play!", "needs a game!", "is feeling mischievous..."
        ],
        idleBehavior: 'wiggle'
    },
    grumpy: {
        label: 'Grumpy',
        emoji: '😤',
        description: 'Has a tough exterior but secretly loves attention',
        statModifiers: {
            energyDecayMultiplier: 0.8,
            happinessDecayMultiplier: 1.3,     // Hard to keep happy
            hungerDecayMultiplier: 1.0,
            cleanlinessDecayMultiplier: 0.8
        },
        careModifiers: {
            feed: 1.3,       // Food is the way to a grumpy pet's heart
            treat: 1.5,      // REALLY loves treats
            cuddle: 0.6,     // Acts like it doesn't want cuddles
            play: 0.8,
            sleep: 1.2
        },
        relationshipModifier: 0.7,
        speechMessages: [
            "Hmph!", "*grumbles*", "Leave me alone... (but not really)",
            "Whatever.", "*side-eye*", "I guess that's okay...",
            "*reluctant purr*", "Don't touch my stuff."
        ],
        thoughtMessages: [
            "is being grumpy...", "wants to be left alone (maybe)...", "secretly wants attention..."
        ],
        idleBehavior: 'grumble'
    }
};

const PERSONALITY_LIST = Object.keys(PERSONALITY_TRAITS);

function getRandomPersonality() {
    return PERSONALITY_LIST[Math.floor(Math.random() * PERSONALITY_LIST.length)];
}

// ==================== PET FAVORITES & FEARS ====================

// Each pet type has favorite foods, activities, and things they fear/dislike
const PET_PREFERENCES = {
    dog: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Cookie',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    cat: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Ice Cream',
        fear: 'exercise',
        fearLabel: '🏃 Exercise',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bunny: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Honey',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bird: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cookie',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hamster: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Wheel!)',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    turtle: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    fish: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Candy',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    frog: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Hopping!)',
        favoriteTreat: 'Candy',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'carrot',
        dislikedFoodLabel: '🥕 Carrots',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hedgehog: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    panda: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    penguin: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Sliding!)',
        favoriteTreat: 'Ice Cream',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    unicorn: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cupcake',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dragon: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Donut',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'strawberry',
        dislikedFoodLabel: '🍓 Strawberries',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    // Hybrid types — inherit preferences from parent types
    pegasus: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cupcake',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    kirin: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Cupcake',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'strawberry',
        dislikedFoodLabel: '🍓 Strawberries',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    catbird: {
        favoriteFood: 'strawberry',
        favoriteFoodLabel: '🍓 Strawberries',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Cookie',
        fear: 'exercise',
        fearLabel: '🏃 Exercise',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    turtlefrog: {
        favoriteFood: 'tomato',
        favoriteFoodLabel: '🍅 Tomatoes',
        favoriteActivity: 'cuddle',
        favoriteActivityLabel: '🤗 Cuddles',
        favoriteTreat: 'Honey',
        fear: 'exercise',
        fearLabel: '🏃 Too much exercise',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    bundgehog: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Honey',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    pandapenguin: {
        favoriteFood: 'apple',
        favoriteFoodLabel: '🍎 Apples',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Sliding!)',
        favoriteTreat: 'Ice Cream',
        fear: 'medicine',
        fearLabel: '💊 Medicine',
        dislikedFood: 'tomato',
        dislikedFoodLabel: '🍅 Tomatoes',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dogfish: {
        favoriteFood: 'carrot',
        favoriteFoodLabel: '🥕 Carrots',
        favoriteActivity: 'play',
        favoriteActivityLabel: '⚽ Play',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'apple',
        dislikedFoodLabel: '🍎 Apples',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    hamsterbird: {
        favoriteFood: 'sunflower',
        favoriteFoodLabel: '🌻 Sunflower Seeds',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise (Wheel!)',
        favoriteTreat: 'Cookie',
        fear: 'groom',
        fearLabel: '✂️ Grooming',
        dislikedFood: 'pumpkin',
        dislikedFoodLabel: '🎃 Pumpkin',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    },
    dragonturtle: {
        favoriteFood: 'pumpkin',
        favoriteFoodLabel: '🎃 Pumpkin',
        favoriteActivity: 'exercise',
        favoriteActivityLabel: '🏃 Exercise',
        favoriteTreat: 'Donut',
        fear: 'wash',
        fearLabel: '🛁 Bath time',
        dislikedFood: 'sunflower',
        dislikedFoodLabel: '🌻 Sunflower Seeds',
        bonusMultiplier: 1.5,
        penaltyMultiplier: 0.5
    }
};

// Get preference modifiers for a care action
function getPreferenceModifier(pet, action, cropId) {
    const prefs = PET_PREFERENCES[pet.type];
    if (!prefs) return 1.0;

    // Check if this is a favorite activity
    if (action === prefs.favoriteActivity) {
        return prefs.bonusMultiplier;
    }

    // Check if this is a feared activity
    if (action === prefs.fear) {
        return prefs.penaltyMultiplier;
    }

    // Check food preferences for feed actions
    if (action === 'feed' && cropId) {
        if (cropId === prefs.favoriteFood) {
            return prefs.bonusMultiplier;
        }
        if (cropId === prefs.dislikedFood) {
            return prefs.penaltyMultiplier;
        }
    }

    // Check treat preferences
    if (action === 'treat') {
        // Treat name is checked elsewhere
        return 1.0;
    }

    return 1.0;
}

// ==================== ELDER GROWTH STAGE ====================

const ELDER_CONFIG = {
    hoursNeeded: GROWTH_STAGES.elder.hoursNeeded,
    actionsNeeded: GROWTH_STAGES.elder.actionsNeeded,
    wisdomBonusBase: 10,     // Base wisdom bonus for stat gains
    wisdomDecayReduction: 0.8, // 20% slower stat decay
    wisdomRelationshipBonus: 1.5, // 50% faster relationship building
    elderAccessories: ['glasses', 'topHat'] // Accessories unlocked at elder
};
