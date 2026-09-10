import { relations } from "drizzle-orm/relations";
import { ambienceAssets, ambienceAssetSources, sponsors, scenes, ambienceProfiles, curatedSets, curatedSetTracks, tracks, oneliners, playbackSources, soundStems } from "./schema";

export const ambienceAssetSourcesRelations = relations(ambienceAssetSources, ({one}) => ({
	ambienceAsset: one(ambienceAssets, {
		fields: [ambienceAssetSources.assetId],
		references: [ambienceAssets.id]
	}),
}));

export const ambienceAssetsRelations = relations(ambienceAssets, ({many}) => ({
	ambienceAssetSources: many(ambienceAssetSources),
	soundStems: many(soundStems),
}));

export const scenesRelations = relations(scenes, ({one, many}) => ({
	sponsor: one(sponsors, {
		fields: [scenes.sponsorId],
		references: [sponsors.id]
	}),
	ambienceProfiles: many(ambienceProfiles),
	curatedSets: many(curatedSets),
	tracks: many(tracks),
	oneliners: many(oneliners),
	soundStems: many(soundStems),
}));

export const sponsorsRelations = relations(sponsors, ({many}) => ({
	scenes: many(scenes),
}));

export const ambienceProfilesRelations = relations(ambienceProfiles, ({one}) => ({
	scene: one(scenes, {
		fields: [ambienceProfiles.sceneId],
		references: [scenes.id]
	}),
}));

export const curatedSetsRelations = relations(curatedSets, ({one, many}) => ({
	scene: one(scenes, {
		fields: [curatedSets.sceneId],
		references: [scenes.id]
	}),
	curatedSetTracks: many(curatedSetTracks),
}));

export const curatedSetTracksRelations = relations(curatedSetTracks, ({one}) => ({
	curatedSet: one(curatedSets, {
		fields: [curatedSetTracks.curatedSetId],
		references: [curatedSets.id]
	}),
	track: one(tracks, {
		fields: [curatedSetTracks.trackId],
		references: [tracks.id]
	}),
}));

export const tracksRelations = relations(tracks, ({one, many}) => ({
	curatedSetTracks: many(curatedSetTracks),
	scene: one(scenes, {
		fields: [tracks.sceneId],
		references: [scenes.id]
	}),
	playbackSources: many(playbackSources),
}));

export const onelinersRelations = relations(oneliners, ({one}) => ({
	scene: one(scenes, {
		fields: [oneliners.sceneId],
		references: [scenes.id]
	}),
}));

export const playbackSourcesRelations = relations(playbackSources, ({one}) => ({
	track: one(tracks, {
		fields: [playbackSources.trackId],
		references: [tracks.id]
	}),
}));

export const soundStemsRelations = relations(soundStems, ({one}) => ({
	ambienceAsset: one(ambienceAssets, {
		fields: [soundStems.assetId],
		references: [ambienceAssets.id]
	}),
	scene: one(scenes, {
		fields: [soundStems.sceneId],
		references: [scenes.id]
	}),
}));