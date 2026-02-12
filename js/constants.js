// ==================== GROWTH STAGES ====================

const GROWTH_STAGES = {
    baby: {
        label: 'Baby',
        emoji: '🍼',
        scale: 0.6,
        actionsNeeded: 0,
        hoursNeeded: 0,
        sizeLabel: 'Tiny'
    },
    child: {
        label: 'Child',
        emoji: '🌱',
        scale: 0.8,
        actionsNeeded: 15,
        hoursNeeded: 2, // 2 hours for testing/faster gameplay
        sizeLabel: 'Small'
    },
    adult: {
        label: 'Adult',
        emoji: '⭐',
        scale: 1.0,
        actionsNeeded: 40,
        hoursNeeded: 6, // 6 hours total for more balanced gameplay
        sizeLabel: 'Full'
    }
};

const GROWTH_ORDER = ['baby', 'child', 'adult'];

// Care quality levels and their thresholds
const CARE_QUALITY = {
    poor: {
        label: 'Poor',
        emoji: '😢',
        minAverage: 0,
        maxAverage: 35,
        maxNeglect: 999, // No limit on neglect
        variant: 'dull',
        description: 'Needs more attention'
    },
    average: {
        label: 'Average',
        emoji: '😊',
        minAverage: 35,
        maxAverage: 60,
        maxNeglect: 10,
        variant: 'normal',
        description: 'Doing okay'
    },
    good: {
        label: 'Good',
        emoji: '😄',
        minAverage: 60,
        maxAverage: 80,
        maxNeglect: 5,
        variant: 'normal',
        description: 'Well cared for'
    },
    excellent: {
        label: 'Excellent',
        emoji: '🌟',
        minAverage: 80,
        maxAverage: 100,
        maxNeglect: 2,
        variant: 'shiny',
        description: 'Exceptionally loved',
        canEvolve: true
    }
};

// Evolution forms for each pet type (unlocked with excellent care at adult stage)
const PET_EVOLUTIONS = {
    dog: { name: 'Royal Hound', emoji: '👑🐕', colorShift: 20, sparkle: true },
    cat: { name: 'Mystic Cat', emoji: '✨🐱', colorShift: 15, sparkle: true },
    bunny: { name: 'Spring Guardian', emoji: '🌸🐰', colorShift: 10, sparkle: true },
    bird: { name: 'Phoenix Chick', emoji: '🔥🐦', colorShift: 25, sparkle: true },
    hamster: { name: 'Golden Hamster', emoji: '⭐🐹', colorShift: 30, sparkle: true },
    turtle: { name: 'Ancient Turtle', emoji: '🌊🐢', colorShift: 15, sparkle: true },
    fish: { name: 'Celestial Fish', emoji: '🌟🐟', colorShift: 20, sparkle: true },
    frog: { name: 'Jade Frog', emoji: '💎🐸', colorShift: 25, sparkle: true },
    hedgehog: { name: 'Crystal Hedgehog', emoji: '💎🦔', colorShift: 20, sparkle: true },
    panda: { name: 'Zen Master', emoji: '☯️🐼', colorShift: 10, sparkle: true },
    penguin: { name: 'Emperor Penguin', emoji: '👑🐧', colorShift: 15, sparkle: true },
    unicorn: { name: 'Alicorn', emoji: '🦄✨', colorShift: 30, sparkle: true },
    dragon: { name: 'Ancient Dragon', emoji: '🐉👑', colorShift: 35, sparkle: true }
};

// Birthday milestone rewards based on growth stage
const BIRTHDAY_REWARDS = {
    child: {
        title: '🎉 First Birthday! 🎉',
        message: 'Your pet has grown into a child!',
        accessories: ['bow', 'ribbonBow'],
        unlockMessage: 'Unlocked cute accessories!'
    },
    adult: {
        title: '🎊 Coming of Age! 🎊',
        message: 'Your pet is now fully grown!',
        accessories: ['crown', 'partyHat'],
        unlockMessage: 'Unlocked special accessories!'
    }
};

function getGrowthStage(careActions, ageInHours) {
    // Growth requires BOTH time passage AND care actions
    const hasAdultTime = ageInHours >= GROWTH_STAGES.adult.hoursNeeded;
    const hasAdultActions = careActions >= GROWTH_STAGES.adult.actionsNeeded;
    const hasChildTime = ageInHours >= GROWTH_STAGES.child.hoursNeeded;
    const hasChildActions = careActions >= GROWTH_STAGES.child.actionsNeeded;

    if (hasAdultTime && hasAdultActions) return 'adult';
    if (hasChildTime && hasChildActions) return 'child';
    return 'baby';
}

