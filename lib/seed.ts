import { addDays, todayInTimeZone } from "./dates";
import { suggestSalutations } from "./people";
import type {
  ActivityPlan,
  Buyer,
  CalEvent,
  Campaign,
  Contact,
  Database,
  Deal,
  EmailTemplate,
  LetterTemplate,
  Listing,
  Task,
  Vendor,
} from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function chance(rng: () => number, p: number) {
  return rng() < p;
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

const FIRST = [
  "Aisha", "Amrita", "Ben", "Carmen", "Daniel", "Elena", "Farah", "Grace", "Hannah", "Ian",
  "Jordan", "Kenji", "Lila", "Marcus", "Omar", "Priya", "Quinn", "Rosa", "Theo", "Uma",
  "Victor", "Wen", "Yasmin", "Zoe", "Andrei", "Brooke", "Callum", "Deepa", "Ethan", "Fiona",
  "Gabriel", "Hana", "Ingrid", "Jules", "Kofi", "Leila", "Mateo", "Naomi", "Oscar", "Paige",
  "Rafael", "Sofia", "Tomas", "Valerie", "Will", "Xin", "Yara", "Amir", "Chloe", "David",
  "Emily", "Felix", "Gina", "Hiro", "Isla", "Jamal", "Kara", "Leo", "Maya", "Nico",
  "Olive", "Peter", "Ruth", "Soren", "Tara", "Wes", "Anika", "Bao", "Celeste", "Derek",
  "Esme", "Frank", "Gemma", "Hassan", "Imani", "Jonah", "Keiko", "Lars", "Mina", "Neil",
  "Orla", "Pavel", "Rina", "Sadie", "Tariq", "Vera", "Yusuf", "Zara", "Hugo", "Calvin",
];

const LAST = [
  "Adams", "Ali", "Andersen", "Archer", "Au", "Adebayo", "Brown", "Bains", "Berg", "Blake",
  "Boyd", "Campbell", "Chen", "Cho", "Clark", "Costa", "Cruz", "Dhaliwal", "Doyle", "Diaz",
  "Duncan", "Ellis", "Evans", "Engel", "Fraser", "Fischer", "Fung", "Gill", "Green", "Grant",
  "Gupta", "Hansen", "Hughes", "Ho", "Hall", "Ibrahim", "Ingram", "Johnson", "James", "Johal",
  "Kim", "Khan", "Kowalski", "Kelly", "Lee", "Lam", "Lopez", "Larsen", "MacLeod", "Martin",
  "Murphy", "Moore", "Mohamed", "Nguyen", "Nair", "Novak", "Olsen", "Owen", "Park", "Patel",
  "Peterson", "Price", "Quinn", "Reid", "Rossi", "Roy", "Rahman", "Singh", "Smith", "Stewart",
  "Santos", "Scott", "Taylor", "Thompson", "Tran", "Turner", "Underwood", "Upton", "Vargas",
  "Vogel", "Voss", "Wong", "Wilson", "Walsh", "Wright", "Xu", "Xavier", "Young", "Yamamoto",
  "Zhang", "Zimmerman",
];

const SPOUSE_FIRST = [
  "Paul", "Jon", "Adele", "Sigrid", "Alex", "Robin", "Sam", "Noor", "Chris", "Eden",
  "Micah", "Lou", "Ren", "Ari", "Jules", "Morgan", "Shane", "Pat", "Drew", "Casey",
];

const AGENTS = [
  "James Archibald",
  "Hannah Cho",
  "Marcus Hale",
  "Priya Sandhu",
  "Owen Blake",
  "Elena Vasquez",
] as const;

const GROUPS = [
  "Past client",
  "Buyer",
  "Seller",
  "Moved away",
  "VIP",
  "Investor",
  "Holiday card",
  "First-time buyer",
  "Sphere",
  "Landlord",
];

const SOURCES = [
  "Referral",
  "Past client",
  "Open house",
  "Sign call",
  "Website",
  "Social media",
  "Farm area",
  "Relocation",
  "Floor time",
  "Friend of the office",
];

const INTERESTS = [
  "Seawall walks",
  "Canucks",
  "Whitecaps",
  "Gardening",
  "Skiing at Whistler",
  "Cooking",
  "Coffee",
  "Cycling",
  "Yoga",
  "Book club",
  "Camping",
  "Farmers markets",
  "Hiking the North Shore",
  "Piano",
  "Photography",
  "Dragon boating",
];

const PETS = [
  { name: "Luna", kind: "Dog" },
  { name: "Moose", kind: "Dog" },
  { name: "Pepper", kind: "Dog" },
  { name: "Clover", kind: "Dog" },
  { name: "Miso", kind: "Cat" },
  { name: "Olive", kind: "Cat" },
  { name: "Nimbus", kind: "Cat" },
  { name: "Socks", kind: "Cat" },
  { name: "Pip", kind: "Rabbit" },
];

const KIDS = ["Maya", "Leo", "Nora", "Sam", "Ava", "Eli", "Noor", "Jack", "Hana", "Owen", "Iris", "Ben"];

const JOBS: [string, string][] = [
  ["Teacher", "Pacific Rim School"],
  ["Nurse", "North Shore Health"],
  ["Software lead", "False Creek Analytics"],
  ["Accountant", "Harbourlight Credit Union"],
  ["Chef", "Cedar & Coal Cafe"],
  ["Physiotherapist", "Kitsilano Community Centre"],
  ["Architect", "Burrard Design Co."],
  ["City planner", "Metro Vancouver"],
  ["Designer", "Stanley Workshops"],
  ["Paramedic", "BC Emergency Health"],
  ["Professor", "Harbour College"],
  ["Electrician", "Cedar Electric"],
];

const PLACES = [
  { city: "Vancouver", neighbourhood: "Kitsilano", streets: ["Yew Street", "Vine Street", "Macdonald Street", "Balaclava Street"], postal: "V6K" },
  { city: "Vancouver", neighbourhood: "Mount Pleasant", streets: ["East 12th Avenue", "Sophia Street", "Ontario Street", "Carolina Street"], postal: "V5T" },
  { city: "Vancouver", neighbourhood: "Kerrisdale", streets: ["West 41st Avenue", "Balsam Street", "Larch Street"], postal: "V6M" },
  { city: "Vancouver", neighbourhood: "Dunbar", streets: ["Dunbar Street", "West 23rd Avenue", "Collingwood Street"], postal: "V6S" },
  { city: "Vancouver", neighbourhood: "Yaletown", streets: ["Mainland Street", "Homer Street", "Pacific Boulevard"], postal: "V6B" },
  { city: "Vancouver", neighbourhood: "Commercial Drive", streets: ["Commercial Drive", "Charles Street", "Grant Street"], postal: "V5L" },
  { city: "Vancouver", neighbourhood: "Cambie", streets: ["Cambie Street", "West 16th Avenue", "Yukon Street"], postal: "V5Z" },
  { city: "North Vancouver", neighbourhood: "Lower Lonsdale", streets: ["Lonsdale Avenue", "Esplanade West", "Chesterfield Avenue"], postal: "V7M" },
  { city: "North Vancouver", neighbourhood: "Edgemont", streets: ["Edgemont Boulevard", "Ridgewood Drive"], postal: "V7R" },
  { city: "West Vancouver", neighbourhood: "Ambleside", streets: ["Marine Drive", "15th Street"], postal: "V7V" },
  { city: "Burnaby", neighbourhood: "Brentwood", streets: ["Willingdon Avenue", "Halifax Street"], postal: "V5C" },
  { city: "Burnaby", neighbourhood: "Metrotown", streets: ["Kingsway", "Wilson Avenue"], postal: "V5H" },
  { city: "Richmond", neighbourhood: "Steveston", streets: ["Steveston Highway", "No. 1 Road"], postal: "V7E" },
  { city: "New Westminster", neighbourhood: "Uptown", streets: ["Sixth Street", "Sixth Avenue"], postal: "V3L" },
  { city: "Coquitlam", neighbourhood: "Burke Mountain", streets: ["Coast Meridian Road", "David Avenue"], postal: "V3E" },
  { city: "Port Moody", neighbourhood: "Newport", streets: ["Murray Street", "Clarke Street"], postal: "V3H" },
  { city: "Surrey", neighbourhood: "Panorama", streets: ["152 Street", "Croydon Drive"], postal: "V3R" },
];

const AWAY = [
  { city: "Victoria", province: "BC", street: "Moss Street", postal: "V8V 2N4" },
  { city: "Kelowna", province: "BC", street: "Bernard Avenue", postal: "V1Y 6N2" },
  { city: "Calgary", province: "AB", street: "Kensington Road", postal: "T2N 3P5" },
  { city: "Toronto", province: "ON", street: "Ossington Avenue", postal: "M6J 2Z5" },
  { city: "Nanaimo", province: "BC", street: "Wesley Street", postal: "V9R 2T8" },
];

const NOTES = [
  "Best time to call is after 6 pm. Mornings are for school drop-off.",
  "Asked us to skip mass emails. A birthday card by mail is still welcome.",
  "Spouse prefers texts. Please do not call them at work.",
  "Referred a sibling. Send a thank-you before the next holiday.",
  "Wants a short market note each spring, nothing more.",
  "Loves the Canucks. Easy opener if you phone.",
  "Keys are with the tenant until the end of the school year.",
  "Interested in a rec property in the Okanagan in a couple of years.",
  "Closing gift was a bottle of local wine. They mentioned it twice.",
  "Do not talk price at family dinners. They will ask when they are ready.",
  "New baby in the house. Keep notes short.",
  "Moved for work and still wants the holiday card.",
];

const AREAS = ["604", "778", "236", "250", "672", "403", "587", "780", "204", "506"];

function reservedPhone(n: number) {
  const area = AREAS[Math.floor(n / 100) % AREAS.length];
  const line = 100 + (n % 100);
  return `(${area}) 555-${String(line).padStart(4, "0")}`;
}

function postal(prefix: string, rng: () => number) {
  const digit = 1 + Math.floor(rng() * 9);
  const letter = "ABCEGHJKLMNPRSTVWXYZ"[Math.floor(rng() * 20)];
  const digit2 = Math.floor(rng() * 10);
  return `${prefix} ${digit}${letter}${digit2}`;
}

function makeEmails(): EmailTemplate[] {
  const by = "Kayla";
  const sign = "\n\nWarmly,\n{{sender}}\n{{office}}\n{{brokerage}}\n{{sender_phone}}";
  const rows: [string, string, string, string, string][] = [
    ["Just sold nearby", "Just listed and just sold", "A calm note after a sale on their street.", "A sale on your street, {{first_name}}", "Hello {{first_name}},\n\nA home near {{street}} has just sold. If you want the price and what it means for your block, reply and I will send three lines, not a brochure." + sign],
    ["Just listed nearby", "Just listed and just sold", "Lets a past client know a home is for sale nearby.", "A new listing near you", "{{greeting}}\n\nSomething just came up near {{city}}. If you know anyone who is even half looking, send them our way. If you would rather we did not mention listings, say so and I will leave you off these notes." + sign],
    ["Monthly market note", "Newsletters", "A short monthly email. No ten-page PDF.", "{{city}} in a page", "{{greeting}}\n\nHere is the month in plain language: what sold, what sat, and whether buyers are writing subjects. If you want the version for your own block, tell me the cross street." + sign],
    ["First home check-in", "Newsletters", "For people who bought with the team.", "How is the first year treating you?", "{{greeting}}\n\nIt has been a while since you got the keys. The boring stuff still matters: insurance, filters, and whether the strata minutes look calm. Reply if you want us to point you to someone." + sign],
    ["Birthday note", "Greeting cards", "A personal birthday email, not a blast.", "Happy birthday, {{first_name}}", "{{greeting}}\n\nHappy birthday. No market update attached, just a note from the office. I hope the year is kind." + sign],
    ["Anniversary note", "Greeting cards", "Wedding or home anniversary.", "Thinking of you today", "{{greeting}}\n\nMarking the day here at the office. If a card in the mail would be better next year, tell me and I will switch you." + sign],
    ["Holiday card heads-up", "Greeting cards", "Warns the holiday-card group before cards go out.", "Holiday cards are going out", "{{greeting}}\n\nWe are addressing holiday cards this week. If your household has moved, or you would rather not get one, reply with the new address or a simple “skip us.”" + sign],
    ["Spring value chat", "Market updates", "An invitation, not a price promise.", "A no-pressure look at your home’s value", "{{greeting}}\n\nEvery spring a few past clients ask what the block is doing. I can send a one-page note with three recent sales. No appointment unless you want one." + sign],
    ["Buyer still renting", "Market updates", "For renters who may buy later.", "Still renting, {{first_name}}?", "{{greeting}}\n\nNo rush if the timing is wrong. If you want a clear picture of what a first purchase looks like in {{city}} this month, I can sketch the payment, the subject period, and the neighbourhoods that fit." + sign],
    ["Open house thank-you", "Office", "The day after an open house.", "Thank you for coming by", "{{greeting}}\n\nThank you for coming through. If the home was not the one, tell me what was off and I will keep it in mind. If you want a second look, name a time." + sign],
    ["Consent reminder", "Office", "A plain note about mass email.", "You can leave these notes any time", "{{greeting}}\n\nYou are on this list because you asked to hear from {{office}}. If that has changed, reply “stop” and I will take you off mass email the same day. Personal notes, like a birthday card, are separate." + sign],
    ["Referral thank-you", "Office", "After someone sends you a friend.", "Thank you for the introduction", "{{greeting}}\n\nThank you for trusting us with someone you know. I will keep you posted in general terms, and I will not share their business with anyone else." + sign],
  ];
  return rows.map((row, i) => ({
    id: `em${String(i + 1).padStart(2, "0")}`,
    name: row[0],
    category: row[1],
    description: row[2],
    subject: row[3],
    body: row[4],
    createdBy: by,
  }));
}

function makeLetters(): LetterTemplate[] {
  const sign = "\n\nWarmly,\n{{sender}}\n{{office}}\n{{brokerage}}\n{{sender_phone}} · {{sender_email}}";
  const rows: [string, string, string, string][] = [
    ["Move-in anniversary", "Anniversaries", "A paper note on the anniversary of the move.", "{{greeting}}\n\nAnother year at {{street}}. I hope the block still feels like yours.\n\nIf you ever want a quiet read on what homes nearby have been doing, I am happy to put it on one page. No appointment required." + sign],
    ["Purchase anniversary", "Anniversaries", "For the date they bought.", "{{greeting}}\n\nCongratulations on another year since you bought. I still remember how much work that week was.\n\nIf you want a fresh look at value, say the word. If you are settled and happy, that is a good outcome too." + sign],
    ["Holiday card letter", "Greeting cards", "The letter that goes inside the holiday card.", "{{greeting}}\n\nAs the year turns, thank you for trusting {{office}}. Whether we helped you move, or you are simply part of the wider circle, we are glad you are in the book.\n\nWishing your household a restful season." + sign],
    ["Neighbourhood note", "Farming", "A short letter for a farm area.", "{{greeting}}\n\nI am writing to a handful of households around {{city}}, not the whole city.\n\nTwo homes nearby have sold recently and one is about to come up. If you want the details, send a note or call {{sender_phone}}." + sign],
    ["First-time buyer letter", "Activity plans", "Goes with the renter nurture plan.", "{{greeting}}\n\nYou mentioned you might buy when the timing is kinder. This letter is the plain version: what a subject removal is, what a deposit usually looks like, and which questions to ask a mortgage broker before you tour.\n\nKeep it. There is nothing you need to do this week." + sign],
    ["Under contract, buyer", "Activity plans", "What happens before completion.", "{{greeting}}\n\nYou are under contract. Between now and completion the useful jobs are insurance, a movers quote, and reading the strata or inspection papers with a clear head.\n\nReply if you want the office checklist. We will not add you to a newsletter because of this letter." + sign],
    ["Listing check-in", "Activity plans", "A mid-listing letter to a seller.", "{{greeting}}\n\nWe are partway through the listing. The showings have told us what visitors linger on and what they skip.\n\nI would like ten minutes by phone to decide whether we hold, adjust, or change the photos. Name a time that is easy." + sign],
    ["Thank-you after closing", "Closing", "The note that follows the keys.", "{{greeting}}\n\nThe keys are yours. Thank you for letting {{office}} walk with you through it.\n\nIf anything in the house surprises you in the next month, call us before you call a stranger from the internet. We keep a short list of people we trust." + sign],
  ];
  return rows.map((row, i) => ({
    id: `lt${String(i + 1).padStart(2, "0")}`,
    name: row[0],
    category: row[1],
    description: row[2],
    body: row[3],
    enteredBy: "Kayla",
  }));
}

function makePlans(): ActivityPlan[] {
  const step = (
    day: number,
    channel: "Email" | "Letter" | "Call" | "Task",
    title: string,
    detail: string,
  ) => ({ day, channel, title, detail });
  return [
    {
      id: "plan-expired",
      name: "Expired listing check-in",
      category: "Marketing",
      description: "One month of calm follow-up after a listing expires.",
      method: "Mixed",
      steps: [
        step(0, "Call", "Ask how they want to be contacted", "Find out if they still want to sell, and how they like to hear from you."),
        step(7, "Email", "What we would do differently", "Three changes, not a pitch deck."),
        step(21, "Letter", "Leave a one-page plan", "A letter they can read without us in the room."),
        step(30, "Task", "Close the loop", "Either book a conversation or stop the plan."),
      ],
    },
    {
      id: "plan-investor",
      name: "Investor nurture",
      category: "Marketing",
      description: "A monthly rhythm for people who buy more than a home.",
      method: "Email",
      steps: [
        step(0, "Email", "What they actually buy", "Confirm building type, cities, and whether they want email at all."),
        step(14, "Email", "Two sales that match", "Send two comparable sales. Stop if they do not reply."),
        step(30, "Call", "A ten-minute check", "Ask if the criteria changed."),
      ],
    },
    {
      id: "plan-first-home",
      name: "First home nurture",
      category: "Marketing",
      description: "Six weeks for a renter who may buy.",
      method: "Mixed",
      steps: [
        step(0, "Email", "The path in plain language", "Deposit, subjects, and a realistic price band."),
        step(14, "Letter", "Questions for a mortgage broker", "A letter they can take to the appointment."),
        step(28, "Call", "See if the letter helped", "Do not book showings unless they ask."),
        step(42, "Task", "Invite to a buyer coffee", "Optional, small, no slideshow."),
      ],
    },
    {
      id: "plan-fsbo",
      name: "For-sale-by-owner check-in",
      category: "Marketing",
      description: "Respectful touches for someone selling on their own.",
      method: "Mixed",
      steps: [
        step(0, "Letter", "An offer of help, not a takeover", "Leave the door open."),
        step(10, "Call", "Ask what is working", "Listen more than you talk."),
        step(24, "Email", "What buyers asked at our last open house", "Share a pattern, not a lecture."),
        step(40, "Task", "Decide whether to keep going", "If they are firm, pause the plan."),
      ],
    },
    {
      id: "plan-fall",
      name: "Fall neighbourhood notes",
      category: "Marketing",
      description: "Two weeks of seasonal notes for a farm area.",
      method: "Email",
      steps: [
        step(0, "Email", "What sold on the block this fall", "Three sales, one paragraph each."),
        step(7, "Email", "A weekend plan for visitors", "Street parking, school, and the bakery people mention."),
        step(14, "Task", "Note who replied", "Tag anyone who wants the spring letter."),
      ],
    },
    {
      id: "plan-open-house",
      name: "Open house follow-up",
      category: "Marketing",
      description: "Two weeks after someone comes through a door.",
      method: "Email",
      steps: [
        step(0, "Email", "Thank them for coming", "Same day if you can."),
        step(2, "Call", "Ask what felt off", "Write the answer on their page."),
        step(10, "Email", "One other home that fits", "Only if you have a real match."),
      ],
    },
    {
      id: "plan-renter",
      name: "Renters who may buy",
      category: "Marketing",
      description: "A four-month plan for people who are not ready yet.",
      method: "Mixed",
      steps: [
        step(0, "Email", "No pressure, a timeline", "Ask when the lease ends."),
        step(30, "Letter", "What a mortgage conversation covers", "So the bank meeting is less mysterious."),
        step(60, "Email", "Neighbourhoods that fit a first purchase", "Three areas, with why."),
        step(100, "Call", "See if the date moved", "Update the buyer file or pause."),
      ],
    },
    {
      id: "plan-hightouch",
      name: "High-touch buyer care",
      category: "Marketing",
      description: "For a buyer who wants more contact, not more email.",
      method: "Mixed",
      steps: [
        step(0, "Call", "Agree how often to talk", "Weekly, or only when something fits."),
        step(7, "Email", "This week’s short list", "Three homes maximum."),
        step(21, "Task", "Book the next showing block", "Keep it on the calendar."),
        step(45, "Letter", "A recap they can share with family", "Budget, areas, and what they refused."),
      ],
    },
    {
      id: "plan-list-2",
      name: "New listing, two months",
      category: "Listing",
      description: "The beats of a standard listing, from photos to price check.",
      method: "Mixed",
      steps: [
        step(0, "Task", "Photos, measurements, and sign", "Confirm the date with the seller."),
        step(1, "Email", "You are live", "Send the link and the first open-house time."),
        step(7, "Call", "What the first week showed", "Feedback in their words."),
        step(21, "Email", "Showings so far", "A short recap."),
        step(45, "Task", "Price and plan check", "Hold, adjust, or refresh photos."),
      ],
    },
    {
      id: "plan-list-3",
      name: "New listing, three months",
      category: "Listing",
      description: "A longer listing for a home that may need patience.",
      method: "Mixed",
      steps: [
        step(0, "Task", "Prep list", "Declutter, pets, and a lockbox plan."),
        step(7, "Letter", "What we will report, and when", "Set the rhythm before emotions run high."),
        step(30, "Call", "Month-one conversation", "Includes a price talk if traffic is thin."),
        step(60, "Email", "A fresh photo or a new open house", "Pick one change, not five."),
        step(90, "Task", "Extend, pause, or relist", "Write the decision on the listing."),
      ],
    },
    {
      id: "plan-buyer-contract",
      name: "Buyer under contract",
      category: "Closing",
      description: "From accepted offer to keys, for the buyer side.",
      method: "Mixed",
      steps: [
        step(0, "Task", "Subject dates on the calendar", "Inspection, financing, and strata."),
        step(3, "Email", "What happens before completion", "Insurance, deposit, and movers."),
        step(10, "Call", "Utilities and keys", "Who meets them, and where."),
        step(21, "Task", "Closing gift and a review ask", "Only ask if the deal felt good."),
      ],
    },
    {
      id: "plan-list-contract",
      name: "Listing under contract",
      category: "Closing",
      description: "From accepted offer to completion, for the seller.",
      method: "Mixed",
      steps: [
        step(0, "Task", "Confirm subjects and access", "Buyers may still need a visit."),
        step(5, "Email", "What the seller still has to do", "Papers, fixtures, and a moving date."),
        step(14, "Call", "Completion week", "Keys, garage remotes, and forwarding mail."),
        step(25, "Letter", "Thank-you after the sale", "And a request for a referral, said lightly."),
      ],
    },
    {
      id: "plan-conditional",
      name: "After a conditional offer",
      category: "Closing",
      description: "The short stretch while subjects are still on.",
      method: "Mixed",
      steps: [
        step(0, "Task", "Write every subject date down", "Share it with the client the same day."),
        step(1, "Email", "Who does what", "Inspector, broker, notary."),
        step(4, "Call", "Are we on track to firm up?", "If not, say so early."),
      ],
    },
  ];
}

function makeVendors(): Vendor[] {
  const rows: [string, string, string, string, string, string, string, string[]][] = [
    ["Andre Pell", "Coastline Home Inspections", "Home inspection", "(867) 555-0102", "andre@example.com", "Vancouver", "Thorough, and he writes so clients can actually read it.", ["Inspection"]],
    ["Helen Park", "Fraser Notary", "Notary and legal", "(867) 555-0103", "helen.park@example.com", "Vancouver", "Same-week appointments if Kayla calls before noon.", ["Notary"]],
    ["Camille Frost", "Bright Room Staging", "Staging", "(867) 555-0104", "camille@example.com", "Vancouver", "Best on half-duplexes and small condos. Book two weeks out.", ["Staging"]],
    ["Nico Abebe", "Harbour Light Photos", "Photography", "(867) 555-0105", "nico@example.com", "Vancouver", "Dusk shots in Kits and the Drive. Sends files the next morning.", ["Photos"]],
    ["Sam Doyle", "Kits to Kerrisdale Movers", "Movers", "(867) 555-0106", "sam.doyle@example.com", "Vancouver", "Careful with walk-ups. Ask for the Tuesday crew.", ["Movers"]],
    ["Rosa Minh", "Sunday Clean Co.", "Cleaning", "(867) 555-0107", "rosa@example.com", "Burnaby", "Move-out cleans. Will do a fridge if you ask.", ["Cleaning"]],
    ["Tom Brennan", "Cedar Electric", "Trades", "(867) 555-0108", "tom@example.com", "Vancouver", "Panel upgrades before a sale. Licensed.", ["Electrical"]],
    ["Gail Forster", "Raincity Insurance", "Insurance", "(867) 555-0109", "gail@example.com", "North Vancouver", "Good with strata deductibles. Speaks plainly.", ["Insurance"]],
    ["Ivan Petrov", "West Side Painting", "Trades", "(867) 555-0110", "ivan@example.com", "Vancouver", "Two-day repaints before photos.", ["Painting"]],
    ["May Liu", "Garden and Gutter", "Trades", "(867) 555-0111", "may.liu@example.com", "Vancouver", "Curb cleanup the week of an open house.", ["Garden"]],
    ["Chris Donner", "Pacific Appraisal Group", "Appraisal", "(867) 555-0112", "chris@example.com", "Vancouver", "Independent appraisals when a buyer asks for one.", ["Appraisal"]],
    ["Erin Walsh", "False Creek Plumbing", "Trades", "(867) 555-0113", "erin@example.com", "Vancouver", "Will quote a sewer scope quickly.", ["Plumbing"]],
    ["Nadia Berg", "Strata Document Co.", "Notary and legal", "(867) 555-0114", "nadia@example.com", "Burnaby", "Form B packages. Tell her the strata plan number.", ["Strata"]],
    ["Paul Iqbal", "Key and Lock", "Trades", "(867) 555-0115", "paul.iqbal@example.com", "Vancouver", "Rekeys on completion day.", ["Locks"]],
    ["Lena Ortiz", "Burrard Design Renos", "Trades", "(867) 555-0116", "lena@example.com", "Vancouver", "Kitchens. Honest about timelines.", ["Renovation"]],
    ["Anita Shah", "North Arm Mortgages", "Mortgage", "(867) 555-0117", "anita.shah@example.com", "Vancouver", "First-time buyers like how she explains the stress test.", ["Mortgage"]],
    ["David Klein", "North Shore Law", "Notary and legal", "(867) 555-0118", "david.klein@example.com", "North Vancouver", "When a file needs a lawyer rather than a notary.", ["Legal"]],
    ["Owen Price", "Measure Twice Floors", "Trades", "(867) 555-0119", "owen.price@example.com", "Richmond", "Floors before photos. Not the agent Owen Blake.", ["Floors"]],
  ];
  return rows.map((row, i) => ({
    id: `v${String(i + 1).padStart(2, "0")}`,
    name: row[0],
    company: row[1],
    category: row[2],
    phone: row[3],
    email: row[4],
    city: row[5],
    notes: row[6],
    tags: row[7],
  }));
}

export function seedDatabase(now = new Date()): Database {
  const today = todayInTimeZone("America/Vancouver", now);
  const rng = mulberry32(20261021);
  const skipped = new Set([1, 144]);
  let phoneN = 0;
  const nextPhone = () => {
    while (skipped.has(phoneN)) phoneN += 1;
    const value = reservedPhone(phoneN);
    phoneN += 1;
    return value;
  };

  const used = new Set<string>();
  const pairs: { first: string; last: string }[] = [];
  let guard = 0;
  while (pairs.length < 492 && guard < 20000) {
    guard += 1;
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const key = `${first}|${last}`;
    if (used.has(key)) continue;
    used.add(key);
    pairs.push({ first, last });
  }

  const agentBag = [
    ...Array(28).fill("James Archibald"),
    ...Array(22).fill("Hannah Cho"),
    ...Array(16).fill("Marcus Hale"),
    ...Array(14).fill("Priya Sandhu"),
    ...Array(12).fill("Owen Blake"),
    ...Array(8).fill("Elena Vasquez"),
  ];

  const contacts: Contact[] = pairs.map((pair, i) => {
    const place = pick(rng, PLACES);
    const streetNo = 120 + ((i * 37) % 860);
    const street = `${streetNo} ${pick(rng, place.streets)}`;
    const typeRoll = rng();
    const type = typeRoll < 0.7 ? "Client" : typeRoll < 0.85 ? "Prospect" : typeRoll < 0.95 ? "Personal" : "B2B";
    const hasSpouse = type !== "B2B" && chance(rng, 0.62);
    const spouseFirst = hasSpouse ? pick(rng, SPOUSE_FIRST) : "";
    const spouseLast = hasSpouse ? (chance(rng, 0.2) ? pick(rng, LAST) : pair.last) : "";
    const greet = suggestSalutations({
      firstName: pair.first,
      lastName: pair.last,
      spouseFirst,
      spouseLast,
    });
    const mailRoll = rng();
    const mailPreference =
      mailRoll < 0.5 ? "Email" : mailRoll < 0.72 ? "Both" : mailRoll < 0.88 ? "Mail" : "Do not market";
    const acceptMassEmail = mailPreference !== "Do not market" && chance(rng, 0.86);
    const tags = new Set<string>();
    if (type === "Client") tags.add("Past client");
    if (type === "Personal") tags.add("Sphere");
    if (type === "Client" || type === "Prospect") {
      if (chance(rng, 0.58)) tags.add("Buyer");
      if (chance(rng, 0.34)) tags.add("Seller");
    }
    if (chance(rng, 0.09)) tags.add("VIP");
    if (chance(rng, 0.07)) tags.add("Investor");
    if (chance(rng, 0.2)) tags.add("Holiday card");
    if (chance(rng, 0.11)) tags.add("First-time buyer");
    if (chance(rng, 0.05)) tags.add("Landlord");
    const moved = type === "Client" && chance(rng, 0.07);
    let city = place.city;
    let province = "BC";
    let streetFinal = street;
    let postalCode = postal(place.postal, rng);
    if (moved) {
      const away = pick(rng, AWAY);
      city = away.city;
      province = away.province;
      streetFinal = `${80 + (i % 400)} ${away.street}`;
      postalCode = away.postal;
      tags.add("Moved away");
    }
    const birthday = chance(rng, 0.86)
      ? `${1948 + Math.floor(rng() * 50)}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`
      : "";
    const spouseBirthday =
      hasSpouse && chance(rng, 0.7)
        ? `${1952 + Math.floor(rng() * 45)}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`
        : "";
    const anniversary =
      hasSpouse && chance(rng, 0.55)
        ? `${1998 + Math.floor(rng() * 24)}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`
        : "";
    const yearsAgo = 1 + Math.floor(rng() * 14);
    const moveInDate =
      type === "Client" || chance(rng, 0.4)
        ? `${Number(today.slice(0, 4)) - yearsAgo}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`
        : "";
    const job = chance(rng, 0.55) ? pick(rng, JOBS) : null;
    const phones = [{ id: `p${i}m`, label: "Mobile", number: nextPhone() }];
    if (chance(rng, 0.42)) phones.push({ id: `p${i}h`, label: "Home", number: nextPhone() });
    if (hasSpouse && chance(rng, 0.35)) phones.push({ id: `p${i}s`, label: "Spouse mobile", number: nextPhone() });
    const emails = [
      { id: `e${i}`, label: "Personal", address: `${slug(pair.first)}.${slug(pair.last)}@example.com` },
    ];
    if (hasSpouse && chance(rng, 0.4)) {
      emails.push({
        id: `e${i}s`,
        label: "Spouse",
        address: `${slug(spouseFirst)}.${slug(spouseLast || pair.last)}@example.net`,
      });
    }
    const children = [];
    if (chance(rng, 0.28)) {
      const count = 1 + (chance(rng, 0.35) ? 1 : 0);
      for (let k = 0; k < count; k++) {
        children.push({
          name: pick(rng, KIDS),
          birthday: `${2012 + Math.floor(rng() * 12)}-${String(1 + Math.floor(rng() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`,
        });
      }
    }
    const pets = chance(rng, 0.22) ? [pick(rng, PETS)] : [];
    const interests = chance(rng, 0.74)
      ? Array.from(new Set([pick(rng, INTERESTS), pick(rng, INTERESTS), pick(rng, INTERESTS)])).slice(0, 2 + Math.floor(rng() * 2))
      : [];
    const price = place.neighbourhood === "Yaletown" || place.neighbourhood === "Coal Harbour"
      ? 700000 + Math.round(rng() * 80) * 5000
      : 900000 + Math.round(rng() * 280) * 5000;
    const properties = [];
    if (type === "Client" && chance(rng, 0.82)) {
      properties.push({
        id: `pr${i}a`,
        address: streetFinal,
        city,
        role: "Bought" as const,
        date: moveInDate || addDays(today, -400),
        price: Math.round(price / 5000) * 5000,
        mls: `R555${1000 + i}`,
      });
    }
    if (type === "Client" && chance(rng, 0.18)) {
      properties.push({
        id: `pr${i}b`,
        address: `${200 + (i % 500)} ${pick(rng, place.streets)}`,
        city: place.city,
        role: "Sold" as const,
        date: `${Number(today.slice(0, 4)) - 3 - Math.floor(rng() * 6)}-0${1 + Math.floor(rng() * 9)}-${String(10 + Math.floor(rng() * 18)).padStart(2, "0")}`,
        price: Math.round((price * 0.8) / 5000) * 5000,
        mls: `R555${2000 + i}`,
      });
    }
    const notes = [];
    if (chance(rng, 0.55)) {
      notes.push({
        id: `n${i}`,
        at: `${addDays(today, -Math.floor(rng() * 500))}T18:00:00.000Z`,
        author: chance(rng, 0.6) ? "Kayla" : pick(rng, agentBag),
        text: pick(rng, NOTES),
      });
    }
    const activities = [0, 1, 2]
      .filter(() => chance(rng, 0.75))
      .map((k) => {
        const kinds = [
          ["Call", "Checked in. No ask, just a hello."],
          ["Email", "Sent a short market note."],
          ["Visit", "Dropped a one-page update at the door."],
          ["Letter", "Mailed a card."],
        ] as const;
        const item = pick(rng, kinds);
        return {
          id: `a${i}${k}`,
          at: `${addDays(today, -Math.floor(rng() * 420))}T16:00:00.000Z`,
          kind: item[0],
          summary: item[1],
          by: "Kayla",
        };
      });
    const referrals = [];
    if (chance(rng, 0.18)) {
      referrals.push({
        id: `r${i}`,
        at: addDays(today, -Math.floor(rng() * 700)),
        name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
        side: chance(rng, 0.7) ? "They referred someone" as const : "We referred them" as const,
        kind: pick(rng, ["Buyer", "Seller", "Mortgage", "Notary"]),
        status: pick(rng, ["Thanked", "Closed", "In progress", "Did not proceed"] as const),
        notes: "Kept it personal. No mass email about the referral.",
      });
    }
    const documents = [];
    if (type === "Client" && chance(rng, 0.22)) {
      documents.push({
        id: `d${i}`,
        name: "Contract of purchase and sale.pdf",
        kind: "Contract",
        at: moveInDate || addDays(today, -200),
        note: "Sample file record only. There is no real document stored behind this name.",
      });
    }
    const workStreet = job ? `${100 + (i % 80)} ${pick(rng, place.streets)}` : "";
    return {
      id: `c${String(i + 1).padStart(4, "0")}`,
      firstName: pair.first,
      lastName: pair.last,
      spouseFirst,
      spouseLast,
      phones,
      emails,
      mailPreference: acceptMassEmail ? mailPreference : mailPreference === "Email" ? "Mail" : mailPreference,
      acceptMassEmail,
      salutation: greet.salutation,
      envelopeLine: greet.envelopeLine,
      letterGreeting: greet.letterGreeting,
      street: streetFinal,
      city,
      province,
      postal: postalCode,
      moveInDate,
      company: job?.[1] ?? "",
      jobTitle: job?.[0] ?? "",
      workStreet,
      workCity: job ? city : "",
      workPhone: job && chance(rng, 0.5) ? nextPhone() : "",
      type,
      source: pick(rng, SOURCES),
      birthday,
      spouseBirthday,
      anniversary,
      children,
      pets,
      interests,
      tags: [...tags],
      agent: pick(rng, agentBag),
      referrals,
      notes,
      documents,
      properties,
      activities,
      createdAt: `${addDays(today, -900 - (i % 400))}T15:00:00.000Z`,
      updatedAt: `${addDays(today, -(i % 40))}T15:00:00.000Z`,
    };
  });

  const setMd = (offset: number, year: number) => {
    const occ = addDays(today, offset);
    return `${year}-${occ.slice(5)}`;
  };

  const cluster: [number, () => void][] = [
    [2, () => { contacts[2].birthday = setMd(0, 1976); }],
    [3, () => { contacts[3].birthday = setMd(0, 1988); }],
    [4, () => { contacts[4].birthday = setMd(0, 1994); }],
    [5, () => { contacts[5].birthday = setMd(1, 1981); }],
    [6, () => { contacts[6].birthday = setMd(2, 1971); }],
    [7, () => { contacts[7].birthday = setMd(3, 1990); }],
    [8, () => { contacts[8].birthday = setMd(5, 1968); }],
    [9, () => { contacts[9].birthday = setMd(6, 1985); }],
    [10, () => { contacts[10].birthday = setMd(-1, 1979); }],
    [11, () => { contacts[11].birthday = setMd(-2, 1983); }],
    [12, () => { contacts[12].birthday = setMd(-5, 1966); }],
    [13, () => { contacts[13].birthday = setMd(-8, 1992); }],
    [14, () => { contacts[14].birthday = setMd(-12, 1974); }],
    [15, () => {
      contacts[15].spouseFirst = contacts[15].spouseFirst || "Alex";
      contacts[15].spouseLast = contacts[15].spouseLast || contacts[15].lastName;
      contacts[15].spouseBirthday = setMd(1, 1984);
    }],
    [16, () => {
      contacts[16].spouseFirst = contacts[16].spouseFirst || "Robin";
      contacts[16].spouseLast = contacts[16].spouseLast || contacts[16].lastName;
      contacts[16].spouseBirthday = setMd(-3, 1977);
    }],
    [17, () => {
      contacts[17].anniversary = setMd(0, 2011);
      contacts[17].spouseFirst = contacts[17].spouseFirst || "Sam";
      contacts[17].spouseLast = contacts[17].lastName;
    }],
    [18, () => {
      contacts[18].anniversary = setMd(4, 2008);
      contacts[18].spouseFirst = contacts[18].spouseFirst || "Noor";
      contacts[18].spouseLast = contacts[18].lastName;
    }],
    [19, () => {
      contacts[19].anniversary = setMd(-6, 2016);
      contacts[19].spouseFirst = contacts[19].spouseFirst || "Micah";
      contacts[19].spouseLast = contacts[19].lastName;
    }],
    [20, () => { contacts[20].moveInDate = setMd(-2, 2017); }],
    [21, () => { contacts[21].moveInDate = setMd(0, 2019); }],
    [22, () => { contacts[22].moveInDate = setMd(1, 2020); }],
    [23, () => { contacts[23].moveInDate = setMd(4, 2015); }],
    [24, () => { contacts[24].moveInDate = setMd(-9, 2014); }],
    [25, () => {
      if (!contacts[25].children.length) contacts[25].children.push({ name: "Iris", birthday: "" });
      contacts[25].children[0].birthday = setMd(2, 2016);
    }],
    [26, () => {
      if (!contacts[26].children.length) contacts[26].children.push({ name: "Eli", birthday: "" });
      contacts[26].children[0].birthday = setMd(-1, 2014);
    }],
  ];
  cluster.forEach(([, fn]) => fn());

  for (const index of [27, 28, 29, 30]) {
    const c = contacts[index];
    const when = setMd(index === 27 ? 0 : index === 28 ? 3 : index === 29 ? -4 : 6, 2018);
    if (!c.properties.length) {
      c.properties.push({
        id: `pr${index}f`,
        address: c.street,
        city: c.city,
        role: "Bought",
        date: when,
        price: 1250000,
        mls: `R555${3000 + index}`,
      });
    } else {
      c.properties[0].role = "Bought";
      c.properties[0].date = when;
    }
    if (c.moveInDate.slice(5) === when.slice(5)) {
      c.moveInDate = setMd(index + 10, 2016);
    }
  }

  const nora = contacts[0];
  nora.firstName = "Nora";
  nora.lastName = "Ellison";
  nora.spouseFirst = "Paul";
  nora.spouseLast = "Ellison";
  nora.emails = [{ id: "e-nora", label: "Personal", address: "nora.ellison@example.com" }];
  nora.phones = [
    { id: "p-nora", label: "Mobile", number: reservedPhone(1) },
  ];
  nora.street = "1842 Yew Street";
  nora.city = "Vancouver";
  nora.province = "BC";
  nora.postal = "V6K 3E2";
  nora.birthday = setMd(2, 1984);
  nora.anniversary = setMd(5, 2012);
  nora.moveInDate = setMd(-3, 2018);
  nora.company = "";
  nora.jobTitle = "";
  nora.workStreet = "";
  nora.workCity = "";
  nora.workPhone = "";
  nora.type = "Client";
  nora.source = "Referral";
  nora.agent = "Hannah Cho";
  nora.tags = ["Past client", "VIP", "Holiday card", "Buyer"];
  nora.acceptMassEmail = true;
  nora.mailPreference = "Both";
  nora.interests = ["Seawall walks", "Cooking", "Canucks"];
  nora.pets = [{ name: "Luna", kind: "Dog" }];
  nora.children = [{ name: "Maya", birthday: setMd(6, 2015) }];
  Object.assign(nora, suggestSalutations(nora));
  nora.notes = [
    {
      id: "n-nora",
      at: `${addDays(today, -12)}T19:00:00.000Z`,
      author: "Kayla",
      text: "Sister in Burnaby may look next spring. Nora prefers a call after 6. Do not add the sister until Nora introduces her.",
    },
  ];
  nora.properties = [
    {
      id: "pr-nora",
      address: "1842 Yew Street",
      city: "Vancouver",
      role: "Bought",
      date: setMd(8, 2018),
      price: 1465000,
      mls: "R5550101",
    },
  ];
  nora.referrals = [
    {
      id: "r-nora",
      at: addDays(today, -40),
      name: "Claire Ellison",
      side: "They referred someone",
      kind: "Buyer",
      status: "In progress",
      notes: "Burnaby. Not in the book yet.",
    },
  ];
  nora.documents = [
    {
      id: "d-nora",
      name: "Contract of purchase and sale.pdf",
      kind: "Contract",
      at: "2018-09-14",
      note: "Sample file record only. There is no real PDF stored here.",
    },
  ];

  const samir = contacts[1];
  samir.firstName = "Samir";
  samir.lastName = "Qureshi";
  samir.spouseFirst = "";
  samir.spouseLast = "";
  samir.emails = [{ id: "e-samir", label: "Personal", address: "samir.qureshi@example.com" }];
  samir.phones = [{ id: "p-samir", label: "Mobile", number: reservedPhone(144) }];
  samir.street = "903 Lonsdale Avenue";
  samir.city = "North Vancouver";
  samir.province = "BC";
  samir.postal = "V7M 2J3";
  samir.birthday = setMd(-4, 1979);
  samir.spouseBirthday = "";
  samir.anniversary = "";
  samir.moveInDate = setMd(6, 2016);
  samir.company = "";
  samir.jobTitle = "";
  samir.type = "Client";
  samir.source = "Open house";
  samir.agent = "Marcus Hale";
  samir.tags = ["Past client", "Buyer", "Holiday card"];
  samir.acceptMassEmail = true;
  samir.mailPreference = "Mail";
  samir.interests = ["Hiking the North Shore", "Coffee"];
  samir.pets = [];
  samir.children = [];
  Object.assign(samir, suggestSalutations(samir));
  samir.notes = [
    {
      id: "n-samir",
      at: `${addDays(today, -20)}T17:00:00.000Z`,
      author: "Marcus Hale",
      text: "Likes a paper birthday card. He will read email, but cards make him answer.",
    },
  ];
  samir.properties = [
    {
      id: "pr-samir",
      address: "903 Lonsdale Avenue",
      city: "North Vancouver",
      role: "Bought",
      date: "2016-08-20",
      price: 899000,
      mls: "R5550144",
    },
  ];

  const blocked = new Set([
    "nora ellison",
    "samir qureshi",
    "lila okada",
    "hugo brennan",
    "mina chowdhury",
    "peter nielsen",
    "ruth abebe",
    "calvin frost",
  ]);
  for (const c of contacts) {
    if (c.id === nora.id || c.id === samir.id) continue;
    if (blocked.has(`${c.firstName} ${c.lastName}`.toLowerCase())) {
      c.lastName = `${c.lastName}e`;
      if (c.emails[0]) c.emails[0].address = `${slug(c.firstName)}.${slug(c.lastName)}@example.com`;
    }
    const hit = c.emails.find((e) => e.address === "nora.ellison@example.com" || e.address === "samir.qureshi@example.com");
    if (hit) hit.address = `${slug(c.firstName)}.${slug(c.lastName)}.office@example.com`;
  }
  const seenEmail = new Set<string>();
  for (const c of contacts) {
    for (const email of c.emails) {
      const [local, domain] = email.address.toLowerCase().split("@");
      let addr = `${local}@${domain}`;
      let n = 2;
      while (seenEmail.has(addr)) {
        addr = `${local}${n}@${domain}`;
        n += 1;
      }
      email.address = addr;
      seenEmail.add(addr);
    }
  }

  const byId = (n: number) => contacts[n]?.id ?? "";

  const tasks: Task[] = [
    ["Call Nora about her sister in Burnaby", 0, byId(0), false, "Call", "After 6 pm. Do not email the sister."],
    ["Mail Samir’s birthday card", -2, byId(1), false, "To-do", "He prefers paper. Card is in the drawer."],
    ["Order holiday card proofs", 3, "", false, "Paperwork", "Use the holiday card group, not the whole book."],
    ["Send strata package to Fraser Notary", -1, byId(4), false, "Paperwork", "Plan number is on the listing notes."],
    ["Confirm Sunday open house signs", 1, byId(6), false, "Showing", "Signs live in the office cupboard."],
    ["Thank-you note for last week’s referral", -6, byId(8), false, "Email", "Keep it to four lines."],
    ["Book photos with Harbour Light", 2, byId(9), false, "To-do", "Dusk if the weather holds."],
    ["Update a moved-away address", -3, byId(40), false, "To-do", "Holiday card will bounce otherwise."],
    ["Prep the Monday team huddle list", 0, "", false, "To-do", "Overdue reminders, two listings, one firm deal."],
    ["Call the mortgage broker for a first-time buyer", 4, byId(11), false, "Call", "Anita Shah at North Arm."],
    ["File the inspection for the conditional deal", -1, byId(12), false, "Paperwork", "Buyer has questions on the roof."],
    ["Check in with a paused buyer", 8, byId(14), false, "Call", "Lease ends in March."],
    ["Print labels for Mother’s Day drafts", 14, "", true, "To-do", "Done early so we are not rushing in May."],
    ["Return the lockbox from last week", -4, byId(18), true, "To-do", "Back on the shelf."],
  ].map((row, i) => ({
    id: `t${String(i + 1).padStart(2, "0")}`,
    title: row[0] as string,
    due: addDays(today, row[1] as number),
    contactId: row[2] as string,
    done: row[3] as boolean,
    kind: row[4] as Task["kind"],
    notes: row[5] as string,
  }));

  const events: CalEvent[] = [
    ["Team huddle", 0, "09:00", "", "Office", "Ten minutes on overdue touches and live deals."],
    ["Listing photos, Yew Street", 1, "16:30", byId(9), "Appointment", "Seller will crate the dog."],
    ["Buyer tour, Mount Pleasant", 2, "13:00", byId(11), "Showing", "Two homes. Budget under $950,000."],
    ["Open house", 4, "14:00", byId(6), "Open house", "1 to 3 pm. Signs out by noon."],
    ["Notary signing", 6, "11:00", byId(4), "Appointment", "Fraser Notary. Bring two pieces of ID reminder."],
    ["Vendor coffee with Anita Shah", 8, "10:00", "", "Office", "First-time buyer process, not a pitch."],
    ["Subject removal check", -1, "15:30", byId(12), "Appointment", "Financing still outstanding."],
    ["Floor time", 3, "12:00", "", "Office", "Kayla covers the phone from noon to two."],
    ["Cambie showing", 9, "17:30", byId(20), "Showing", "After work."],
    ["Holiday card stuffing", 16, "14:00", "", "Office", "Only if proofs are approved."],
  ].map((row, i) => ({
    id: `ev${String(i + 1).padStart(2, "0")}`,
    title: row[0] as string,
    date: addDays(today, row[1] as number),
    time: row[2] as string,
    contactId: row[3] as string,
    kind: row[4] as CalEvent["kind"],
    notes: row[5] as string,
  }));

  const seller = (n: number) => contacts.find((c, i) => i > 30 && c.tags.includes("Seller") && c.city === "Vancouver") ?? contacts[n];
  const sellers = contacts.filter((c, i) => i > 30 && c.tags.includes("Seller")).slice(0, 8);
  const listingRows: [string, string, string, Listing["status"], number, number, number, string, string, number, number, string][] = [
    ["1888 Yew Street", "Vancouver", "Kitsilano", "Active", 1898000, 3, 2, "Half-duplex", "Hannah Cho", -18, 40, "Offers looked at on Sundays. Easy to show after 5."],
    ["2100 Scotia Street", "Vancouver", "Mount Pleasant", "Active", 948000, 2, 2, "Condo", "James Archibald", -9, 50, "Strata allows a small dog. Parking included."],
    ["6408 Balsam Street", "Vancouver", "Kerrisdale", "Coming soon", 2680000, 4, 3, "Detached", "Priya Sandhu", 4, 70, "Photos next week. Seller is travelling until Thursday."],
    ["1550 Chesterfield Avenue", "North Vancouver", "Lower Lonsdale", "Conditionally sold", 1125000, 2, 2, "Condo", "Marcus Hale", -30, 20, "Financing subject. Removal date is on the calendar."],
    ["418 Sixth Street", "New Westminster", "Uptown", "Active", 799000, 2, 1, "Condo", "Owen Blake", -40, 15, "Price was adjusted once. Foot traffic is steady."],
    ["88 Murray Street", "Port Moody", "Newport", "Pending", 1390000, 3, 2, "Townhome", "Elena Vasquez", -22, 30, "Waiting on strata documents."],
    ["3312 West 23rd Avenue", "Vancouver", "Dunbar", "Active", 2410000, 5, 3, "Detached", "James Archibald", -6, 55, "Family home. Open house this weekend."],
  ];
  const listings: Listing[] = listingRows.map((row, i) => ({
    id: `ls${i + 1}`,
    address: row[0],
    city: row[1],
    neighbourhood: row[2],
    status: row[3] as Listing["status"],
    price: row[4] as number,
    beds: row[5] as number,
    baths: row[6] as number,
    propertyType: row[7] as string,
    agent: row[8] as string,
    listDate: addDays(today, row[9] as number),
    expires: addDays(today, row[10] as number),
    contactId: sellers[i]?.id || seller(i).id,
    notes: row[11] as string,
  }));

  const buyerPool = contacts.filter((c, i) => i > 10 && (c.tags.includes("Buyer") || c.type === "Prospect")).slice(0, 6);
  const buyerRows: [Buyer["status"], string, string, string, string, boolean, string][] = [
    ["Looking", "Mount Pleasant or Cambie", "Up to $950,000", "2 bedrooms", "James Archibald", true, "Lease ends in April. Will write if the strata looks calm."],
    ["Offered", "Kitsilano", "Up to $1,400,000", "3 bedrooms", "Hannah Cho", true, "Lost one offer. Wants a half-duplex more than a condo."],
    ["Under contract", "Lower Lonsdale", "Up to $1,150,000", "2 bedrooms", "Marcus Hale", true, "Conditional on financing. See the calendar."],
    ["Looking", "Steveston", "Up to $1,200,000", "3 bedrooms", "Priya Sandhu", false, "Not pre-approved yet. Anita Shah has their name."],
    ["Paused", "East Vancouver", "Up to $800,000", "2 bedrooms", "Owen Blake", false, "Paused until the new year. Do not book showings."],
    ["Looking", "Port Moody", "Up to $1,350,000", "Townhome", "Elena Vasquez", true, "Needs a yard for the dog."],
  ];
  const buyers: Buyer[] = buyerRows.map((row, i) => ({
    id: `b${i + 1}`,
    contactId: buyerPool[i]?.id || contacts[20 + i].id,
    status: row[0] as Buyer["status"],
    areas: row[1],
    budget: row[2],
    beds: row[3],
    agent: row[4],
    preapproved: row[5] as boolean,
    notes: row[6],
  }));

  const dealRows: [string, string, Deal["side"], number, Deal["status"], number, string, string][] = [
    ["1550 Chesterfield Avenue", "North Vancouver", "Buyer", 1125000, "Conditional", 11, "Marcus Hale", "Financing subject still open."],
    ["88 Murray Street", "Port Moody", "Seller", 1390000, "Firm", 18, "Elena Vasquez", "Firm last week. Notary is booked."],
    ["1842 Yew Street", "Vancouver", "Buyer", 1465000, "Closed", -2400, "Hannah Cho", "Nora and Paul. Kept as history."],
    ["903 Lonsdale Avenue", "North Vancouver", "Buyer", 899000, "Closed", -1800, "Marcus Hale", "Samir’s purchase."],
    ["12 Vine Street", "Vancouver", "Seller", 1720000, "Closed", -40, "Hannah Cho", "Smooth completion."],
    ["900 Homer Street", "Vancouver", "Buyer", 780000, "Closed", -70, "James Archibald", "First home. They still rent the locker."],
    ["410 Sixth Avenue", "New Westminster", "Both", 690000, "Closed", -15, "Owen Blake", "Double ended. Be careful with notes."],
    ["2200 Kingsway", "Burnaby", "Seller", 859000, "Fell through", -25, "Priya Sandhu", "Inspection. Seller decided not to repair."],
    ["77 Dunbar Street", "Vancouver", "Buyer", 2100000, "Closed", -120, "James Archibald", "Long subject period. Closed on time."],
    ["50 Esplanade West", "North Vancouver", "Seller", 1010000, "Firm", 6, "Marcus Hale", "Keys on completion morning."],
    ["1601 Ontario Street", "Vancouver", "Buyer", 925000, "Closed", -200, "Elena Vasquez", "Referral from a past client."],
    ["8 Marine Drive", "West Vancouver", "Seller", 3100000, "Conditional", 20, "Priya Sandhu", "Large deposit. Subjects are light."],
  ];
  const dealPeople = contacts.filter((c) => c.type === "Client").slice(0, 12);
  const deals: Deal[] = dealRows.map((row, i) => ({
    id: `dl${i + 1}`,
    address: row[0],
    city: row[1],
    side: row[2] as Deal["side"],
    price: row[3] as number,
    status: row[4] as Deal["status"],
    closeDate: addDays(today, row[5] as number),
    agent: row[6] as string,
    contactIds: [dealPeople[i]?.id || nora.id].filter(Boolean),
    notes: row[7] as string,
  }));
  deals[2].contactIds = [nora.id];
  deals[3].contactIds = [samir.id];

  const plans = makePlans();
  const enrollments = [
    { planId: "plan-first-home", contact: 5, step: 1, due: 0 },
    { planId: "plan-open-house", contact: 8, step: 0, due: -1 },
    { planId: "plan-list-2", contact: 9, step: 2, due: 2 },
    { planId: "plan-buyer-contract", contact: 12, step: 1, due: 0 },
    { planId: "plan-renter", contact: 20, step: 0, due: 5 },
    { planId: "plan-hightouch", contact: 11, step: 1, due: -2 },
    { planId: "plan-fall", contact: 22, step: 2, due: 3 },
    { planId: "plan-conditional", contact: 4, step: 1, due: 1 },
  ].map((row, i) => ({
    id: `en${i + 1}`,
    planId: row.planId,
    contactId: contacts[row.contact].id,
    startedAt: addDays(today, -14),
    stepIndex: row.step,
    nextDue: addDays(today, row.due),
    status: "Running" as const,
  }));

  const holidayIds = contacts.filter((c) => c.tags.includes("Holiday card") && c.acceptMassEmail).slice(0, 80).map((c) => c.id);
  const campaigns: Campaign[] = [
    {
      id: "cp1",
      name: "September market note",
      templateId: "em03",
      subject: "A short note on the month",
      body: makeEmails()[2].body,
      audienceLabel: "Holiday card group, people who accept mass email",
      recipientIds: holidayIds,
      status: "Sent",
      createdAt: `${addDays(today, -32)}T15:00:00.000Z`,
      sentAt: `${addDays(today, -30)}T15:00:00.000Z`,
    },
    {
      id: "cp2",
      name: "Holiday card heads-up",
      templateId: "em07",
      subject: "Holiday cards are going out",
      body: makeEmails()[6].body,
      audienceLabel: "Holiday card group",
      recipientIds: holidayIds.slice(0, 40),
      status: "Draft",
      createdAt: `${addDays(today, -2)}T15:00:00.000Z`,
      sentAt: "",
    },
  ];
  for (const id of holidayIds.slice(0, 40)) {
    const c = contacts.find((p) => p.id === id);
    if (!c) continue;
    c.activities.push({
      id: `camp-${c.id}`,
      at: campaigns[0].sentAt,
      kind: "Campaign",
      summary: "Mass email: September market note",
      by: "Kayla",
    });
  }

  return {
    version: 1,
    settings: {
      officeName: "Archibald Real Estate Group",
      brokerage: "RE/MAX Crest Realty",
      city: "Vancouver",
      userName: "Kayla",
      role: "Operations Coordinator",
      phone: "(604) 555-0190",
      email: "kayla@example.com",
      timezone: "America/Vancouver",
      showWelcome: true,
      seededOn: today,
      agents: [...AGENTS],
      groups: [...GROUPS],
    },
    contacts,
    tasks,
    events,
    touches: [],
    emailTemplates: makeEmails(),
    campaigns,
    letterTemplates: makeLetters(),
    plans,
    enrollments,
    listings,
    buyers,
    deals,
    vendors: makeVendors(),
  };
}
