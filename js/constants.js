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
    },
    elder: {
        label: 'Elder',
        emoji: '🏛️',
        scale: 0.95,
        actionsNeeded: 120,
        hoursNeeded: 24, // 24 hours total
        sizeLabel: 'Wise'
    }
};

const GROWTH_ORDER = ['baby', 'child', 'adult', 'elder'];

// Care quality levels and their thresholds
const CARE_QUALITY = {
    poor: {
        label: 'Poor',
        emoji: '😢',
        minAverage: 0,
        maxNeglect: 999, // No limit on neglect
        variant: 'dull',
        description: 'Needs more attention'
    },
    average: {
        label: 'Average',
        emoji: '😊',
        minAverage: 35,
        maxNeglect: 10,
        variant: 'normal',
        description: 'Doing okay'
    },
    good: {
        label: 'Good',
        emoji: '😄',
        minAverage: 60,
        maxNeglect: 5,
        variant: 'normal',
        description: 'Well cared for'
    },
    excellent: {
        label: 'Excellent',
        emoji: '🌟',
        minAverage: 80,
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
    },
    elder: {
        title: '🏛️ Wisdom of Ages! 🏛️',
        message: 'Your pet has become a wise elder! Stat gains are boosted by wisdom.',
        accessories: ['glasses', 'topHat'],
        unlockMessage: 'Unlocked elder accessories!'
    }
};

function getGrowthStage(careActions, ageInHours) {
    // Growth requires BOTH time passage AND care actions
    const hasElderTime = ageInHours >= GROWTH_STAGES.elder.hoursNeeded;
    const hasElderActions = careActions >= GROWTH_STAGES.elder.actionsNeeded;
    const hasAdultTime = ageInHours >= GROWTH_STAGES.adult.hoursNeeded;
    const hasAdultActions = careActions >= GROWTH_STAGES.adult.actionsNeeded;
    const hasChildTime = ageInHours >= GROWTH_STAGES.child.hoursNeeded;
    const hasChildActions = careActions >= GROWTH_STAGES.child.actionsNeeded;

    if (hasElderTime && hasElderActions) return 'elder';
    if (hasAdultTime && hasAdultActions) return 'adult';
    if (hasChildTime && hasChildActions) return 'child';
    return 'baby';
}

function getNextGrowthStage(currentStage) {
    const idx = GROWTH_ORDER.indexOf(currentStage);
    if (idx === -1) return null;
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

// Explicit best-to-worst ordering for getCareQuality iteration
const CARE_QUALITY_ORDER = ['excellent', 'good', 'average', 'poor'];

function getCareQuality(averageStats, neglectCount) {
    // Check from best to worst - only check minAverage (no maxAverage ceiling)
    // so that high-stat pets with too much neglect fall to the next tier gracefully
    for (const level of CARE_QUALITY_ORDER) {
        const data = CARE_QUALITY[level];
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
        bonus: { action: 'groom', multiplier: 1.3, label: '+30% Groom' }
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
    if (!seasonData) return 'sunny';
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

// ==================== MULTI-PET SYSTEM ====================

const MAX_PETS = 4; // Maximum number of pets a player can have at once

// ==================== PET INTERACTIONS ====================

const PET_INTERACTIONS = {
    playTogether: {
        name: 'Play Together',
        emoji: '⚽',
        description: 'Pets play and have fun together!',
        effects: { happiness: 15, energy: -8 },
        relationshipGain: 8,
        cooldown: 60000, // 1 minute
        messages: [
            'are chasing each other around!',
            'are playing tag together!',
            'are having a blast together!',
            'are tumbling around happily!',
            'are bouncing and playing!'
        ]
    },
    shareFood: {
        name: 'Share Meal',
        emoji: '🍽️',
        description: 'Pets share a meal together!',
        effects: { hunger: 12, happiness: 8 },
        relationshipGain: 6,
        cooldown: 60000,
        messages: [
            'are sharing a yummy meal!',
            'are eating side by side!',
            'are munching together happily!',
            'are enjoying lunch together!',
            'are sharing snacks!'
        ]
    },
    groomEachOther: {
        name: 'Groom Each Other',
        emoji: '✨',
        description: 'Pets groom and clean each other!',
        effects: { cleanliness: 12, happiness: 10 },
        relationshipGain: 7,
        cooldown: 60000,
        messages: [
            'are grooming each other so sweetly!',
            'are helping each other look their best!',
            'are taking care of each other!',
            'are making each other sparkly clean!',
            'are brushing each other gently!'
        ]
    },
    napTogether: {
        name: 'Nap Together',
        emoji: '💤',
        description: 'Pets cuddle up for a cozy nap!',
        effects: { energy: 18, happiness: 8 },
        relationshipGain: 10,
        cooldown: 90000,
        messages: [
            'are cuddling up for a cozy nap!',
            'are sleeping side by side!',
            'are snuggling together peacefully!',
            'are dozing off together!',
            'are sharing a warm nap!'
        ]
    },
    explore: {
        name: 'Explore Together',
        emoji: '🗺️',
        description: 'Pets go on a little adventure!',
        effects: { happiness: 18, energy: -10, hunger: -5 },
        relationshipGain: 12,
        cooldown: 120000, // 2 minutes
        messages: [
            'went on an adventure and found something cool!',
            'explored the area and had a great time!',
            'discovered a secret spot together!',
            'went exploring and made wonderful memories!',
            'had an exciting little expedition!'
        ]
    }
};

// ==================== RELATIONSHIP SYSTEM ====================

const RELATIONSHIP_LEVELS = {
    stranger: {
        label: 'Stranger',
        emoji: '🤝',
        minPoints: 0,
        description: 'Just met! Time to get to know each other.',
        interactionBonus: 1.0
    },
    acquaintance: {
        label: 'Acquaintance',
        emoji: '👋',
        minPoints: 20,
        description: 'Starting to warm up to each other!',
        interactionBonus: 1.1
    },
    friend: {
        label: 'Friend',
        emoji: '😊',
        minPoints: 50,
        description: 'Good pals who enjoy hanging out!',
        interactionBonus: 1.2
    },
    closeFriend: {
        label: 'Close Friend',
        emoji: '💛',
        minPoints: 100,
        description: 'Best buddies who love being together!',
        interactionBonus: 1.3
    },
    bestFriend: {
        label: 'Best Friend',
        emoji: '💖',
        minPoints: 180,
        description: 'Inseparable! The closest bond possible!',
        interactionBonus: 1.5
    },
    family: {
        label: 'Family',
        emoji: '🏠',
        minPoints: 250,
        description: 'A true family bond! They consider each other family!',
        interactionBonus: 1.7
    }
};

const RELATIONSHIP_ORDER = ['stranger', 'acquaintance', 'friend', 'closeFriend', 'bestFriend', 'family'];

function getRelationshipLevel(points) {
    // Iterate from highest level to lowest; return first match
    for (let i = RELATIONSHIP_ORDER.length - 1; i >= 0; i--) {
        const key = RELATIONSHIP_ORDER[i];
        if (points >= RELATIONSHIP_LEVELS[key].minPoints) {
            return key;
        }
    }
    return 'stranger';
}

function getRelationshipProgress(points) {
    const currentLevel = getRelationshipLevel(points);
    const currentIdx = RELATIONSHIP_ORDER.indexOf(currentLevel);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= RELATIONSHIP_ORDER.length) return 100;
    const currentMin = RELATIONSHIP_LEVELS[currentLevel].minPoints;
    const nextMin = RELATIONSHIP_LEVELS[RELATIONSHIP_ORDER[nextIdx]].minPoints;
    const range = nextMin - currentMin;
    return Math.min(100, Math.max(0, ((points - currentMin) / range) * 100));
}

// ==================== MODAL ESCAPE KEY STACK ====================
// Ensures only the topmost modal/overlay responds to the Escape key.
const _modalEscapeStack = [];

function pushModalEscape(closeFn) {
    _modalEscapeStack.push(closeFn);
}

function popModalEscape(closeFn) {
    const idx = _modalEscapeStack.lastIndexOf(closeFn);
    if (idx !== -1) _modalEscapeStack.splice(idx, 1);
}

if (typeof document !== 'undefined' && !window.__modalEscapeListenerRegistered) {
    window.__modalEscapeListenerRegistered = true;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _modalEscapeStack.length > 0) {
            e.stopImmediatePropagation();
            const topHandler = _modalEscapeStack[_modalEscapeStack.length - 1];
            topHandler();
        }
    });
}