function getNextGrowthStage(currentStage) {
    const idx = GROWTH_ORDER.indexOf(currentStage);
    if (idx < GROWTH_ORDER.length - 1) return GROWTH_ORDER[idx + 1];
    return null;
}

function getGrowthProgress(careActions, ageInHours, currentStage) {
    const nextStage = getNextGrowthStage(currentStage);
    if (!nextStage) return 100;

    const currentActionsThreshold = GROWTH_STAGES[currentStage].actionsNeeded;
    const nextActionsThreshold = GROWTH_STAGES[nextStage].actionsNeeded;
    const currentHoursThreshold = GROWTH_STAGES[currentStage].hoursNeeded;
    const nextHoursThreshold = GROWTH_STAGES[nextStage].hoursNeeded;

    // Progress is the minimum of time-based and action-based progress
    const actionDiff = nextActionsThreshold - currentActionsThreshold;
    const timeDiff = nextHoursThreshold - currentHoursThreshold;
    const actionProgress = actionDiff > 0 ? ((careActions - currentActionsThreshold) / actionDiff) * 100 : 100;
    const timeProgress = timeDiff > 0 ? ((ageInHours - currentHoursThreshold) / timeDiff) * 100 : 100;

    return Math.min(100, Math.max(0, Math.min(actionProgress, timeProgress)));
}

function getCareQuality(averageStats, neglectCount) {
    // Check from best to worst - only check minAverage (no maxAverage ceiling)
    // so that high-stat pets with too much neglect fall to the next tier gracefully
    for (const [level, data] of Object.entries(CARE_QUALITY).reverse()) {
        if (averageStats >= data.minAverage &&
            neglectCount <= data.maxNeglect) {
            return level;
        }
    }
    return 'poor';
}

// ==================== EGG TYPES ====================

const EGG_TYPES = {
    furry: {
        name: 'Furry Egg',
        description: 'A soft, fuzzy egg',
        colors: { base: '#D4A574', accent: '#8B7355', shine: '#FFE4C4' },
        pattern: 'spots',
        petTypes: ['dog', 'cat', 'bunny', 'hamster', 'hedgehog', 'panda']
    },
    feathery: {
        name: 'Feathery Egg',
        description: 'A light egg with feather patterns',
        colors: { base: '#87CEEB', accent: '#FFD700', shine: '#E0F6FF' },
        pattern: 'stripes',
        petTypes: ['bird', 'penguin']
    },
    scaly: {
        name: 'Scaly Egg',
        description: 'An egg with scales and shimmer',
        colors: { base: '#32CD32', accent: '#228B22', shine: '#98FB98' },
        pattern: 'scales',
        petTypes: ['turtle', 'fish', 'frog']
    },
    magical: {
        name: 'Magical Egg',
        description: 'A glowing, mystical egg',
        colors: { base: '#DDA0DD', accent: '#FFB6C1', shine: '#F0E68C' },
        pattern: 'sparkles',
        petTypes: ['unicorn', 'dragon']
    }
};

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

// ==================== FURNITURE ====================

