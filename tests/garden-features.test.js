const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../js/garden-features-core.js');

const MIN = core.MINUTE_MS;
const HOUR = core.HOUR_MS;

test('growth timers progress by timestamp deltas', () => {
    const crop = { growTime: 3, plantType: 'crop', harvestYield: 1 };
    const plot = {
        cropId: 'carrot',
        stage: 0,
        plantedAt: 0,
        lastUpdatedAt: 0,
        growthProgressMs: 0,
        wateredUntil: 0,
        fertilizerCharges: 0,
        pestUntil: 0
    };

    core.advancePlantPlot(plot, crop, { now: 4 * MIN, seasonMultiplier: 1 });
    assert.equal(plot.stage, 1);

    core.advancePlantPlot(plot, crop, { now: 9 * MIN, seasonMultiplier: 1 });
    assert.equal(plot.stage, 3);
});

test('fruit trees become harvestable repeatedly after cooldown', () => {
    const tree = {
        plantType: 'fruitTree',
        firstMatureMinutes: 30,
        harvestCooldownMinutes: 60,
        harvestYield: 2
    };
    const plot = {
        cropId: 'apple',
        stage: 0,
        plantedAt: 0,
        lastUpdatedAt: 0,
        growthProgressMs: 0,
        wateredUntil: 0,
        fertilizerCharges: 0,
        pestUntil: 0,
        harvestReady: false
    };

    core.advancePlantPlot(plot, tree, { now: 30 * MIN, seasonMultiplier: 1 });
    assert.equal(plot.harvestReady, true);
    assert.equal(plot.stage, 3);

    const first = core.afterHarvest(plot, tree, { now: 30 * MIN });
    assert.equal(first.keepPlot, true);
    assert.equal(plot.harvestReady, false);

    core.advancePlantPlot(plot, tree, { now: 70 * MIN, seasonMultiplier: 1 });
    assert.equal(plot.harvestReady, false);

    core.advancePlantPlot(plot, tree, { now: 95 * MIN, seasonMultiplier: 1 });
    assert.equal(plot.harvestReady, true);
    assert.equal(plot.stage, 3);
});

test('compost queue converts items into fertilizer over time', () => {
    const compost = core.createDefaultCompostState(0);
    const enq = core.enqueueCompostItem(compost, {
        itemId: 'carrot',
        amount: 1,
        durationMs: 30 * MIN,
        fertilizerYield: 2,
        enqueuedAt: 0
    });
    assert.equal(enq.ok, true);

    let tick = core.tickCompostState(compost, 10 * MIN);
    assert.equal(tick.produced, 0);
    assert.equal(compost.readyFertilizer, 0);

    tick = core.tickCompostState(compost, 31 * MIN);
    assert.equal(tick.produced, 2);
    assert.equal(compost.readyFertilizer, 2);

    const collected = core.collectCompostFertilizer(compost);
    assert.equal(collected, 2);
    assert.equal(compost.readyFertilizer, 0);
});

test('seasonal gating and off-season yield reduction are deterministic', () => {
    const crop = {
        seasons: ['autumn'],
        plantType: 'crop',
        harvestYield: 4
    };
    assert.equal(core.isSeasonAllowed(crop, 'autumn'), true);
    assert.equal(core.isSeasonAllowed(crop, 'winter'), false);

    const reducedYield = core.getHarvestYield({ fertilizerCharges: 0, pestUntil: 0 }, crop, {
        offSeason: true,
        offSeasonYieldMultiplier: 0.75,
        now: 0
    });
    assert.equal(reducedYield, 3);
});

test('sprinklers auto-water covered plots and preserve schedule', () => {
    const plots = [
        { stage: 1, wateredUntil: 0 },
        { stage: 1, wateredUntil: 0 }
    ];
    const sprinklers = [
        { plotIndex: 0, radius: 0, intervalMs: HOUR, nextWaterAt: 0 }
    ];

    const result = core.runSprinklers(sprinklers, plots, 10 * MIN, {
        defaultIntervalMs: HOUR,
        waterDurationMs: 2 * HOUR
    });

    assert.equal(result.wateredPlots, 1);
    assert.ok(plots[0].wateredUntil > 10 * MIN);
    assert.equal(plots[1].wateredUntil, 0);
    assert.ok(sprinklers[0].nextWaterAt > 10 * MIN);
});

test('crossbreeding discovery unlocks recipe result deterministically', () => {
    const discovered = {};
    const plots = [
        { cropId: 'carrot', stage: 2 },
        { cropId: 'strawberry', stage: 2 }
    ];
    const recipes = [{ parentA: 'carrot', parentB: 'strawberry', result: 'sunblush', chance: 0.5 }];

    const result = core.runCrossbreeding(plots, recipes, {
        discovered,
        rng: () => 0.1
    });

    assert.equal(result.unlocks.includes('sunblush'), true);
    assert.equal(discovered.sunblush, true);
    assert.ok(result.logs.length >= 1);
});

test('beehive production scales with flowers and respects capacity', () => {
    const hive = core.createDefaultBeehiveState(0);
    hive.placed = true;
    hive.capacity = 5;

    const t1 = core.tickBeehive(hive, 4 * HOUR, {
        flowerCount: 4,
        baseHoneyPerHour: 0.5,
        flowerBoostPerFlower: 0.12,
        maxFlowerBoost: 1
    });
    assert.ok(t1.stored > 0);

    const t2 = core.tickBeehive(hive, 30 * HOUR, {
        flowerCount: 10,
        baseHoneyPerHour: 1,
        flowerBoostPerFlower: 0.2,
        maxFlowerBoost: 1
    });
    assert.equal(t2.stored, 5);
});

test('pest risk is reduced by scarecrow coverage', () => {
    const plant = { pestRiskPerDay: 0.12 };
    const uncovered = core.computePestRisk(plant, false, { scarecrowReduction: 0.65 });
    const covered = core.computePestRisk(plant, true, { scarecrowReduction: 0.65 });

    assert.ok(covered < uncovered);
    assert.equal(core.rollPestEvent(uncovered, 60, 0), true);
    assert.equal(core.rollPestEvent(uncovered, 60, 1), false);
});