// Trap Tab focus within a modal overlay element
function trapFocus(overlay) {
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const focusable = overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]:not([disabled]), [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"]):not([disabled])');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

// ==================== ACHIEVEMENTS ====================

const ACHIEVEMENTS = {
    firstFeed: { id: 'firstFeed', name: 'First Meal', icon: '🍎', description: 'Feed your pet for the first time', check: (gs) => (gs.pet && (gs.totalFeedCount || 0) >= 1) },
    firstHarvest: { id: 'firstHarvest', name: 'Green Thumb', icon: '🌱', description: 'Harvest your first crop', check: (gs) => (gs.garden && gs.garden.totalHarvests >= 1) },
    fiveHarvests: { id: 'fiveHarvests', name: 'Farmer', icon: '🧑‍🌾', description: 'Harvest 5 crops', check: (gs) => (gs.garden && gs.garden.totalHarvests >= 5) },
    tenCareActions: { id: 'tenCareActions', name: 'Caring Heart', icon: '💝', description: 'Perform 10 care actions', check: (gs) => (gs.pet && gs.pet.careActions >= 10) },
    fiftyCareActions: { id: 'fiftyCareActions', name: 'Devoted Caretaker', icon: '🏅', description: 'Perform 50 care actions', check: (gs) => (gs.pet && gs.pet.careActions >= 50) },
    raiseChild: { id: 'raiseChild', name: 'Growing Up', icon: '🌱', description: 'Raise a pet to Child stage', check: (gs) => (gs.pet && gs.pet.growthStage !== 'baby') },
    raiseAdult: { id: 'raiseAdult', name: 'All Grown Up', icon: '⭐', description: 'Raise a pet to Adult stage', check: (gs) => (gs.pet && gs.pet.growthStage === 'adult') },
    excellentCare: { id: 'excellentCare', name: 'Perfect Parent', icon: '🌟', description: 'Reach Excellent care quality', check: (gs) => (gs.pet && gs.pet.careQuality === 'excellent') },
    evolvePet: { id: 'evolvePet', name: 'Transcendence', icon: '✨', description: 'Evolve a pet to their special form', check: (gs) => (gs.pet && gs.pet.evolutionStage === 'evolved') },
    unlockMythical: { id: 'unlockMythical', name: 'Mythical Discovery', icon: '🦄', description: 'Unlock a mythical pet type', check: (gs) => (gs.adultsRaised >= 2) },
    adoptSecondPet: { id: 'adoptSecondPet', name: 'Growing Family', icon: '🏠', description: 'Adopt a second pet', check: (gs) => (gs.pets && gs.pets.length >= 2) },
    fullFamily: { id: 'fullFamily', name: 'Full House', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets at once', check: (gs) => (gs.pets && gs.pets.length >= 4) },
    playMinigame: { id: 'playMinigame', name: 'Game Time', icon: '🎮', description: 'Play your first mini-game', check: (gs) => { const counts = gs.minigamePlayCounts || {}; return Object.values(counts).some(c => c > 0); } },
    highScore50: { id: 'highScore50', name: 'High Scorer', icon: '🏆', description: 'Score 50+ in any mini-game', check: (gs) => { const scores = gs.minigameHighScores || {}; return Object.values(scores).some(s => s >= 50); } },
    visitAllRooms: { id: 'visitAllRooms', name: 'Explorer', icon: '🗺️', description: 'Visit all 6 rooms', check: (gs) => { const visited = gs.roomsVisited || {}; return ROOM_IDS.every(r => visited[r]); } },
    bestFriend: { id: 'bestFriend', name: 'Best Friends', icon: '💖', description: 'Reach Best Friend with any pet pair', check: (gs) => { const rels = gs.relationships || {}; return Object.values(rels).some(r => r.points >= 180); } },
    nightOwl: { id: 'nightOwl', name: 'Night Owl', icon: '🌙', description: 'Play during nighttime', check: (gs) => (gs.timeOfDay === 'night') },
    weatherWatcher: { id: 'weatherWatcher', name: 'Weather Watcher', icon: '🌧️', description: 'Experience all 3 weather types', check: (gs) => { const seen = gs.weatherSeen || {}; return seen.sunny && seen.rainy && seen.snowy; } },
    dailyComplete: { id: 'dailyComplete', name: 'Daily Champion', icon: '📋', description: 'Complete all daily tasks', check: (gs) => { const d = gs.dailyChecklist; return d && d.tasks && d.tasks.every(t => t.done); } },
    firstBreeding: { id: 'firstBreeding', name: 'Matchmaker', icon: '💕', description: 'Breed two pets for the first time', check: (gs) => (gs.totalBreedings || 0) >= 1 },
    hatchBreedingEgg: { id: 'hatchBreedingEgg', name: 'Proud Parent', icon: '🥚', description: 'Hatch your first breeding egg', check: (gs) => (gs.totalBreedingHatches || 0) >= 1 },
    firstHybrid: { id: 'firstHybrid', name: 'Hybrid Discovery', icon: '🧬', description: 'Create a hybrid pet through breeding', check: (gs) => (gs.totalHybridsCreated || 0) >= 1 },
    firstMutation: { id: 'firstMutation', name: 'Genetic Marvel', icon: '🌈', description: 'Breed a pet with a rare mutation', check: (gs) => (gs.totalMutations || 0) >= 1 },
    fiveBreedings: { id: 'fiveBreedings', name: 'Master Breeder', icon: '🏅', description: 'Successfully breed 5 times', check: (gs) => (gs.totalBreedings || 0) >= 5 },
    // Personality & Elder achievements
    reachElder: { id: 'reachElder', name: 'Elder Wisdom', icon: '🏛️', description: 'Raise a pet to Elder stage', check: (gs) => (gs.pet && gs.pet.growthStage === 'elder') },
    retirePet: { id: 'retirePet', name: 'Fond Farewell', icon: '🌅', description: 'Retire a pet to the Hall of Fame', check: (gs) => (gs.memorials && gs.memorials.length >= 1) },
    fiveMemorials: { id: 'fiveMemorials', name: 'Legacy Builder', icon: '🏆', description: 'Have 5 pets in the Hall of Fame', check: (gs) => (gs.memorials && gs.memorials.length >= 5) },
    favoriteFed: { id: 'favoriteFed', name: 'Gourmet Chef', icon: '👨‍🍳', description: 'Feed a pet its favorite food', check: (gs) => (gs.totalFavoriteFoodFed || 0) >= 1 }
};

// ==================== DAILY CHECKLIST ====================

const DAILY_TASKS = [
    { id: 'feed3', name: 'Feed your pet 3 times', icon: '🍎', target: 3, trackKey: 'feedCount' },
    { id: 'playMinigame', name: 'Play a mini-game', icon: '🎮', target: 1, trackKey: 'minigameCount' },
    { id: 'harvestCrop', name: 'Harvest a crop', icon: '🌱', target: 1, trackKey: 'harvestCount' },
    { id: 'visitPark', name: 'Visit the Park', icon: '🌳', target: 1, trackKey: 'parkVisits' },
    { id: 'careAction5', name: 'Do 5 care actions', icon: '💝', target: 5, trackKey: 'totalCareActions' }
];

// ==================== BADGES ====================

const BADGES = {
    // Feeding milestones
    firstFeedBadge: { id: 'firstFeedBadge', name: 'First Bite', icon: '🍼', description: 'Feed your pet for the first time', category: 'care', tier: 'bronze', check: (gs) => gs.pet && (gs.totalFeedCount || 0) >= 1 },
    tenFeeds: { id: 'tenFeeds', name: 'Snack Master', icon: '🍕', description: 'Feed your pet 10 times', category: 'care', tier: 'silver', check: (gs) => gs.pet && (gs.totalFeedCount || 0) >= 10 },
    // Play milestones
    firstPlay: { id: 'firstPlay', name: 'Playtime!', icon: '🎈', description: 'Play with your pet for the first time', category: 'play', tier: 'bronze', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).some(v => v > 0); } },
    tenPlays: { id: 'tenPlays', name: 'Game Enthusiast', icon: '🕹️', description: 'Play 10 mini-games', category: 'play', tier: 'silver', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).reduce((s, v) => s + v, 0) >= 10; } },
    fiftyPlays: { id: 'fiftyPlays', name: 'Arcade Champion', icon: '👾', description: 'Play 50 mini-games', category: 'play', tier: 'gold', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).reduce((s, v) => s + v, 0) >= 50; } },
    // Growth milestones
    babySteps: { id: 'babySteps', name: 'Baby Steps', icon: '👣', description: 'Hatch your first pet', category: 'growth', tier: 'bronze', check: (gs) => gs.phase === 'pet' && gs.pet },
    growUp: { id: 'growUp', name: 'Growing Pains', icon: '🌱', description: 'Raise a pet to Child stage', category: 'growth', tier: 'silver', check: (gs) => gs.pet && gs.pet.growthStage !== 'baby' },
    fullyGrown: { id: 'fullyGrown', name: 'All Grown Up', icon: '🌳', description: 'Raise a pet to Adult stage', category: 'growth', tier: 'gold', check: (gs) => gs.pet && gs.pet.growthStage === 'adult' },
    // Care milestones
    cleanFreak: { id: 'cleanFreak', name: 'Squeaky Clean', icon: '🧼', description: 'Reach 100% cleanliness', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.cleanliness >= 100 },
    happyCamper: { id: 'happyCamper', name: 'Happy Camper', icon: '😊', description: 'Reach 100% happiness', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.happiness >= 100 },
    fullBelly: { id: 'fullBelly', name: 'Full Belly', icon: '😋', description: 'Reach 100% hunger', category: 'care', tier: 'bronze', check: (gs) => gs.pet && gs.pet.hunger >= 100 },
    // Garden milestones
    greenThumb: { id: 'greenThumb', name: 'Green Thumb', icon: '🌿', description: 'Harvest your first crop', category: 'garden', tier: 'bronze', check: (gs) => gs.garden && gs.garden.totalHarvests >= 1 },
    masterGardener: { id: 'masterGardener', name: 'Master Gardener', icon: '🏡', description: 'Harvest 20 crops', category: 'garden', tier: 'gold', check: (gs) => gs.garden && gs.garden.totalHarvests >= 20 },
    // Social milestones
    socialButterfly: { id: 'socialButterfly', name: 'Social Butterfly', icon: '🦋', description: 'Have 2 or more pets', category: 'social', tier: 'silver', check: (gs) => gs.pets && gs.pets.length >= 2 },
    bigFamily: { id: 'bigFamily', name: 'Big Family', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets at once', category: 'social', tier: 'gold', check: (gs) => gs.pets && gs.pets.length >= 4 },
    // Streak milestones
    streak3: { id: 'streak3', name: 'On a Roll', icon: '🔥', description: 'Reach a 3-day streak', category: 'streak', tier: 'bronze', check: (gs) => gs.streak && gs.streak.current >= 3 },
    streak7: { id: 'streak7', name: 'Week Warrior', icon: '⚡', description: 'Reach a 7-day streak', category: 'streak', tier: 'silver', check: (gs) => gs.streak && gs.streak.current >= 7 },
    streak30: { id: 'streak30', name: 'Monthly Master', icon: '🌟', description: 'Reach a 30-day streak', category: 'streak', tier: 'gold', check: (gs) => gs.streak && gs.streak.current >= 30 },
    // Exploration
    worldTraveler: { id: 'worldTraveler', name: 'World Traveler', icon: '🗺️', description: 'Visit all 6 rooms', category: 'exploration', tier: 'silver', check: (gs) => { const v = gs.roomsVisited || {}; return ROOM_IDS.every(r => v[r]); } },
    nightExplorer: { id: 'nightExplorer', name: 'Night Explorer', icon: '🌙', description: 'Play during nighttime', category: 'exploration', tier: 'bronze', check: (gs) => gs.timeOfDay === 'night' },
    // Breeding milestones
    firstBreed: { id: 'firstBreed', name: 'Matchmaker', icon: '💕', description: 'Breed two pets', category: 'breeding', tier: 'bronze', check: (gs) => (gs.totalBreedings || 0) >= 1 },
    hybridBreeder: { id: 'hybridBreeder', name: 'Hybrid Creator', icon: '🧬', description: 'Create a hybrid pet', category: 'breeding', tier: 'silver', check: (gs) => (gs.totalHybridsCreated || 0) >= 1 },
    mutationHunter: { id: 'mutationHunter', name: 'Mutation Hunter', icon: '🌈', description: 'Breed a pet with a mutation', category: 'breeding', tier: 'gold', check: (gs) => (gs.totalMutations || 0) >= 1 },
    masterBreeder: { id: 'masterBreeder', name: 'Master Breeder', icon: '🏆', description: 'Breed 5 times successfully', category: 'breeding', tier: 'gold', check: (gs) => (gs.totalBreedings || 0) >= 5 },
    // Elder & Personality badges
    elderWise: { id: 'elderWise', name: 'Wise Elder', icon: '🏛️', description: 'Raise a pet to Elder stage', category: 'growth', tier: 'gold', check: (gs) => gs.pet && gs.pet.growthStage === 'elder' },
    memorialFirst: { id: 'memorialFirst', name: 'Fond Memory', icon: '🌅', description: 'Retire your first pet', category: 'care', tier: 'silver', check: (gs) => (gs.memorials && gs.memorials.length >= 1) },
    personalityExplorer: { id: 'personalityExplorer', name: 'Personality Expert', icon: '🧠', description: 'Raise 3 pets with different personalities', category: 'care', tier: 'silver', check: (gs) => { const ps = gs.personalitiesSeen || {}; return Object.keys(ps).length >= 3; } }
};

