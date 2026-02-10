export interface RoleInfo {
  color: string
  bg: string
  border: string
  title: string
  description: string
  btnColor: string
  image: string
  team: 'village' | 'evil' | 'neutral'
  ability: string
}

export const playerNameColors = [
  'text-cyan-400',
  'text-rose-400',
  'text-lime-400',
  'text-amber-400',
  'text-sky-400',
  'text-pink-400',
  'text-teal-400',
  'text-orange-400',
  'text-emerald-400',
  'text-fuchsia-400',
  'text-yellow-400',
  'text-blue-400',
] as const

export function getPlayerColor(index: number): string {
  return playerNameColors[index % playerNameColors.length]
}

export const roleConfig: Record<string, RoleInfo> = {
  wolf: {
    color: 'text-wolf-red',
    bg: 'bg-wolf-red/10',
    border: 'border-wolf-red/30',
    title: 'Werewolf',
    description: 'Eliminate villagers under the cover of night. Blend in during the day.',
    btnColor: 'bg-wolf-red hover:bg-wolf-red/90',
    image: '/werewolf-photoroom.png',
    team: 'evil',
    ability: 'Each night, the werewolves collectively choose one player to eliminate. During the day, they must blend in with the villagers and avoid suspicion. If multiple wolves are alive, they must agree on the same target.',
  },
  kittenWolf: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    title: 'Kitten Wolf',
    description: 'A young werewolf with a special gift. Each night, choose to either kill a villager or use your one-time bite to convert them.',
    btnColor: 'bg-amber-500 hover:bg-amber-500/90',
    image: '/kitten-wolf.png',
    team: 'evil',
    ability: 'Each night, you must choose one action: Kill a villager like a regular wolf, OR use your one-time Bite ability to convert a villager to the werewolf team. You cannot do both in the same night. The bitten player loses their role and becomes a Werewolf. Once you use your bite, it is gone for the rest of the game. Choose wisely - converting a powerful role like the Seer can swing the game in your favor.',
  },
  seer: {
    color: 'text-seer-blue',
    bg: 'bg-seer-blue/10',
    border: 'border-seer-blue/30',
    title: 'Seer',
    description: 'Each night, reveal the true nature of one player. Use your visions wisely.',
    btnColor: 'bg-seer-blue hover:bg-seer-blue/90',
    image: '/seer-photoroom.png',
    team: 'village',
    ability: 'Each night, choose one player to investigate. You will learn whether they are a Werewolf or a Villager. Use this knowledge to guide the village, but be careful not to reveal yourself to the wolves.',
  },
  doctor: {
    color: 'text-doctor-green',
    bg: 'bg-doctor-green/10',
    border: 'border-doctor-green/30',
    title: 'Doctor',
    description: 'Protect one player each night from the wolves. Cannot save the same person twice in a row.',
    btnColor: 'bg-doctor-green hover:bg-doctor-green/90',
    image: '/doctor-photoroom.png',
    team: 'village',
    ability: 'Each night, choose one player to protect. If the wolves target that player, they will survive. You cannot protect the same player two nights in a row. You may protect yourself.',
  },
  gunner: {
    color: 'text-moon-gold',
    bg: 'bg-moon-gold/10',
    border: 'border-moon-gold/30',
    title: 'Gunner',
    description: 'You have 2 silver bullets. During the day, shoot anyone you suspect. Your identity is revealed when you fire.',
    btnColor: 'bg-moon-gold hover:bg-moon-gold/90',
    image: '/gunner-photoroom.png',
    team: 'village',
    ability: 'You start with 2 silver bullets. During any day phase, you can choose to shoot a player you suspect is a wolf. Your shot is immediate and kills the target. However, firing reveals your role to everyone. Use your bullets wisely.',
  },
  detective: {
    color: 'text-moon-gold',
    bg: 'bg-moon-gold/10',
    border: 'border-moon-gold/30',
    title: 'Detective',
    description: 'Each night, compare two players to learn if they are on the same team or different teams.',
    btnColor: 'bg-moon-gold hover:bg-moon-gold/90',
    image: '/detetctive-photoroom.png',
    team: 'village',
    ability: 'Each night, select two players to compare. You will learn whether they belong to the same team or different teams. This powerful ability helps you narrow down the wolves through deduction.',
  },
  shadowWolf: {
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    title: 'Shadow Wolf',
    description: 'A sinister wolf that can silence a villager each night, stealing their voice for the following day.',
    btnColor: 'bg-violet-500 hover:bg-violet-500/90',
    image: '/shadow-wolf.png',
    team: 'evil',
    ability: 'Each night, you participate in the wolf kill vote AND choose one player to silence. The silenced player cannot send messages in the village chat during the following day phase. Use this to shut down key information roles like the Seer or Detective.',
  },
  hunter: {
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    title: 'Hunter',
    description: 'A brave hunter with one last shot. When you die, take someone down with you.',
    btnColor: 'bg-orange-500 hover:bg-orange-500/90',
    image: '/hunter.png',
    team: 'village',
    ability: 'You have no special night action, but when you are killed — by wolves, village vote, or gunner — you get one final shot. Choose any alive player to take down with you. Your dying act could save or doom the village.',
  },
  jester: {
    color: 'text-fuchsia-500',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    title: 'Jester',
    description: 'The village fool with a secret agenda. Get yourself voted out to win!',
    btnColor: 'bg-fuchsia-500 hover:bg-fuchsia-500/90',
    image: '/jester.png',
    team: 'neutral',
    ability: 'You win if the village votes to eliminate you. You have no night abilities — just your wits and acting skills. Act suspicious enough to get voted out, but not so obvious that players catch on. If wolves or the gunner kill you, you lose.',
  },
  villager: {
    color: 'text-foreground',
    bg: 'bg-secondary',
    border: 'border-border',
    title: 'Villager',
    description: 'Find the wolves among you. Discuss, deduce, and vote to protect the village.',
    btnColor: 'bg-primary hover:bg-primary/90',
    image: '/villager-photoroom.png',
    team: 'village',
    ability: 'You have no special ability, but your vote is your power. Pay attention to discussions, watch for suspicious behavior, and work with other villagers to identify and eliminate the werewolves before they outnumber you.',
  },
}
