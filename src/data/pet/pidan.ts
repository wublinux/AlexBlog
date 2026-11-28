import rawConfig from '../../../public/image/pet/pidan-config.json';

export interface PidanPhotoCard {
	id: string;
	enabled?: boolean;
	title: string;
	badge: string;
	/** Relative path under BASE_URL (without leading slash), e.g. image/pet/cards/xxx.webp */
	image: string;
	caption: string;
	quote: string;
}

export interface PidanProfile {
	name: string;
	subtitle: string;
	collarLabel: string;
}

export interface PidanDialogues {
	greet: string[];
	pet: string[];
	petCombo: string[];
	feed: string[];
	sleep: string[];
	wake: string[];
	drag: string[];
	drop: string[];
	fastScroll: string[];
	collarOn: string;
	collarOff: string;
	milestone25: string;
	milestone50: string;
	milestone85: string;
	milestone100: string;
	toReal: string;
	toChibi: string;
}

export interface PidanConfig {
	profile: PidanProfile;
	cards: PidanPhotoCard[];
	dialogues: PidanDialogues;
}

export const DEFAULT_PIDAN_CONFIG: PidanConfig = rawConfig as PidanConfig;
export const PIDAN_PROFILE = DEFAULT_PIDAN_CONFIG.profile;
export const PIDAN_PHOTO_CARDS = DEFAULT_PIDAN_CONFIG.cards;
export const PIDAN_DIALOGUES = DEFAULT_PIDAN_CONFIG.dialogues;