const BADGE_TIERS = {
    bronze: { label: 'Bronze', color: '#CD7F32', glow: '#CD7F3266' },
    silver: { label: 'Silver', color: '#C0C0C0', glow: '#C0C0C066' },
    gold: { label: 'Gold', color: '#FFD700', glow: '#FFD70066' }
};

const BADGE_CATEGORIES = {
    care: { label: 'Care', icon: '💝' },
    play: { label: 'Play', icon: '🎮' },
    growth: { label: 'Growth', icon: '🌱' },
    garden: { label: 'Garden', icon: '🌻' },
    social: { label: 'Social', icon: '🤝' },
    streak: { label: 'Streak', icon: '🔥' },
    exploration: { label: 'Explore', icon: '🗺️' },
    breeding: { label: 'Breeding', icon: '🧬' }
};

// ==================== STICKER COLLECTION ====================

const STICKERS = {
    // Animal stickers - earned through pet care
    happyPup: { id: 'happyPup', name: 'Happy Pup', emoji: '🐶', category: 'animals', rarity: 'common', source: 'Feed a dog pet' },
    sleepyKitty: { id: 'sleepyKitty', name: 'Sleepy Kitty', emoji: '😸', category: 'animals', rarity: 'common', source: 'Pet a cat' },
    bouncyBunny: { id: 'bouncyBunny', name: 'Bouncy Bunny', emoji: '🐇', category: 'animals', rarity: 'common', source: 'Play with a bunny' },
    tinyTurtle: { id: 'tinyTurtle', name: 'Tiny Turtle', emoji: '🐢', category: 'animals', rarity: 'common', source: 'Wash a turtle' },
    goldenFish: { id: 'goldenFish', name: 'Golden Fish', emoji: '🐠', category: 'animals', rarity: 'uncommon', source: 'Feed a fish pet' },
    sweetBird: { id: 'sweetBird', name: 'Sweet Bird', emoji: '🐤', category: 'animals', rarity: 'common', source: 'Play with a bird' },
    cuddlyPanda: { id: 'cuddlyPanda', name: 'Cuddly Panda', emoji: '🐼', category: 'animals', rarity: 'uncommon', source: 'Cuddle a panda' },
    royalPenguin: { id: 'royalPenguin', name: 'Royal Penguin', emoji: '🐧', category: 'animals', rarity: 'uncommon', source: 'Exercise with a penguin' },
    fuzzyHamster: { id: 'fuzzyHamster', name: 'Fuzzy Hamster', emoji: '🐹', category: 'animals', rarity: 'common', source: 'Feed a hamster' },
    happyFrog: { id: 'happyFrog', name: 'Happy Frog', emoji: '🐸', category: 'animals', rarity: 'common', source: 'Play with a frog' },
    spinyHedgehog: { id: 'spinyHedgehog', name: 'Spiny Hedgehog', emoji: '🦔', category: 'animals', rarity: 'common', source: 'Cuddle a hedgehog' },
    magicUnicorn: { id: 'magicUnicorn', name: 'Magic Unicorn', emoji: '🦄', category: 'animals', rarity: 'rare', source: 'Play with a unicorn' },
    fierceDragon: { id: 'fierceDragon', name: 'Fierce Dragon', emoji: '🐉', category: 'animals', rarity: 'rare', source: 'Feed a dragon' },
    // Nature stickers - earned through garden
    sproutSticker: { id: 'sproutSticker', name: 'Little Sprout', emoji: '🌱', category: 'nature', rarity: 'common', source: 'Plant your first seed' },
    sunflowerSticker: { id: 'sunflowerSticker', name: 'Sunflower', emoji: '🌻', category: 'nature', rarity: 'common', source: 'Harvest a sunflower' },
    rainbowSticker: { id: 'rainbowSticker', name: 'Rainbow', emoji: '🌈', category: 'nature', rarity: 'uncommon', source: 'Experience all 3 weather types' },
    cherryBlossom: { id: 'cherryBlossom', name: 'Cherry Blossom', emoji: '🌸', category: 'nature', rarity: 'uncommon', source: 'Play during spring' },
    snowflakeSticker: { id: 'snowflakeSticker', name: 'Snowflake', emoji: '❄️', category: 'nature', rarity: 'uncommon', source: 'Play during snowy weather' },
    // Fun stickers - earned through mini-games and activities
    starSticker: { id: 'starSticker', name: 'Gold Star', emoji: '⭐', category: 'fun', rarity: 'common', source: 'Score 25+ in any mini-game' },
    trophySticker: { id: 'trophySticker', name: 'Trophy', emoji: '🏆', category: 'fun', rarity: 'uncommon', source: 'Score 50+ in any mini-game' },
    partySticker: { id: 'partySticker', name: 'Party Time', emoji: '🎉', category: 'fun', rarity: 'common', source: 'Complete all daily tasks' },
    musicSticker: { id: 'musicSticker', name: 'Music Note', emoji: '🎵', category: 'fun', rarity: 'common', source: 'Play Simon Says' },
    artSticker: { id: 'artSticker', name: 'Art Palette', emoji: '🎨', category: 'fun', rarity: 'common', source: 'Play the Coloring game' },
    // Special stickers - earned through milestones
    heartSticker: { id: 'heartSticker', name: 'Big Heart', emoji: '💖', category: 'special', rarity: 'rare', source: 'Reach Best Friend relationship' },
    crownSticker: { id: 'crownSticker', name: 'Royal Crown', emoji: '👑', category: 'special', rarity: 'rare', source: 'Evolve a pet' },
    sparkleSticker: { id: 'sparkleSticker', name: 'Sparkle', emoji: '✨', category: 'special', rarity: 'rare', source: 'Reach Excellent care quality' },
    unicornSticker: { id: 'unicornSticker', name: 'Unicorn', emoji: '🦄', category: 'special', rarity: 'legendary', source: 'Unlock a mythical pet' },
    dragonSticker: { id: 'dragonSticker', name: 'Dragon', emoji: '🐉', category: 'special', rarity: 'legendary', source: 'Raise 3 adults' },
    streakFlame: { id: 'streakFlame', name: 'Eternal Flame', emoji: '🔥', category: 'special', rarity: 'rare', source: 'Reach a 7-day streak' },
    // Breeding stickers
    breedingEgg: { id: 'breedingEgg', name: 'Love Egg', emoji: '🥚', category: 'special', rarity: 'uncommon', source: 'Breed two pets' },
    dnaSticker: { id: 'dnaSticker', name: 'DNA Helix', emoji: '🧬', category: 'special', rarity: 'rare', source: 'Create a hybrid pet' },
    mutantStar: { id: 'mutantStar', name: 'Mutant Star', emoji: '🌟', category: 'special', rarity: 'legendary', source: 'Breed a mutated pet' },
    familyTree: { id: 'familyTree', name: 'Family Tree', emoji: '🌳', category: 'special', rarity: 'rare', source: 'Breed 3 times' },
    // Elder & Memorial stickers
    elderSticker: { id: 'elderSticker', name: 'Wise Elder', emoji: '🏛️', category: 'special', rarity: 'rare', source: 'Raise a pet to Elder stage' },
    memorialSticker: { id: 'memorialSticker', name: 'Memorial Rose', emoji: '🌹', category: 'special', rarity: 'rare', source: 'Retire a pet to the Hall of Fame' },
    wisdomSticker: { id: 'wisdomSticker', name: 'Book of Wisdom', emoji: '📖', category: 'special', rarity: 'legendary', source: 'Have 5 memorials' }
};

