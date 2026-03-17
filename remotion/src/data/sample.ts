import {TimelineData, MediaDB} from '../types';

export const sampleMediaDB: MediaDB = {
  'champions_darius': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Darius.png',
  'champions_ahri': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Ahri.png',
  'champions_jinx': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Jinx.png',
  'champions_thresh': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/champion/Thresh.png',
  'items_trinity_force': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/3078.png',
  'items_dorans_blade': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/1055.png',
  'spells_flash': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/spell/SummonerFlash.png',
  'spells_teleport': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/spell/SummonerTeleport.png',
  'runes_conqueror': 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png',
  'objectives_baron': 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/item/3513.png',
};

export const sampleTimeline: TimelineData = {
  fps: 25,
  width: 1920,
  height: 1080,
  durationInSeconds: 120,
  mediaDB: sampleMediaDB,
  entries: [
    // 0-3s: gap (no overlay)

    // 3s: Titre
    {
      id: '1',
      presetName: 'Titre',
      presetId: 'titre-1',
      startTime: 3,
      duration: 7,
      texts: ['Wave Management : les bases'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 12s: Texte
    {
      id: '2',
      presetName: 'Texte',
      presetId: 'texte-1',
      startTime: 12,
      duration: 8,
      texts: ['Le contrôle des vagues de minions est la compétence la plus importante en lane'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 22s: Titre + Texte
    {
      id: '3',
      presetName: 'Titre + Texte',
      presetId: 'tt-1',
      startTime: 22,
      duration: 9,
      texts: ['Slow Push', 'Accumuler les minions pour créer une vague massive'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 33s: Bulletpoint 3
    {
      id: '4',
      presetName: 'Bulletpoint',
      presetId: 'bp-1',
      startTime: 33,
      duration: 10,
      texts: ['Quand Slow Push ?'],
      bullets: [
        {text: 'Avant un roam mid', inOffset: 1},
        {text: 'Avant un recall', inOffset: 3},
        {text: 'Pour setup un dive', inOffset: 5},
      ],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 45s: Champion focus
    {
      id: '5',
      presetName: 'Champion focus',
      presetId: 'cf-1',
      startTime: 45,
      duration: 8,
      texts: ['Darius', 'Domine les trades courts en lane'],
      bullets: [],
      images: [{key: 'champions_darius', resolvedUrl: sampleMediaDB['champions_darius']}],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 55s: Item focus
    {
      id: '6',
      presetName: 'Item focus',
      presetId: 'if-1',
      startTime: 55,
      duration: 8,
      texts: ['Trinity Force', 'Core item pour les bruisers'],
      bullets: [],
      images: [{key: 'items_trinity_force', resolvedUrl: sampleMediaDB['items_trinity_force']}],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 65s: Pop up
    {
      id: '7',
      presetName: 'Pop up',
      presetId: 'pu-1',
      startTime: 65,
      duration: 4,
      texts: [],
      bullets: [],
      images: [{key: 'champions_ahri', resolvedUrl: sampleMediaDB['champions_ahri']}],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 70s: Pop icons
    {
      id: '8',
      presetName: 'Pop icons',
      presetId: 'pi-1',
      startTime: 70,
      duration: 6,
      texts: [],
      bullets: [],
      images: [
        {key: 'champions_jinx', resolvedUrl: sampleMediaDB['champions_jinx']},
        {key: 'spells_flash', resolvedUrl: sampleMediaDB['spells_flash']},
        {key: 'items_dorans_blade', resolvedUrl: sampleMediaDB['items_dorans_blade']},
      ],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 78s: Spell / Rune
    {
      id: '9',
      presetName: 'Spell / Rune',
      presetId: 'sr-1',
      startTime: 78,
      duration: 6,
      texts: ['Flash', 'Toujours le garder pour les fights importants'],
      bullets: [],
      images: [{key: 'spells_flash', resolvedUrl: sampleMediaDB['spells_flash']}],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 86s: Objectif
    {
      id: '10',
      presetName: 'Objectif',
      presetId: 'obj-1',
      startTime: 86,
      duration: 7,
      texts: ['Baron Nashor', 'Contester uniquement avec avantage numérique'],
      bullets: [],
      images: [{key: 'objectives_baron', resolvedUrl: sampleMediaDB['objectives_baron']}],
      family: 'visual',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 95s: Erreur à éviter
    {
      id: '11',
      presetName: 'Erreur à éviter',
      presetId: 'err-1',
      startTime: 95,
      duration: 6,
      texts: ['Push sans vision', 'Toujours ward la rivière avant de push'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 103s: Astuce coach
    {
      id: '12',
      presetName: 'Astuce coach',
      presetId: 'ac-1',
      startTime: 103,
      duration: 5,
      texts: ['Astuce timing', 'Regarde le timer des objectifs avant de décider ton push'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 110s: Conclusion
    {
      id: '13',
      presetName: 'Conclusion',
      presetId: 'concl-1',
      startTime: 110,
      duration: 8,
      texts: ['Maîtrise le wave management pour contrôler ta lane'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.5, moveX: 0, moveY: -80, blur: 30},
    },
  ],
};