const FURNITURE = {
    beds: {
        basic: { name: 'Basic Bed', emoji: '🛏️', description: 'A simple comfy bed' },
        plushy: { name: 'Plushy Bed', emoji: '🎀', description: 'A super soft bed' },
        royal: { name: 'Royal Bed', emoji: '👑', description: 'Fit for royalty' },
        cozy: { name: 'Cozy Nest', emoji: '🪺', description: 'A warm cozy nest' }
    },
    decorations: {
        none: { name: 'None', emoji: '', description: 'No decoration' },
        plants: { name: 'Plants', emoji: '🪴', description: 'Fresh greenery' },
        balloons: { name: 'Balloons', emoji: '🎈', description: 'Festive balloons' },
        lights: { name: 'Fairy Lights', emoji: '✨', description: 'Magical lighting' },
        toys: { name: 'Toy Box', emoji: '🧸', description: 'Fun toys' }
    }
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

// ==================== WEATHER SYSTEM ====================

const WEATHER_TYPES = {
    sunny: {
        name: 'Sunny',
        icon: '☀️',
        moodBonus: 5,
        happinessDecayModifier: 0,
        energyDecayModifier: 0,
        cleanlinessDecayModifier: 0,
        messages: [
            'loves the sunny weather!',
            'is soaking up the sunshine!',
            'is basking in the warm sun!'
        ]
    },
    rainy: {
        name: 'Rainy',
        icon: '🌧️',
        moodBonus: -5,
        happinessDecayModifier: 1,
        energyDecayModifier: 0,
        cleanlinessDecayModifier: 1,
        messages: [
            'doesn\'t love the rain...',
            'is a bit gloomy from the rain.',
            'wants to stay dry inside.'
        ]
    },
    snowy: {
        name: 'Snowy',
        icon: '🌨️',
        moodBonus: -3,
        happinessDecayModifier: 0,
        energyDecayModifier: 1,
        cleanlinessDecayModifier: 0,
        messages: [
            'is watching the snowflakes!',
            'shivers a little in the snow.',
            'thinks the snow is pretty!'
        ]
    }
};

const WEATHER_CHANGE_INTERVAL = 300000; // Check for weather change every 5 minutes

// ==================== ROOMS ====================

const ROOMS = {
    bedroom: {
        name: 'Bedroom',
        icon: '🛏️',
        isOutdoor: false,
        ground: { color1: '#8D6E63', color2: '#6D4C41' },
        decorEmoji: '🛏️ 🧸 🌙',
        nightDecorEmoji: '🛏️ 🧸 💤',
        bgDay: 'linear-gradient(180deg, #E8D5B7 0%, #F5E6CC 50%, #DCC8A0 100%)',
        bgNight: 'linear-gradient(180deg, #3E2723 0%, #4E342E 50%, #5D4037 100%)',
        bgSunset: 'linear-gradient(180deg, #D7CCC8 0%, #EFEBE9 50%, #DCC8A0 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 50%, #DCC8A0 100%)',
        bonus: { action: 'sleep', multiplier: 1.3, label: '+30% Sleep' }
    },
    kitchen: {
        name: 'Kitchen',
        icon: '🍳',
        isOutdoor: false,
        ground: { color1: '#BDBDBD', color2: '#9E9E9E' },
        decorEmoji: '🍳 🧁 🍎',
        nightDecorEmoji: '🍳 🧁 🍪',
        bgDay: 'linear-gradient(180deg, #FFF9C4 0%, #FFFDE7 50%, #FFF59D 100%)',
        bgNight: 'linear-gradient(180deg, #33302A 0%, #3E3A32 50%, #4A4538 100%)',
        bgSunset: 'linear-gradient(180deg, #FFE0B2 0%, #FFF8E1 50%, #FFF59D 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFF8E1 0%, #FFFDE7 50%, #FFF59D 100%)',
        bonus: { action: 'feed', multiplier: 1.3, label: '+30% Food' }
    },
    bathroom: {
        name: 'Bathroom',
        icon: '🛁',
        isOutdoor: false,
        ground: { color1: '#80DEEA', color2: '#4DD0E1' },
        decorEmoji: '🛁 🧴 🫧',
        nightDecorEmoji: '🛁 🧴 🌊',
        bgDay: 'linear-gradient(180deg, #E0F7FA 0%, #B2EBF2 50%, #80DEEA 100%)',
        bgNight: 'linear-gradient(180deg, #1A3A3A 0%, #1E4D4D 50%, #1B3F3F 100%)',
        bgSunset: 'linear-gradient(180deg, #B2EBF2 0%, #E0F7FA 50%, #80DEEA 100%)',
        bgSunrise: 'linear-gradient(180deg, #E0F7FA 0%, #B2EBF2 50%, #80DEEA 100%)',
        bonus: { action: 'wash', multiplier: 1.3, label: '+30% Bath' }
    },
    backyard: {
        name: 'Backyard',
        icon: '🏡',
        isOutdoor: true,
        ground: { color1: '#7CB342', color2: '#558B2F' },
        decorEmoji: '🌻 🦋 🌿',
        nightDecorEmoji: '🌿 🦗 🌿',
        bgDay: 'linear-gradient(180deg, #87CEEB 0%, #98FB98 100%)',
        bgNight: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        bgSunset: 'linear-gradient(180deg, #FF7E5F 0%, #FEB47B 50%, #98FB98 100%)',
        bgSunrise: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #98FB98 100%)',
        bonus: { action: 'exercise', multiplier: 1.3, label: '+30% Exercise' }
    },
    park: {
        name: 'Park',
        icon: '🌳',
        isOutdoor: true,
        ground: { color1: '#66BB6A', color2: '#43A047' },
        decorEmoji: '🌳 🌺 🦆',
        nightDecorEmoji: '🌳 🍃 🦉',
        bgDay: 'linear-gradient(180deg, #64B5F6 0%, #81C784 100%)',
        bgNight: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1A472A 100%)',
        bgSunset: 'linear-gradient(180deg, #FF8A65 0%, #FFB74D 50%, #81C784 100%)',
        bgSunrise: 'linear-gradient(180deg, #FFCCBC 0%, #FFE0B2 50%, #81C784 100%)',
        bonus: { action: 'play', multiplier: 1.3, label: '+30% Play' }
    },
    garden: {
        name: 'Garden',
        icon: '🌱',
        isOutdoor: true,
        ground: { color1: '#8D6E63', color2: '#6D4C41' },
        decorEmoji: '🌱 🪴 🌿',
        nightDecorEmoji: '🌱 🌙 🌿',
        bgDay: 'linear-gradient(180deg, #87CEEB 0%, #A5D6A7 50%, #81C784 100%)',
        bgNight: 'linear-gradient(180deg, #1a1a2e 0%, #1B3A1B 50%, #0f3460 100%)',
        bgSunset: 'linear-gradient(180deg, #FF7E5F 0%, #FEB47B 50%, #A5D6A7 100%)',
        bgSunrise: 'linear-gradient(180deg, #ffecd2 0%, #fcb69f 50%, #A5D6A7 100%)',
        bonus: { action: 'groom', multiplier: 1.2, label: '+20% Groom' }
    }
};

