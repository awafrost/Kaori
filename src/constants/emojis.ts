import type { GuildFeature, UserFlagsString } from 'discord.js';

export const white = {
  addMark: '1310199366916505600',
  boost: '1310199453512106024',
  channel: '1310199623767425045',
  id: '1310199775127273543',
  message: '1310199918903955557',
  moderator: '1310200011908452383',
  member: '1310200180225609760',
  pencil: '1310200296882049075',
  removeMark: '1310200566068150312',
  role2: '1310203444363268156',
  role: '1310203447156543510',
  schedule: '1310200667972833321',
  timeOut: '1310200743893930024',
  image: '1310200901079924756',
  download: '1310200979748159590',
  link: '1310201053190295552',
  reply: '1310201168793960448',
  addLink: '1310201276184662016',
  addSelectRole: '1310201379893022720',
  addButtonRole: '1310201779543343214',
  setting: '1310201858547257385',
  home: '1310201921604288522',
} as const;

export const gray = {
  member: '1310200180225609760',
  text: '1310199918903955557',
  link: '1310201053190295552',
  edit: '1310200296882049075',
  channel: '1310199623767425045',
  schedule: '1310200667972833321',
} as const;

export const blurple = {
  member: '1310200180225609760',
  text: '1310199918903955557',
  admin: '1310204487998373909',
} as const;

export const space = '1064892783804043344';

export const userFlag: Partial<Record<UserFlagsString, string>> = {
  Staff: '1310204778072117278',
  Partner: '1310200173749604423',
  CertifiedModerator: '1310200011908452383',
  Hypesquad: '1310205340004122644',
  HypeSquadOnlineHouse1: '1310205334417047643',
  HypeSquadOnlineHouse2: '1310205331036704831',
  HypeSquadOnlineHouse3: '1310205331036704831',
  BugHunterLevel1: '1310206050191802488',
  BugHunterLevel2: '1310206048027807794',
  ActiveDeveloper: '1310206319260602368',
  VerifiedDeveloper: '1310206321710207067',
  PremiumEarlySupporter: '1310206574530265179',
};

export const guildFeatures: Partial<Record<GuildFeature, string>> = {
  PARTNERED: '1310200173749604423',
  VERIFIED: '1310200176891138130',
  DISCOVERABLE: '1310207046456709140',
};

const colorEmojis = { white, gray, blurple };
type ColorEmojis = typeof colorEmojis;
export type Emojis<
  T extends ColorEmojis[keyof ColorEmojis] = ColorEmojis[keyof ColorEmojis],
> = T extends Record<infer P, string> ? P : never;
type HasColor<
  E extends Emojis,
  C extends keyof ColorEmojis,
> = ColorEmojis[C] extends {
  [x in E]: string;
}
  ? C
  : never;
export type EmojiColors<E extends Emojis> =
  | HasColor<E, 'white'>
  | HasColor<E, 'gray'>
  | HasColor<E, 'blurple'>;

export function getColorEmoji<E extends Emojis>(
  emoji: E,
  color: EmojiColors<E>,
) {
  return colorEmojis[color][emoji as keyof (typeof colorEmojis)[typeof color]];
}
