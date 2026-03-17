import {TimelineData} from '../types';

export const derushIntroTimeline: TimelineData = {
  fps: 25,
  width: 1920,
  height: 1080,
  durationInSeconds: 319,
  entries: [
    // 0:02 — Titre: Welcome
    {
      id: 'di-1',
      presetName: 'Titre',
      presetId: 'titre-1',
      startTime: 2,
      duration: 6,
      texts: ['Bienvenue dans le Skill Book'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 0:17 — Titre + Texte: What's in the Skill Book
    {
      id: 'di-2',
      presetName: 'Titre + Texte',
      presetId: 'tt-1',
      startTime: 17,
      duration: 7,
      texts: ['Contenu du Skill Book', 'Bases LoL, théorie des rôles et cas pratiques'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 0:32 — Titre: Role theory
    {
      id: 'di-3',
      presetName: 'Titre',
      presetId: 'titre-2',
      startTime: 32,
      duration: 5,
      texts: ['Théorie des rôles'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 0:38 — Texte: Understanding your role
    {
      id: 'di-4',
      presetName: 'Texte',
      presetId: 'texte-1',
      startTime: 38,
      duration: 6,
      texts: ['Comprendre ton rôle est indispensable pour progresser'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 0:51 — Bulletpoint: Three keys (synced to transcript timestamps)
    // Coach says: 0:51 "trois méthodes", 0:55 "sérieux", 1:02 "régulièrement", 1:05 "routine"
    {
      id: 'di-5',
      presetName: 'Bulletpoint',
      presetId: 'bp-1',
      startTime: 51,
      duration: 18,
      texts: ['3 clés pour progresser'],
      bullets: [
        {text: 'Joue sérieusement', inOffset: 4},
        {text: 'Pratique régulièrement', inOffset: 11},
        {text: 'Aie une routine d\'entraînement', inOffset: 14},
      ],
      images: [],
      family: 'text',
      animation: {fade: 0.5, moveX: 0, moveY: -100, blur: 50},
    },

    // 1:12 — Astuce coach: Regularity matters
    {
      id: 'di-6',
      presetName: 'Astuce coach',
      presetId: 'ac-1',
      startTime: 72,
      duration: 7,
      texts: ['Régularité', '5-6 games par mois ne suffit pas pour progresser'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 1:39 — Titre + Texte: Skill Book is a guide
    {
      id: 'di-7',
      presetName: 'Titre + Texte',
      presetId: 'tt-2',
      startTime: 99,
      duration: 7,
      texts: ['Le Skill Book', 'Un guide pour t\'aider, pas une solution magique'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 1:54 — Titre: Method 1
    {
      id: 'di-8',
      presetName: 'Titre',
      presetId: 'titre-3',
      startTime: 114,
      duration: 5,
      texts: ['Méthode 1 : Apprentissage ciblé'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 2:01 — Bulletpoint: Quick learning steps (synced to transcript)
    // Coach says: 2:01 "prend un sujet", 2:08 "review", 2:16 "cas pratiques"
    {
      id: 'di-9',
      presetName: 'Bulletpoint',
      presetId: 'bp-2',
      startTime: 121,
      duration: 20,
      texts: ['Apprendre vite sur un sujet'],
      bullets: [
        {text: 'Choisis un seul sujet', inOffset: 0},
        {text: 'Review tes games', inOffset: 7},
        {text: 'Regarde les cas pratiques', inOffset: 15},
      ],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 2:23 — Titre: Method 2
    {
      id: 'di-10',
      presetName: 'Titre',
      presetId: 'titre-4',
      startTime: 143,
      duration: 5,
      texts: ['Méthode 2 : Apprentissage passif'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 2:28 — Texte: Watch in order
    {
      id: 'di-11',
      presetName: 'Texte',
      presetId: 'texte-2',
      startTime: 148,
      duration: 6,
      texts: ['Regarde le Skill Book dans l\'ordre, teste ce qui t\'intéresse'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 2:55 — Titre: Method 3
    {
      id: 'di-12',
      presetName: 'Titre',
      presetId: 'titre-5',
      startTime: 175,
      duration: 5,
      texts: ['Méthode 3 : Livre de chevet'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 3:08 — Texte: Practical cases solve problems
    {
      id: 'di-13',
      presetName: 'Texte',
      presetId: 'texte-3',
      startTime: 188,
      duration: 6,
      texts: ['Un problème en game ? La solution est dans les cas pratiques'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 3:42 — Astuce coach: You are the change
    {
      id: 'di-14',
      presetName: 'Astuce coach',
      presetId: 'ac-2',
      startTime: 222,
      duration: 7,
      texts: ['Rappel important', 'Le Skill Book est ton guide, c\'est toi le changement'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 4:11 — Titre + Texte: Progression takes time
    {
      id: 'di-15',
      presetName: 'Titre + Texte',
      presetId: 'tt-3',
      startTime: 251,
      duration: 7,
      texts: ['La progression prend du temps', 'Désapprendre puis réapprendre correctement'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 4:35 — Texte: Think training routine
    {
      id: 'di-16',
      presetName: 'Texte',
      presetId: 'texte-4',
      startTime: 275,
      duration: 6,
      texts: ['Pense routine d\'entraînement, pas résultat immédiat'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 4:52 — Titre + Texte: Champions are on you
    {
      id: 'di-17',
      presetName: 'Titre + Texte',
      presetId: 'tt-4',
      startTime: 292,
      duration: 7,
      texts: ['Champions = à toi de jouer', 'Le Skill Book couvre la macro, les combos c\'est toi'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },

    // 5:10 — Conclusion: Let's go
    {
      id: 'di-18',
      presetName: 'Conclusion',
      presetId: 'concl-1',
      startTime: 310,
      duration: 7,
      texts: ['C\'est parti pour le Skill Book !'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.5, moveX: 0, moveY: -80, blur: 30},
    },
  ],
};
