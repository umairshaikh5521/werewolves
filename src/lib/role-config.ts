export interface RoleInfo {
  color: string
  bg: string
  border: string
  title: string
  description: string
  btnColor: string
  image: string
  team: 'village' | 'evil'
  ability: string
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
    description: 'A young werewolf with a special gift. Once per game, bite a villager to convert them to your pack.',
    btnColor: 'bg-amber-500 hover:bg-amber-500/90',
    image: '/werewolf-photoroom.png',
    team: 'evil',
    ability: 'During the night, you can choose to use your Bite ability instead of voting to kill. The bitten player loses their role and becomes a Werewolf, joining your team. You can only use this ability ONCE per game. When you bite, no kill happens that night. Choose wisely - converting a powerful role like the Seer can swing the game in your favor.',
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