const STICKER_RARITIES = {
    common: { label: 'Common', color: '#9E9E9E', stars: 1 },
    uncommon: { label: 'Uncommon', color: '#4CAF50', stars: 2 },
    rare: { label: 'Rare', color: '#2196F3', stars: 3 },
    legendary: { label: 'Legendary', color: '#FF9800', stars: 4 }
};

const STICKER_CATEGORIES = {
    animals: { label: 'Animals', icon: '🐾' },
    nature: { label: 'Nature', icon: '🌿' },
    fun: { label: 'Fun', icon: '🎮' },
    special: { label: 'Special', icon: '✨' }
};

// ==================== TROPHIES ====================

const TROPHIES = {
    // Care trophies
    nurturerTrophy: { id: 'nurturerTrophy', name: 'Nurturer', icon: '💝', description: 'Perform 100 care actions total', shelf: 'care', check: (gs) => { const total = (gs.pets || []).reduce((s, p) => s + (p ? (p.careActions || 0) : 0), 0); return total >= 100; } },
    healerTrophy: { id: 'healerTrophy', name: 'Healer', icon: '🩺', description: 'Use medicine 10 times', shelf: 'care', check: (gs) => (gs.totalMedicineUses || 0) >= 10 },
    groomExpert: { id: 'groomExpert', name: 'Groom Expert', icon: '✂️', description: 'Groom pets 20 times', shelf: 'care', check: (gs) => (gs.totalGroomCount || 0) >= 20 },
    // Growth trophies
    breederTrophy: { id: 'breederTrophy', name: 'Expert Breeder', icon: '🥚', description: 'Raise 3 pets to adult', shelf: 'growth', check: (gs) => (gs.adultsRaised || 0) >= 3 },
    evolutionMaster: { id: 'evolutionMaster', name: 'Evolution Master', icon: '🧬', description: 'Evolve any pet', shelf: 'growth', check: (gs) => (gs.pets || []).some(p => p && p.evolutionStage === 'evolved') },
    mythicalFinder: { id: 'mythicalFinder', name: 'Mythical Finder', icon: '🦄', description: 'Unlock a mythical pet type', shelf: 'growth', check: (gs) => (gs.adultsRaised || 0) >= 2 },
    // Game trophies
    arcadeStar: { id: 'arcadeStar', name: 'Arcade Star', icon: '🕹️', description: 'Score 50+ in 3 different mini-games', shelf: 'games', check: (gs) => { const s = gs.minigameHighScores || {}; return Object.values(s).filter(v => v >= 50).length >= 3; } },
    gameCollector: { id: 'gameCollector', name: 'Game Collector', icon: '🎲', description: 'Play all 6 mini-games', shelf: 'games', check: (gs) => { const c = gs.minigamePlayCounts || {}; return Object.values(c).filter(v => v > 0).length >= 6; } },
    scoreKing: { id: 'scoreKing', name: 'Score King', icon: '👑', description: 'Score 100+ in any mini-game', shelf: 'games', check: (gs) => { const s = gs.minigameHighScores || {}; return Object.values(s).some(v => v >= 100); } },
    // Garden trophies
    harvestKing: { id: 'harvestKing', name: 'Harvest King', icon: '🌾', description: 'Harvest 30 crops total', shelf: 'garden', check: (gs) => gs.garden && gs.garden.totalHarvests >= 30 },
    fullGarden: { id: 'fullGarden', name: 'Full Garden', icon: '🏡', description: 'Unlock all 6 garden plots', shelf: 'garden', check: (gs) => gs.garden && getUnlockedPlotCount(gs.garden.totalHarvests) >= 6 },
    // Social trophies
    familyTrophy: { id: 'familyTrophy', name: 'Happy Family', icon: '👨‍👩‍👧‍👦', description: 'Have 4 pets with all at Good+ care', shelf: 'social', check: (gs) => { const ps = gs.pets || []; return ps.length >= 4 && ps.every(p => p && ['good', 'excellent'].includes(p.careQuality)); } },
    bondMaster: { id: 'bondMaster', name: 'Bond Master', icon: '💖', description: 'Reach Family relationship level', shelf: 'social', check: (gs) => { const r = gs.relationships || {}; return Object.values(r).some(v => v.points >= 250); } },
    // Dedication trophies
    streakLegend: { id: 'streakLegend', name: 'Streak Legend', icon: '🔥', description: 'Reach a 14-day streak', shelf: 'dedication', check: (gs) => gs.streak && gs.streak.current >= 14 },
    dailyDevotee: { id: 'dailyDevotee', name: 'Daily Devotee', icon: '📅', description: 'Complete daily tasks 7 times', shelf: 'dedication', check: (gs) => (gs.totalDailyCompletions || 0) >= 7 },
    collectorTrophy: { id: 'collectorTrophy', name: 'Collector', icon: '📦', description: 'Collect 15 stickers', shelf: 'dedication', check: (gs) => { const st = gs.stickers || {}; return Object.values(st).filter(v => v.collected).length >= 15; } },
    // Breeding trophies
    geneticist: { id: 'geneticist', name: 'Geneticist', icon: '🧬', description: 'Breed 3 different hybrid types', shelf: 'breeding', check: (gs) => { const h = gs.hybridsDiscovered || {}; return Object.keys(h).length >= 3; } },
    breedingLegend: { id: 'breedingLegend', name: 'Breeding Legend', icon: '💕', description: 'Breed 10 times total', shelf: 'breeding', check: (gs) => (gs.totalBreedings || 0) >= 10 },
    mutationCollector: { id: 'mutationCollector', name: 'Mutation Collector', icon: '🌈', description: 'Collect 3 mutated pets', shelf: 'breeding', check: (gs) => (gs.totalMutations || 0) >= 3 },
    // Elder & Memorial trophies
    elderMaster: { id: 'elderMaster', name: 'Elder Master', icon: '🏛️', description: 'Raise 2 pets to Elder stage', shelf: 'growth', check: (gs) => (gs.eldersRaised || 0) >= 2 },
    hallOfFame: { id: 'hallOfFame', name: 'Hall of Fame', icon: '🏆', description: 'Have 5 pets in the memorial', shelf: 'dedication', check: (gs) => (gs.memorials && gs.memorials.length >= 5) },
    legacyKeeper: { id: 'legacyKeeper', name: 'Legacy Keeper', icon: '📜', description: 'Retire an elder pet', shelf: 'dedication', check: (gs) => (gs.memorials && gs.memorials.some(m => m.growthStage === 'elder')) }
};

