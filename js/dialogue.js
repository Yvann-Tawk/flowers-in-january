// ═══════════════════════════════════════════════════════════════
//  DIALOGUE — every line for this slice, verbatim from docs/DIALOGUE.md
//  A string is one dialogue box: "Speaker: text" or "> narration".
//  An object is an action that runs after the box before it:
//    {give:item} {take:item} {flower:n} {swap:prop} {reveal:spot} {flag:name} {minigame:name}
//  {placeholders} are filled in at runtime (see story/*.js).
// ═══════════════════════════════════════════════════════════════

// The note (bible, approved; three pages)
const NOTE = [
  "Jana, I woke before you. I couldn't stay. Not today. Don't come looking for me. Come looking for the flowers.",
  "I've left twenty-four of them out there for you. Some are with friends. Some are hidden. A few you'll have to win. The animals left early too. You'll find them. Gilmour will be asleep, Phoebe will be loud about it, Calabar will be watching before you see him, and Spike will be the only one who's nice to you.",
  "Keep this note. You'll need it more than you think. The gate at the bottom of the garden has always been locked. It's waiting for something only the two of us know. All my love, Eevie",
];

const DLG = {
  // ── GARDEN ──────────────────────────────────────────────────
  garden: {
    bridge_block: [
      "> Not yet.",
      "> There's a note on the table. She should read it first.",
    ],
    first_outside: [
      "> The garden is quiet.",
      "> No barking. Nobody underfoot. No black cat watching from the hedge.",
      "> The animals are gone.",
    ],
    gate_first: [
      "> The gate at the bottom of the garden. Locked, like always.",
      "> Three little brass windows: DAY. MONTH. YEAR.",
      "> And above them, four empty sockets.",
    ],
    gate_repeat: [
      "> Four sockets. You have {n}.",
    ],
    gate_tbc: [
      "> Two signs. Two still out there.",
    ],
    gate_tbc_card: "To be continued.",
    forest_locked: [
      "> Cold air drifts down this path. Snowflakes. In June.",
      "> ...The note said the animals left early. Somewhere warmer first.",
    ],
    sign_beach: ["> → Nowhere Beach"],
    sign_forest: ["> → The forest. (Bring a scarf.)"],
  },

  // ── NOWHERE BEACH ───────────────────────────────────────────
  beach: {
    arrival: [
      "> Salt air. Gulls somewhere. The sand is still cool.",
      "> He was here. She can feel it.",
    ],
    beach_A: {
      first: [
        "Fisherman: Mornin'. You're standing where the fish like to look.",
        "Fisherman: Rod's on the post if you want it. They don't bite for me anymore. Might bite for you.",
      ],
      request: ["Fisherman: Catch me one fish. Any fish. Then we'll talk."],
      hint: [
        ["Fisherman: Right there at the water's edge. Cast, wait for the tug."],
        ["Fisherman: Stand at the edge, press E, and when the line jumps, press it again. That's all fishing is. Waiting and then panicking."],
      ],
      done: [
        "Fisherman: Well, look at that. First one this week.",
        "Fisherman: Your fella was out here before the tide. Didn't fish. Just stood there grinning at the water.",
        "Fisherman: Washed up at dawn. Bottle's no use to me.", { give: 'bottle' },
        "Fisherman: And this was tucked in my bait tin. Not mine. Pretty sure it's yours.", { flower: 1 },
      ],
      after: ["Fisherman: That stall? Never been open. Not once."],
    },
    beach_B: {
      first: [
        "Kid: Don't step on the moat! It took forever.",
        "Kid: It's got a tower, and a moat, and a flag. The flag's the best part.",
        "Kid: He helped with the tower! He said it needed a flag. Then he gave me the flag.",
        "Kid: He said if a lady with a note came by, the flag was hers. So... here.", { flower: 2 }, { swap: 'sandcastle' },
        "Kid: And you can have a shell. I've got, like, a hundred.", { give: 'shell' },
      ],
      after: ["Kid: The guinea pig keeps asking for shade. I'm busy. I'm an architect."],
    },
    beach_C: {
      first: ["Guinea pig: Oh! Hello. Sorry. I'm sunbathing. Well, I was. Now I'm just... hot."],
      request: ["Guinea pig: If I had something to put over my head... a shell, maybe..."],
      hint: [
        ["Guinea pig: The kid by the sandcastle has shells. Lots of shells. Too many, frankly."],
        ["Guinea pig: The sandcastle. Bottom right, by the water. A shell, please. I'm wilting."],
      ],
      done: [
        { take: 'shell' },
        "Guinea pig: Oh, that's perfect. Thank you. Thank you.",
        "Guinea pig: He nearly stepped on me. Apologised four times.",
        "Guinea pig: He left this with me. I've been guarding it. Lying on it, mostly.", { flower: 3 },
        "Guinea pig: If you want to know where he went, ask the owl on the lifeguard tower. She sees everything. She'll tell you so herself.",
        { flag: 'owl_unlocked' },
      ],
      after: ["Guinea pig: Ask the owl. Sorry. I already said that. Sorry."],
    },
    beach_D: {
      before: ["Owl: Hoo. I see everything. Not that anyone asks."],
      first: [
        "Owl: Hoo. The guinea pig sent you. Good. Nobody ever asks.",
        "Owl: Saw him bury something. I see everything. Borrowed these to be sure.",
        "Owl: Take them back to the bottle collector, would you? West rocks. She can't see without them. That's my fault.", { give: 'glasses' },
        "Owl: He dug by the pale sand. West, before the river.", { reveal: 'dig_owl' },
      ],
      hint: [
        ["Owl: The pale sand. West side, just above the water."],
        ["Owl: Left of the left bridge. Pale patch. Dig. I'd do it myself, but feathers."],
      ],
      dig: [
        "> You dig where the owl said. Under the sand: a flower, wrapped in paper so the sand wouldn't get in.", { flower: 4 },
      ],
      after: ["Owl: Hoo. Told you."],
    },
    beach_E: {
      first: [
        "Collector: Careful on the rocks. I'd warn you sooner, but I can't see you. Somebody borrowed my glasses.",
        "Collector: I collect bottles. The ones the sea brings back. Some of them have letters in them.",
      ],
      request: ["Collector: Bring me my glasses, and a bottle if you find one. I'll make it worth the walk."],
      hint_none: ["Collector: The fisherman finds more bottles than fish. And that owl was very interested in my face yesterday."],
      hint_one: ["Collector: One down. The {missing}... I'd ask the {ask}."],
      done: [
        { take: 'bottle' }, { take: 'glasses' },
        "Collector: My glasses! Oh, the world has edges again.",
        "Collector: And a bottle. Let's see...",
        "Collector: He asked me if bottles ever reach the people they're meant for. Well, this one did. He said you'd know what it is.", { give: 'keychain' },
        "Collector: He left this with me too.", { flower: 5 },
      ],
      after: ["Collector: That dog's been running laps all morning. She went very quiet when she saw you coming."],
    },
    stall_sign: ["> BACK IN AN HOUR.", "> It has been at least an hour."],
    bean_bag_sit: ["> You sink into one of the bean bags.", "> The other one's empty."],
    phoebe: {
      without: [
        "> Phoebe looks at you. Looks at the sea. Very deliberately does not look at you.",
        "> She wags. Then remembers she isn't supposed to, and stops.",
      ],
      with: [
        { take: 'keychain' }, { flag: 'phoebe_challenge' },
        "Phoebe: Oh — you found it. Okay. Okay. He said you would.",
        "Phoebe: But I'm not making it easy. Those were the rules! He said!",
        "Phoebe: Catch me if you can!!", { minigame: 'whack' },
      ],
      retry: ["Phoebe: Again! Again! I wasn't even trying."],
      win: [
        "Phoebe: Okay, okay, OKAY. You win.",
        "Phoebe: It was planned. All of it. He made me promise to make you work for it.",
        "Phoebe: He was so happy this morning. Tail-wagging happy. And he doesn't even have a tail.",
        { flower: 6 }, { give: 'fragment_phoebe' },
        "Phoebe: That's my sign. Don't lose it.",
        "Phoebe: Gilmour went somewhere cold. Back through the garden. He'll be asleep. He's always asleep.",
        { flag: 'phoebe_won' },
      ],
      after: ["Phoebe: Go on! The cold path! Through the garden!"],
    },
  },

  // ── SNOWY FOREST ────────────────────────────────────────────
  forest: {
    arrival: [
      "> Snow. Real snow, crunching under her shoes.",
      "> Somewhere a chimney is going. The air smells like woodsmoke.",
    ],
    forest_A: {
      first: [
        "Ice fisher: Shh. They can hear you thinking.",
        "Ice fisher: You can use the other hole. I dug two. Optimism.",
      ],
      request: ["Ice fisher: Catch something. Anything. Prove it can be done."],
      hint: [
        ["Ice fisher: The other hole, a few steps up the ice."],
        ["Ice fisher: Stand by the empty hole, press E, and wait. Longer than that. Then pull."],
      ],
      done: [
        "Ice fisher: Hm. You're better at this than he was.",
        "Ice fisher: Sat right there for an hour. Didn't catch a thing. Didn't seem to mind.",
        "Ice fisher: Keep the fish. The cabin keeper's been cooking for nobody all morning.", { give: 'fish' },
        "Ice fisher: And this was frozen into my bucket lid. Took ten minutes to chip out. Careful with it.", { flower: 7 },
      ],
      after: ["Ice fisher: Shh."],
    },
    forest_B: {
      first: [
        "Kid: Do you like him? His name is Mister Snow. He's very handsome.",
        "Kid: He threw a snowball at me. Then apologised. Then threw another one.",
        "Kid: He gave Mister Snow a flower for his coat. But Mister Snow says it's for you.", { flower: 8 },
        "Kid: And... the horse keeps staring at Mister Snow's nose. You can have it. Don't tell Mister Snow.", { give: 'carrot' }, { swap: 'snowman' },
      ],
      after: ["Kid: Mister Snow says he can smell fine without it."],
    },
    forest_C: {
      first: ["Horse: Oh, a person. A person who might have food. I haven't eaten in... minutes. Minutes!"],
      request: ["Horse: Anything crunchy. Orange, ideally."],
      hint: [
        ["Horse: That snowman has been taunting me all morning."],
        ["Horse: The kid by the snowman. The NOSE. Please."],
      ],
      done: [
        { take: 'carrot' },
        "Horse: Oh. Oh, that's the good stuff.",
        "Horse: He gave me half his sandwich. The good half.",
        "Horse: He tucked this in my mane. I didn't eat it. You're welcome.", { flower: 9 },
        "Horse: Want to know where he went? Ask the sheep by the lake. She notices things. I notice food.",
        { flag: 'sheep_unlocked' },
      ],
      after: ["Horse: Ask the sheep. And if you see another carrot..."],
    },
    forest_D: {
      before: ["Sheep: Baa. Lovely morning. Cold. Lovely."],
      first: [
        "Sheep: The horse sent you. He thinks I'm nosy. I'm observant.",
        "Sheep: He stood by the water a long time. Talking to himself. Practising something.",
        "Sheep: Then he went south, to the big drift by the fence, and left something under it. I watched.", { reveal: 'dig_drift' },
      ],
      hint: [
        ["Sheep: South. The drift by the fence."],
        ["Sheep: Bottom edge, below the lake. The drift in the middle. Brush the snow away."],
      ],
      dig: [
        "> You brush the snowdrift away. Underneath: a bundle of dry kindling tied with string, and a flower.", { give: 'kindling' }, { flower: 10 },
      ],
      after: ["Sheep: Baa. Told the horse you'd find it."],
    },
    forest_E: {
      first: [
        "Keeper: Come in out of the cold. Well. Out of the cold-ish.",
        "Keeper: Mind the table. Actually, you don't have to. Look at it.",
      ],
      request: ["Keeper: I'd make you something warm, but I've no firewood and nothing to cook. A fish and some kindling and I'm in business."],
      hint_none: ["Keeper: The ice fisher has more fish than sense. And the sheep sees where everyone hides things."],
      hint_one: ["Keeper: Halfway to breakfast. Now the {missing}."],
      done: [
        { take: 'fish' }, { take: 'kindling' },
        "Keeper: Now that's a breakfast.",
        "Keeper: Your fella did that this morning. Every corner. Wouldn't say why. Then he left this for you.", { give: 'bandaid' },
        "Keeper: And this. He said it belonged by the table.", { flower: 11 },
      ],
      after: ["Keeper: Gilmour's been asleep by the snow angels since dawn. Snoring. Loudly."],
    },
    padded_table: [
      "> Every corner of the table is wrapped in soft cloth, tied with red string.",
      "> Nobody's hitting their head on this table.",
    ],
    angels_lie: [
      "> Two snow angels, side by side. One is half snowed over.",
      "> She lies down beside them.",
      "> There's room.",
    ],
    gilmour: {
      without: [
        "> Gilmour is asleep.",
        "> He rolls over. Away from you. On purpose.",
        "> A very small snore.",
      ],
      with: [
        { take: 'bandaid' }, { flag: 'gilmour_awake' },
        "Gilmour: (opens one eye) …He said you'd bring that. Ugh. Fine. I'm up.",
        "Gilmour: Race me. Down the hill. I'll be lying down. I'm lying down anyway.", { minigame: 'sled' },
      ],
      retry: ["Gilmour: Zzz... again? ...fine."],
      win: [
        "Gilmour: You won. I'm choosing to be proud of you instead of embarrassed.",
        "Gilmour: Something small. Kept checking it was still there.",
        "Gilmour: Patted his pocket every five minutes. Like it was going to run off.",
        { flower: 12 }, { give: 'fragment_gilmour' },
        "Gilmour: My sign. Keep it with the loud one's.",
        "Gilmour: The rest is further than I'm walking today. Go home. The gate's been waiting.",
        { flag: 'gilmour_won' },
      ],
      after: ["> Gilmour is asleep again. Somehow, he looks pleased."],
    },
  },
};