// Room bonus helper
function getRoomBonus(action) {
    const currentRoom = gameState.currentRoom || 'bedroom';
    const room = ROOMS[currentRoom];
    if (room && room.bonus && room.bonus.action === action) {
        return room.bonus.multiplier;
    }
    return 1.0;
}

const ROOM_IDS = Object.keys(ROOMS);

// ==================== SEASONS SYSTEM ====================

const SEASONS = {
    spring: {
        name: 'Spring',
        icon: '🌸',
        months: [2, 3, 4], // March, April, May
        decorEmoji: '🌸 🌷 🐝',
        nightDecorEmoji: '🌸 🌙 🌷',
        weatherBias: { sunny: 0.5, rainy: 0.35, snowy: 0.15 },
        moodBonus: 3,
        gardenGrowthMultiplier: 1.2,
        activityName: 'Flower Pick',
        activityIcon: '🌷',
        activityMessages: ['found a beautiful flower!', 'made a flower crown!', 'loves the spring blossoms!', 'is chasing butterflies!'],
        activityEffects: { happiness: 15, energy: -5 },
        ambientMessages: ['The flowers are blooming!', 'Spring is in the air!', 'What a lovely spring day!', 'The butterflies are out!']
    },
    summer: {
        name: 'Summer',
        icon: '☀️',
        months: [5, 6, 7], // June, July, August
        decorEmoji: '🌻 🦋 🍉',
        nightDecorEmoji: '🌻 🌟 🦗',
        weatherBias: { sunny: 0.7, rainy: 0.2, snowy: 0.1 },
        moodBonus: 5,
        gardenGrowthMultiplier: 1.5,
        activityName: 'Splash Play',
        activityIcon: '💦',
        activityMessages: ['is splashing in water!', 'loves the summer fun!', 'had a water play session!', 'is cooling off in the sprinkler!'],
        activityEffects: { happiness: 20, cleanliness: 10, energy: -10 },
        ambientMessages: ['The sun is shining bright!', 'What a hot summer day!', 'Perfect for outdoor fun!', 'Summer vibes!']
    },
    autumn: {
        name: 'Autumn',
        icon: '🍂',
        months: [8, 9, 10], // September, October, November
        decorEmoji: '🍂 🎃 🍁',
        nightDecorEmoji: '🍂 🌙 🦉',
        weatherBias: { sunny: 0.4, rainy: 0.4, snowy: 0.2 },
        moodBonus: 2,
        gardenGrowthMultiplier: 0.8,
        activityName: 'Leaf Pile',
        activityIcon: '🍁',
        activityMessages: ['jumped in the leaf pile!', 'is crunching autumn leaves!', 'loves the fall colors!', 'found a cool pinecone!'],
        activityEffects: { happiness: 15, energy: -5 },
        ambientMessages: ['The leaves are changing colors!', 'Autumn is so cozy!', 'Crisp fall air!', 'Pumpkin season!']
    },
    winter: {
        name: 'Winter',
        icon: '❄️',
        months: [11, 0, 1], // December, January, February
        decorEmoji: '❄️ ⛄ 🎄',
        nightDecorEmoji: '❄️ 🌙 ✨',
        weatherBias: { sunny: 0.25, rainy: 0.15, snowy: 0.6 },
        moodBonus: 1,
        gardenGrowthMultiplier: 0.5,
        activityName: 'Snowplay',
        activityIcon: '⛄',
        activityMessages: ['built a tiny snowman!', 'is catching snowflakes!', 'loves playing in the snow!', 'made a snow angel!'],
        activityEffects: { happiness: 15, cleanliness: -5, energy: -10 },
        ambientMessages: ['It\'s a winter wonderland!', 'So cozy and cold!', 'Hot cocoa weather!', 'Winter magic!']
    }
};