const TROPHY_SHELVES = {
    care: { label: 'Care', icon: '💝' },
    growth: { label: 'Growth', icon: '🌱' },
    games: { label: 'Games', icon: '🎮' },
    garden: { label: 'Garden', icon: '🌻' },
    social: { label: 'Social', icon: '🤝' },
    dedication: { label: 'Dedication', icon: '🔥' },
    breeding: { label: 'Breeding', icon: '🧬' }
};

// ==================== DAILY STREAKS ====================

const STREAK_MILESTONES = [
    { days: 1, reward: 'sticker', rewardId: 'starSticker', label: 'Day 1', description: 'Welcome back!' },
    { days: 3, reward: 'sticker', rewardId: 'partySticker', label: '3-Day Streak', description: 'On a roll!' },
    { days: 5, reward: 'accessory', rewardId: 'bandana', label: '5-Day Streak', description: 'Dedicated caretaker!' },
    { days: 7, reward: 'sticker', rewardId: 'streakFlame', label: 'Week Streak', description: 'A whole week!' },
    { days: 10, reward: 'accessory', rewardId: 'sunglasses', label: '10-Day Streak', description: 'Super dedicated!' },
    { days: 14, reward: 'sticker', rewardId: 'heartSticker', label: '2-Week Streak', description: 'True devotion!' },
    { days: 21, reward: 'accessory', rewardId: 'crown', label: '3-Week Streak', description: 'Incredible commitment!' },
    { days: 30, reward: 'sticker', rewardId: 'crownSticker', label: 'Monthly Streak', description: 'Legendary caretaker!' }
];

// Stat boosts applied each day based on current streak length
function getStreakBonus(streakDays) {
    if (streakDays >= 14) return { happiness: 15, energy: 10, label: '+15 Happy, +10 Energy' };
    if (streakDays >= 7) return { happiness: 10, energy: 8, label: '+10 Happy, +8 Energy' };
    if (streakDays >= 3) return { happiness: 8, energy: 5, label: '+8 Happy, +5 Energy' };
    if (streakDays >= 1) return { happiness: 5, energy: 3, label: '+5 Happy, +3 Energy' };
    return { happiness: 0, energy: 0, label: 'No bonus' };
}

// ==================== PET COMPETITION SYSTEM ====================

// Battle moves available to all pets - damage scales with pet stats
const BATTLE_MOVES = {
    tackle: { name: 'Tackle', emoji: '💥', stat: 'energy', basePower: 12, description: 'A physical charge!' },
    charm: { name: 'Charm', emoji: '💖', stat: 'happiness', basePower: 10, description: 'Win them over with cuteness!' },
    splash: { name: 'Splash', emoji: '💦', stat: 'cleanliness', basePower: 8, description: 'A sparkling splash attack!' },
    snack: { name: 'Snack Attack', emoji: '🍪', stat: 'hunger', basePower: 14, description: 'Throw a tasty distraction!' },
    rest: { name: 'Rest', emoji: '💤', stat: 'energy', basePower: 0, heal: 15, description: 'Recover some HP!' }
};