function getCurrentSeason() {
    const month = new Date().getMonth();
    for (const [id, season] of Object.entries(SEASONS)) {
        if (season.months.includes(month)) return id;
    }
    return 'spring';
}

function getSeasonalDecor(season, timeOfDay) {
    const seasonData = SEASONS[season];
    if (!seasonData) return '';
    return timeOfDay === 'night' ? seasonData.nightDecorEmoji : seasonData.decorEmoji;
}

function getSeasonalWeather(season) {
    const seasonData = SEASONS[season];
    if (!seasonData) return getRandomWeather();
    const rand = Math.random();
    const bias = seasonData.weatherBias;
    if (rand < bias.sunny) return 'sunny';
    if (rand < bias.sunny + bias.rainy) return 'rainy';
    return 'snowy';
}

// ==================== GARDEN SYSTEM ====================

const GARDEN_CROPS = {
    carrot: {
        name: 'Carrot',
        seedEmoji: '🥕',
        stages: ['🟫', '🌱', '🌿', '🥕'],
        growTime: 3, // grow ticks needed per stage
        hungerValue: 15,
        happinessValue: 5,
        energyValue: 0,
        seasonBonus: ['spring', 'autumn']
    },
    tomato: {
        name: 'Tomato',
        seedEmoji: '🍅',
        stages: ['🟫', '🌱', '🌿', '🍅'],
        growTime: 4,
        hungerValue: 18,
        happinessValue: 8,
        energyValue: 0,
        seasonBonus: ['summer']
    },
    strawberry: {
        name: 'Strawberry',
        seedEmoji: '🍓',
        stages: ['🟫', '🌱', '🌿', '🍓'],
        growTime: 5,
        hungerValue: 20,
        happinessValue: 12,
        energyValue: 0,
        seasonBonus: ['spring', 'summer']
    },
    pumpkin: {
        name: 'Pumpkin',
        seedEmoji: '🎃',
        stages: ['🟫', '🌱', '🌿', '🎃'],
        growTime: 6,
        hungerValue: 25,
        happinessValue: 10,
        energyValue: 0,
        seasonBonus: ['autumn']
    },
    sunflower: {
        name: 'Sunflower',
        seedEmoji: '🌻',
        stages: ['🟫', '🌱', '🌿', '🌻'],
        growTime: 4,
        hungerValue: 5,
        happinessValue: 20,
        energyValue: 0,
        seasonBonus: ['summer', 'spring']
    },
    apple: {
        name: 'Apple',
        seedEmoji: '🍎',
        stages: ['🟫', '🌱', '🌳', '🍎'],
        growTime: 7,
        hungerValue: 10,
        happinessValue: 0,
        energyValue: 15,
        seasonBonus: ['autumn']
    }
};

const MAX_GARDEN_PLOTS = 6;

// Progressive plot unlocking thresholds (harvests needed for each plot)
// Plots 1-2 are free, then unlock at 2, 5, 10, 18 total harvests
const GARDEN_PLOT_UNLOCK_THRESHOLDS = [0, 0, 2, 5, 10, 18];

function getUnlockedPlotCount(totalHarvests) {
    const harvests = typeof totalHarvests === 'number' ? totalHarvests : 0;
    let unlocked = 0;
    for (let i = 0; i < GARDEN_PLOT_UNLOCK_THRESHOLDS.length; i++) {
        if (harvests >= GARDEN_PLOT_UNLOCK_THRESHOLDS[i]) {
            unlocked = i + 1;
        } else {
            break;
        }
    }
    return Math.min(unlocked, MAX_GARDEN_PLOTS);
}