// Pet type advantages for battles (rock-paper-scissors style bonuses)
const PET_TYPE_ADVANTAGES = {
    dog: ['cat', 'hamster'], cat: ['bird', 'fish'], bunny: ['frog', 'hedgehog'],
    bird: ['frog', 'bunny'], hamster: ['bunny', 'turtle'], turtle: ['hedgehog', 'hamster'],
    fish: ['turtle', 'frog'], frog: ['hamster', 'hedgehog'], hedgehog: ['cat', 'bird'],
    panda: ['dog', 'turtle'], penguin: ['fish', 'bird'],
    unicorn: ['dragon', 'panda'], dragon: ['penguin', 'hedgehog']
};

// Boss encounters - seasonal and special event bosses
const BOSS_ENCOUNTERS = {
    springBlossom: {
        name: 'Blossom Beast', emoji: '🌸👹', season: 'spring',
        maxHP: 100, attack: 8, defense: 4,
        moves: [
            { name: 'Petal Storm', emoji: '🌸', power: 12, description: 'A flurry of petals!' },
            { name: 'Vine Whip', emoji: '🌿', power: 15, description: 'Tangling vines strike!' },
            { name: 'Pollen Cloud', emoji: '☁️', power: 8, healSelf: 10, description: 'Heals with pollen!' }
        ],
        rewards: { happiness: 20, sticker: 'cherryBlossom' },
        victoryMessage: 'The Blossom Beast scatters into flower petals!'
    },
    summerInferno: {
        name: 'Sun Scorcher', emoji: '☀️🔥', season: 'summer',
        maxHP: 120, attack: 10, defense: 3,
        moves: [
            { name: 'Heat Wave', emoji: '🔥', power: 14, description: 'Scorching heat!' },
            { name: 'Solar Beam', emoji: '☀️', power: 18, description: 'A concentrated beam of light!' },
            { name: 'Mirage', emoji: '🌊', power: 6, healSelf: 12, description: 'Confuses with illusions!' }
        ],
        rewards: { happiness: 25, energy: 15 },
        victoryMessage: 'The Sun Scorcher fizzles out like a sunset!'
    },
    autumnPhantom: {
        name: 'Harvest Phantom', emoji: '🎃👻', season: 'autumn',
        maxHP: 110, attack: 9, defense: 5,
        moves: [
            { name: 'Spooky Howl', emoji: '👻', power: 13, description: 'A chilling howl!' },
            { name: 'Pumpkin Bomb', emoji: '🎃', power: 16, description: 'Exploding pumpkins!' },
            { name: 'Shadow Mend', emoji: '🌑', power: 5, healSelf: 14, description: 'Heals in darkness!' }
        ],
        rewards: { happiness: 22, hunger: 20 },
        victoryMessage: 'The Harvest Phantom dissolves into autumn leaves!'
    },
    winterFrost: {
        name: 'Frost Giant', emoji: '❄️🧊', season: 'winter',
        maxHP: 130, attack: 7, defense: 7,
        moves: [
            { name: 'Blizzard', emoji: '🌨️', power: 12, description: 'A freezing storm!' },
            { name: 'Ice Crush', emoji: '🧊', power: 17, description: 'Massive ice blocks!' },
            { name: 'Snowfort', emoji: '⛄', power: 4, healSelf: 16, description: 'Builds icy defenses!' }
        ],
        rewards: { happiness: 22, energy: 20 },
        victoryMessage: 'The Frost Giant melts away into snowflakes!'
    },
    cosmicBeast: {
        name: 'Cosmic Beast', emoji: '🌟👾', season: null, // Special event boss (any season)
        maxHP: 150, attack: 11, defense: 6,
        moves: [
            { name: 'Star Shower', emoji: '⭐', power: 15, description: 'Stars rain down!' },
            { name: 'Nebula Blast', emoji: '🌌', power: 20, description: 'A cosmic explosion!' },
            { name: 'Warp Heal', emoji: '🌀', power: 3, healSelf: 18, description: 'Warps space to heal!' }
        ],
        rewards: { happiness: 30, energy: 20, hunger: 15 },
        victoryMessage: 'The Cosmic Beast returns to the stars!'
    }
};

// Pet show categories for judging
const PET_SHOW_CATEGORIES = {
    care: { name: 'Care Quality', emoji: '💝', weight: 30, description: 'How well-cared-for is your pet?' },
    appearance: { name: 'Appearance', emoji: '✨', weight: 25, description: 'Style, pattern, and accessories!' },
    happiness: { name: 'Happiness', emoji: '😊', weight: 20, description: 'Is your pet happy and healthy?' },
    tricks: { name: 'Tricks', emoji: '🎪', weight: 15, description: 'Show off your pet\'s skills!' },
    bond: { name: 'Bond', emoji: '💖', weight: 10, description: 'The bond between you and your pet!' }
};

const PET_SHOW_RANKS = [
    { name: 'Participant', emoji: '🎗️', minScore: 0 },
    { name: 'Bronze', emoji: '🥉', minScore: 30 },
    { name: 'Silver', emoji: '🥈', minScore: 55 },
    { name: 'Gold', emoji: '🥇', minScore: 75 },
    { name: 'Champion', emoji: '🏆', minScore: 90 }
];

// Obstacle course stage definitions
const OBSTACLE_COURSE_STAGES = [
    { name: 'Hurdle Jump', emoji: '🏃', stat: 'energy', threshold: 40, points: 15, description: 'Jump over the hurdles!' },
    { name: 'Mud Pit', emoji: '🟫', stat: 'cleanliness', threshold: 35, points: 10, description: 'Splash through the mud!' },
    { name: 'Treat Trail', emoji: '🍖', stat: 'hunger', threshold: 30, points: 12, description: 'Follow the treat trail!' },
    { name: 'Tunnel Crawl', emoji: '🕳️', stat: 'energy', threshold: 50, points: 18, description: 'Crawl through the tunnel!' },
    { name: 'Balance Beam', emoji: '🤸', stat: 'happiness', threshold: 45, points: 20, description: 'Walk the balance beam!' },
    { name: 'Water Splash', emoji: '💦', stat: 'cleanliness', threshold: 40, points: 15, description: 'Swim through the water!' },
    { name: 'Cheer Crowd', emoji: '👏', stat: 'happiness', threshold: 55, points: 22, description: 'Win the crowd\'s cheers!' },
    { name: 'Sprint Finish', emoji: '🏁', stat: 'energy', threshold: 60, points: 25, description: 'Race to the finish!' }
];

// Rival pet trainers with escalating difficulty
const RIVAL_TRAINERS = [
    {
        name: 'Timmy', emoji: '👦', title: 'Beginner Trainer',
        petType: 'hamster', petName: 'Nibbles',
        stats: { hunger: 50, cleanliness: 45, happiness: 55, energy: 50 },
        difficulty: 1, battleHP: 40,
        winMessage: 'Wow, you\'re really good!', loseMessage: 'Nibbles is the best!'
    },
    {
        name: 'Lily', emoji: '👧', title: 'Junior Trainer',
        petType: 'bunny', petName: 'Cotton',
        stats: { hunger: 55, cleanliness: 55, happiness: 60, energy: 55 },
        difficulty: 2, battleHP: 50,
        winMessage: 'Cotton did great, but you were better!', loseMessage: 'Cotton hops to victory!'
    },
    {
        name: 'Max', emoji: '🧑', title: 'Skilled Trainer',
        petType: 'dog', petName: 'Rex',
        stats: { hunger: 65, cleanliness: 60, happiness: 65, energy: 70 },
        difficulty: 3, battleHP: 60,
        winMessage: 'Impressive skills! Rex respects you.', loseMessage: 'Rex is unstoppable!'
    },
    {
        name: 'Sara', emoji: '👩', title: 'Expert Trainer',
        petType: 'cat', petName: 'Shadow',
        stats: { hunger: 70, cleanliness: 70, happiness: 75, energy: 65 },
        difficulty: 4, battleHP: 70,
        winMessage: 'Shadow acknowledges your skill!', loseMessage: 'Shadow was too sly!'
    },
    {
        name: 'Prof. Oak', emoji: '🧓', title: 'Veteran Trainer',
        petType: 'turtle', petName: 'Ancient',
        stats: { hunger: 75, cleanliness: 75, happiness: 70, energy: 75 },
        difficulty: 5, battleHP: 80,
        winMessage: 'Magnificent! Ancient bows to you.', loseMessage: 'Ancient is unshakable!'
    },
    {
        name: 'Luna', emoji: '🧙‍♀️', title: 'Mystic Trainer',
        petType: 'unicorn', petName: 'Starlight',
        stats: { hunger: 80, cleanliness: 85, happiness: 85, energy: 80 },
        difficulty: 6, battleHP: 90,
        winMessage: 'The stars align for you!', loseMessage: 'Starlight shines too bright!'
    },
    {
        name: 'Drake', emoji: '🐲', title: 'Champion Trainer',
        petType: 'dragon', petName: 'Inferno',
        stats: { hunger: 90, cleanliness: 80, happiness: 90, energy: 90 },
        difficulty: 7, battleHP: 100,
        winMessage: 'You are the true champion!', loseMessage: 'Inferno reigns supreme!'
    }
];

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
    hoursNeeded: 24,         // 24 hours of age to reach elder
    actionsNeeded: 120,      // 120 care actions needed
    wisdomBonusBase: 10,     // Base wisdom bonus for stat gains
    wisdomDecayReduction: 0.8, // 20% slower stat decay
    wisdomRelationshipBonus: 1.5, // 50% faster relationship building
    elderAccessories: ['glasses', 'topHat'] // Accessories unlocked at elder
};

// ==================== PET MEMORIAL SYSTEM ====================

const MEMORIAL_CONFIG = {
    maxMemorials: 20,      // Maximum memorials stored
    retirementMinAge: 12,  // Minimum 12 hours old to retire honorably
    retirementMinStage: 'adult' // Must be adult or elder to retire
};

const MEMORIAL_TITLES = {
    elder: '🏛️ Wise Elder',
    evolved: '✨ Transcended',
    excellent: '🌟 Beloved',
    adult: '⭐ Cherished',
    child: '🌱 Young Heart',
    baby: '🍼 Little Angel'
};

function getMemorialTitle(pet) {
    if (pet.growthStage === 'elder') return MEMORIAL_TITLES.elder;
    if (pet.evolutionStage === 'evolved') return MEMORIAL_TITLES.evolved;
    if (pet.careQuality === 'excellent') return MEMORIAL_TITLES.excellent;
    if (pet.growthStage === 'adult') return MEMORIAL_TITLES.adult;
    if (pet.growthStage === 'child') return MEMORIAL_TITLES.child;
    return MEMORIAL_TITLES.baby;
}

