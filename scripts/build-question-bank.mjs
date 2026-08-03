import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
const output = process.argv[3] || "data/question-bank.json";
if (!input) throw new Error("Usage: node scripts/build-question-bank.mjs <grand-quiz.txt> [output.json]");

const dynamic = /\b(depuis|actuel|actuelle|aujourd|désormais|en ce moment|président|présidente|ministre|maire|mari|époux|épouse|compagnon|compagne|petit ami|petite amie|classement|record du monde|animateur|animatrice)\b/i;
const volatile = /\b(combien (?:de |d’)?(?:films|épisodes|saisons|albums|médailles|sélections|victoires|titres)|taux d['’]alcool|population|nombre d['’]habitants|cours de l['’]or|record|détient le titre)\b/i;
const categories = [
  ["Cinéma", ["film", "acteur", "actrice", "réalis", "cinéma", "oscar", "césar", "comédien", "comédienne"]],
  ["Musique", ["chante", "chanson", "album", "groupe", "musicien", "musique", "rappeur", "compositeur", "instrument"]],
  ["Gaming", ["jeu vidéo", "console", "nintendo", "playstation", "xbox", "sega", "pokémon", "mario"]],
  ["Disney", ["disney", "mickey", "donald", "pixar", "princesse", "blanche-neige", "cendrillon"]],
  ["Marvel", ["marvel", "spider-man", "x-men", "avengers", "hulk", "iron man"]],
  ["Années 90/2000", ["années 90", "années 2000", "en 199", "en 200", "1990", "2000"]],
  ["Téléréalité", ["téléréalité", "star academy", "loft story", "secret story", "koh-lanta"]],
  ["YouTube/Twitch", ["youtube", "twitch", "youtubeur", "streamer", "internet", "web"]],
  ["Netflix/Séries", ["série", "télévision", "feuilleton", "sitcom", "friends", "netflix"]],
  ["Cuisine", ["cuisine", "plat", "recette", "fromage", "fruit", "légume", "dessert", "vin ", "boisson", "aliment", "gastronomie"]],
  ["Géographie", ["capitale", "pays", "ville", "fleuve", "montagne", "océan", "mer ", "île", "continent"]],
  ["Histoire", ["roi ", "reine ", "guerre", "siècle", "révolution", "empereur", "bataille", "histor"]],
  ["Sciences", ["science", "chim", "phys", "planète", "animal", "corps humain", "médec", "biolog", "géométr", "nombre"]],
  ["Littérature", ["écrivain", "auteur", "roman", "poète", "livre", "pièce de", "littér"]],
  ["Sport", ["sport", "football", "tennis", "cycl", "olymp", "champion", "rugby", "golf"]],
];
const quotas = { "Cinéma": 180, "Musique": 180, "Géographie": 130, "Sciences": 120, "Littérature": 80, "Sport": 110, "Histoire": 70, "Netflix/Séries": 70, "Cuisine": 70, "Disney": 35, "Années 90/2000": 57, "Culture générale": 45 };

const modern = [
  ["Gaming","Dans quelle saga trouve-t-on le royaume d’Hyrule ?",["Final Fantasy","Minecraft","The Legend of Zelda","Pokémon"],2],
  ["Gaming","Quel studio a créé la série Mario ?",["Sega","Nintendo","Sony","Capcom"],1],
  ["Gaming","Quel hérisson bleu est la mascotte de Sega ?",["Crash","Sonic","Spyro","Rayman"],1],
  ["Gaming","Dans Minecraft, quel monstre vert explose près du joueur ?",["Zombie","Creeper","Enderman","Slime"],1],
  ["Gaming","Quelle créature jaune accompagne Sacha dans Pokémon ?",["Kirby","Pikachu","Sonic","Yoshi"],1],
  ["Gaming","Dans Les Sims, comment s’appelle la monnaie ?",["Clochettes","Simflouz","Crédits","Rubis"],1],
  ["Gaming","Quel jeu de Battle Royale est développé par Epic Games ?",["Fortnite","Valorant","Overwatch","Apex Legends"],0],
  ["Gaming","Dans quelle saga incarne-t-on souvent l’Assassin face aux Templiers ?",["Far Cry","Assassin’s Creed","Uncharted","Watch Dogs"],1],
  ["Gaming","Quel plombier moustachu porte généralement une casquette rouge ?",["Luigi","Wario","Mario","Toad"],2],
  ["Gaming","Quelle console portable de Nintendo possède deux écrans ?",["PSP","Nintendo DS","Game Gear","Switch Lite"],1],
  ["Marvel","Quel héros Marvel utilise un bouclier en vibranium ?",["Thor","Iron Man","Captain America","Hawkeye"],2],
  ["Marvel","Quel est le véritable nom d’Iron Man ?",["Bruce Banner","Tony Stark","Steve Rogers","Peter Parker"],1],
  ["Marvel","Quel héros devient vert lorsqu’il se transforme ?",["Hulk","Thor","Loki","Vision"],0],
  ["Marvel","De quel métal sont faites les griffes de Wolverine ?",["Vibranium","Adamantium","Titane","Uru"],1],
  ["Marvel","Quel personnage Marvel est le dieu nordique du tonnerre ?",["Loki","Thor","Odin","Heimdall"],1],
  ["Marvel","Quel est le prénom de la sœur de T’Challa dans Black Panther ?",["Nakia","Okoye","Shuri","Ramonda"],2],
  ["Marvel","Quel super-héros est aussi Peter Parker ?",["Daredevil","Spider-Man","Ant-Man","Star-Lord"],1],
  ["Marvel","Quelle Pierre d’Infinité se trouve sur le front de Vision ?",["Temps","Espace","Esprit","Réalité"],2],
  ["Marvel","Quel groupe réunit notamment Iron Man, Thor et Captain America ?",["Les Éternels","Les Avengers","Les Gardiens","Les Défenseurs"],1],
  ["Marvel","Quel ennemi cherche à réunir les Pierres d’Infinité ?",["Ultron","Thanos","Ronan","Red Skull"],1],
  ["YouTube/Twitch","Quelle entreprise possède la plateforme Twitch ?",["Amazon","Apple","Microsoft","Meta"],0],
  ["YouTube/Twitch","Comment appelle-t-on une diffusion vidéo réalisée en direct sur Internet ?",["Un podcast","Un stream","Un thread","Un vlog"],1],
  ["YouTube/Twitch","Quel bouton de YouTube permet de suivre régulièrement une chaîne ?",["S’abonner","Archiver","Épingler","Héberger"],0],
  ["YouTube/Twitch","Quel terme désigne une courte vidéo verticale publiée sur YouTube ?",["Story","Short","Clip","Snap"],1],
  ["YouTube/Twitch","Sur Twitch, comment appelle-t-on la personne qui diffuse en direct ?",["Un streamer","Un monteur","Un moddeur","Un podcasteur"],0],
  ["YouTube/Twitch","Quel accessoire permet à un créateur de capter sa voix ?",["Un routeur","Un microphone","Un projecteur","Un stabilisateur"],1],
  ["YouTube/Twitch","Que signifie le V de VOD ?",["Virtual","Video","Visual","Verified"],1],
  ["YouTube/Twitch","Comment appelle-t-on la miniature d’une vidéo YouTube ?",["Une vignette","Un calque","Un bandeau","Une story"],0],
  ["Téléréalité","Dans quelle émission des aventuriers participent-ils à des épreuves sur une île ?",["The Voice","Koh-Lanta","Top Chef","Pékin Express"],1],
  ["Téléréalité","Dans quelle émission des candidats vivent-ils dans une maison en protégeant un secret ?",["Secret Story","Loft Story","Star Academy","Les Traîtres"],0],
  ["Téléréalité","Quelle émission française met en compétition de jeunes chanteurs dans un château ?",["Nouvelle Star","Star Academy","Popstars","The Artist"],1],
  ["Téléréalité","Quelle émission de rencontre se déroule autour de prétendants et d’agriculteurs ?",["Mariés au premier regard","L’amour est dans le pré","Bachelor","Love Island"],1],
  ["Téléréalité","Dans quelle émission culinaire des cuisiniers professionnels s’affrontent-ils ?",["Top Chef","Le Meilleur Pâtissier","Cauchemar en cuisine","Objectif Top Chef"],0],
  ["Téléréalité","Quelle émission enfermait des candidats dans un loft filmé en permanence ?",["Loft Story","Koh-Lanta","Popstars","Dilemme"],0],
  ["Téléréalité","Dans quelle émission des célébrités doivent-elles démasquer des traîtres ?",["Fort Boyard","Les Traîtres","Mask Singer","District Z"],1],
  ["Netflix/Séries","Dans Stranger Things, comment se nomme la ville des héros ?",["Hawkins","Riverdale","Sunnydale","Hill Valley"],0],
  ["Netflix/Séries","Quelle série suit un groupe de braqueurs portant des combinaisons rouges ?",["Lupin","La Casa de Papel","Ozark","Narcos"],1],
  ["Netflix/Séries","Dans Mercredi, quel est le nom de famille de l’héroïne ?",["Munster","Addams","Spellman","Hargreeves"],1],
  ["Netflix/Séries","Quelle série met en scène la famille royale britannique au fil des décennies ?",["The Crown","Bridgerton","The Royals","Victoria"],0],
  ["Netflix/Séries","Dans Squid Game, de quel pays vient la série ?",["Japon","Corée du Sud","Chine","Thaïlande"],1],
  ["Netflix/Séries","Quel gentleman cambrioleur inspire la série française Lupin ?",["Arsène Lupin","Fantômas","Vidocq","Rouletabille"],0],
  ["Netflix/Séries","Dans Friends, comment s’appelle le café fréquenté par les personnages ?",["Central Perk","Monk’s Café","Luke’s","Café Nervosa"],0],
  ["Netflix/Séries","Quelle famille possède des pouvoirs dans Umbrella Academy ?",["Les Shelby","Les Hargreeves","Les Addams","Les Bridgerton"],1],
  ["Netflix/Séries","Quelle série suit le professeur de chimie Walter White ?",["Dexter","Breaking Bad","Better Call Saul","Ozark"],1],
  ["Netflix/Séries","Dans Bridgerton, quelle chroniqueuse anonyme commente la haute société ?",["Lady Whistledown","Lady Danbury","Violet Bridgerton","La reine Charlotte"],0],
  ["Gaming","Quel studio est à l’origine de la série The Last of Us ?",["Naughty Dog","Ubisoft","Rockstar Games","Bethesda"],0],
  ["Gaming","Dans Animal Crossing, quel animal est Tom Nook ?",["Un renard","Un tanuki","Un chat","Un hibou"],1],
  ["Gaming","Quel personnage de Nintendo est le frère de Mario ?",["Wario","Luigi","Yoshi","Toad"],1],
  ["Gaming","Dans quel jeu construit-on avec des briques cubiques ?",["Minecraft","Fall Guys","Rocket League","Splatoon"],0],
  ["Marvel","Quel acteur incarne Iron Man dans l’univers cinématographique Marvel ?",["Chris Evans","Robert Downey Jr.","Chris Hemsworth","Mark Ruffalo"],1],
  ["Marvel","Quel personnage est le frère adoptif de Thor ?",["Loki","Thanos","Vision","Bucky"],0],
  ["Marvel","Quelle héroïne Marvel se nomme Carol Danvers ?",["Black Widow","Captain Marvel","Wasp","Gamora"],1],
  ["Marvel","Quel héros Marvel peut rétrécir grâce à des particules Pym ?",["Ant-Man","Falcon","Hawkeye","Daredevil"],0],
  ["YouTube/Twitch","Quel métier consiste notamment à assembler les plans d’une vidéo ?",["Monteur vidéo","Streamer","Modérateur","Community manager"],0],
  ["YouTube/Twitch","Sur Twitch, quel rôle aide à faire respecter les règles du chat ?",["Modérateur","Monteur","Abonné","Spectateur"],0],
  ["YouTube/Twitch","Comment appelle-t-on une vidéo racontant une journée ou une expérience personnelle ?",["Un vlog","Un trailer","Un tutoriel","Un podcast"],0],
  ["YouTube/Twitch","Quel indicateur compte le nombre de fois qu’une vidéo a été regardée ?",["Les vues","Les tags","Les onglets","Les calques"],0],
  ["Téléréalité","Dans quelle émission des voyageurs font-ils la course avec un budget très limité ?",["Pékin Express","Koh-Lanta","The Voice","Top Chef"],0],
  ["Téléréalité","Quelle émission demande à des célébrités de chanter sous un costume ?",["Mask Singer","Danse avec les stars","Les Traîtres","Dream Team"],0],
  ["Téléréalité","Dans quelle émission des couples se rencontrent-ils pour la première fois à leur mariage ?",["Mariés au premier regard","Love Island","Bachelor","L’amour est dans le pré"],0],
  ["Netflix/Séries","Quel métier exerce le personnage principal de The Witcher ?",["Sorcier","Sorceleur","Chevalier","Alchimiste"],1],
  ["Netflix/Séries","Dans La Casa de Papel, quel nom de ville porte le chef des braqueurs sur le terrain ?",["Berlin","Denver","Oslo","Helsinki"],0],
  ["Netflix/Séries","Quelle série met en scène les frères Michael Scofield et Lincoln Burrows ?",["Prison Break","Lost","Heroes","Dexter"],0],
  ["Netflix/Séries","Dans quelle série rencontre-t-on les familles Stark et Lannister ?",["Vikings","Game of Thrones","The Witcher","The Last Kingdom"],1],
];

const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hash = value => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
const curatedPools = {
  person: ["Jean Reno","Catherine Deneuve","Alain Delon","Marion Cotillard","Jean Dujardin","Bénabar","Vanessa Paradis","Brad Pitt","Meryl Streep","Tom Hanks","Jodie Foster","Johnny Depp","Audrey Tautou","Louis de Funès","Sophie Marceau","Victor Hugo","Émile Zola","Marie Curie","Louis Pasteur","Napoléon Bonaparte","Charles de Gaulle","Pablo Picasso","Claude Monet","Mozart","Édith Piaf","David Bowie","Tina Turner","Steven Spielberg","Alfred Hitchcock","Agatha Christie"],
  place: ["Paris","Londres","Rome","Madrid","Berlin","New York","Tokyo","Le Canada","Le Brésil","Le Japon","L’Australie","L’Italie","L’Espagne","La Grèce","L’Inde","L’Égypte","La Belgique","La Suisse","L’Argentine","Le Mexique","L’océan Atlantique","L’océan Pacifique","La mer Méditerranée","Les Alpes","La Corse"],
  number: ["0","1","2","3","4","5","6","7","8","9","10","12","15","20","24","30","50","100","365","1 000","1789","1914","1945","1969","1998","2000"],
  title: ["Titanic","Le Parrain","Les Dents de la mer","Friends","Le Cluedo","La Joconde","Carmen","Hamlet","Germinal","Le Petit Prince","Imagine","Thriller","Bohemian Rhapsody","Star Wars","Harry Potter","Le Seigneur des anneaux","Pulp Fiction","Le Roi Lion","La Boum","Intouchables","The Crown","Breaking Bad","La Casa de Papel","Koh-Lanta"],
  animal: ["Le chien","Le chat","Le cheval","Le lion","Le tigre","L’éléphant","La girafe","Le dauphin","La baleine","Le requin","Le crocodile","Le serpent","L’aigle","Le hibou","Le perroquet","Le manchot","Le kangourou","Le panda","Le loup","Le renard","La chèvre","Le bœuf","Le cochon","Le lapin","La tortue"],
  sport: ["Le football","Le rugby","Le tennis","Le cyclisme","La natation","L’athlétisme","L’escrime","Le basket-ball","Le handball","Le golf","Le ski","Le judo","La boxe","Le volley-ball","Le patinage artistique","La gymnastique","L’aviron","Le hockey sur glace","Le badminton","L’équitation"],
  food: ["La pomme","La tomate","La carotte","La pomme de terre","Le chocolat","La vanille","Le fromage","Le riz","Les pâtes","Le bœuf","Le poulet","Le saumon","Le citron","La fraise","L’avocat","Le pois chiche","La mozzarella","Le mascarpone","Le café","Le thé","Le vin","Le pain","L’œuf","Le miel"],
  color: ["Rouge","Bleu","Vert","Jaune","Orange","Violet","Rose","Noir","Blanc","Gris","Marron","Doré","Argenté","Beige","Turquoise"],
  name: ["Arthur","Camille","Alexandre","Charlotte","Victor","Juliette","Nemo","Mannix","Central Perk","La Méduse","Scotland Yard","Gontran","Valmont","Perceval","Mufasa","Simba","Olaf","Buzz","Mario","Sonic","Pikachu","Hawkins","Hyrule","Gotham","Springfield","Sherlock Holmes","Arsène Lupin","Peter Parker","Tony Stark","Walter White"],
  profession: ["Médecin","Avocat","Professeur","Barbier","Architecte","Journaliste","Écrivain","Peintre","Acteur","Chanteur","Réalisateur","Cuisinier","Boulanger","Astronaute","Policier","Pompier","Dentiste","Pharmacien","Vétérinaire","Ingénieur"],
  language: ["Le français","L’anglais","L’espagnol","L’italien","L’allemand","Le portugais","Le japonais","Le chinois","L’arabe","Le russe","Le latin","Le grec"],
  body: ["Le cœur","Le cerveau","Le foie","Le rein","Le poumon","L’estomac","Le fémur","Le tibia","Le crâne","La peau","La bouche","Le nez","L’oreille","La main","Le pied"],
  game: ["Le Cluedo","Le Monopoly","Le Scrabble","Les échecs","Les dames","Le poker","Le flipper","Pyramide","Mario Kart","Minecraft","Fortnite","Pokémon","The Legend of Zelda","Les Sims","Sonic"],
  organization: ["L’ONU","L’UNESCO","L’Union européenne","La FIFA","Le CIO","La NASA","Nintendo","Disney","Marvel","Netflix","Amazon","Microsoft","Sony","La Croix-Rouge","L’OTAN"],
  city: ["Paris","Londres","Rome","Madrid","Berlin","New York","Tokyo","Lisbonne","Bruxelles","Vienne","Athènes","Dublin","Oslo","Stockholm","Prague","Budapest","Montréal","Sydney","Le Caire","Moscou"],
  country: ["La France","L’Espagne","L’Italie","L’Allemagne","Le Portugal","La Belgique","La Suisse","L’Autriche","La Grèce","Le Canada","Le Brésil","Le Japon","L’Australie","L’Inde","L’Égypte","L’Argentine","Le Mexique","La Norvège","La Suède","Le Maroc"],
  fruit: ["La pomme","La poire","La prune","La pêche","L’abricot","La cerise","La fraise","La framboise","Le raisin","Le kiwi","La mangue","L’ananas","L’orange","Le citron","Le melon","La pastèque"],
  vegetable: ["La carotte","La courgette","L’aubergine","Le poireau","Le navet","Le chou-fleur","Le brocoli","L’épinard","Le radis","La betterave","Le céleri","Le fenouil"],
  meat: ["Le bœuf","Le veau","Le porc","L’agneau","Le poulet","La dinde","Le canard","Le lapin","Le gibier","Le mouton"],
  cheese: ["Le camembert","Le roquefort","Le comté","Le brie","Le reblochon","Le chèvre","La mozzarella","Le parmesan","Le gouda","Le munster"],
  drink: ["L’eau","Le café","Le thé","Le vin","La bière","Le cidre","Le jus d’orange","La limonade","Le lait","Le chocolat chaud"],
};
const answerType = q => {
  if (/\b(quelle année|en quelle année|à quelle date|de quel siècle)\b/i.test(q)) return "year";
  if (/\b(quel âge|à quel âge)\b/i.test(q)) return "age";
  if (/\b(combien|quel numéro)\b/i.test(q)) return "number";
  if (/\b(quel chanteur|quelle chanteuse|quel musicien|quelle musicienne|quel interprète|quelle interprète|qui (?:chante|interprète)|l['’]interprète de)\b/i.test(q)) return "singer";
  if (/\b(quel acteur|quelle actrice|quel comédien|quelle comédienne|qui (?:joue|incarne)|interprété par|incarné(?:e)? par)\b/i.test(q)) return "actor";
  if (/\b(quel écrivain|quelle écrivaine|quel auteur|quelle auteure|quel poète|quelle poétesse|qui (?:a écrit|écrivit))\b/i.test(q)) return "writer";
  if (/\b(quel réalisateur|quelle réalisatrice|qui (?:a réalisé|réalisa))\b/i.test(q)) return "director";
  if (/\b(quel personnage historique|quel homme politique|quelle femme politique|quel scientifique|quelle scientifique)\b/i.test(q)) return "person";
  if (/\b(quelle ville|quelle capitale|dans quelle ville)\b/i.test(q)) return "city";
  if (/\b(quel pays|dans quel pays|de quel pays)\b/i.test(q)) return "country";
  if (/\b(quel continent|quelle île|quel océan|quelle mer|quel fleuve|dans quel état|dans quelle région|où se trouve|où est situé)\b/i.test(q)) return "place";
  if (/\b(quel film|dans quel film)\b/i.test(q)) return "film";
  if (/\b(quelle série|dans quelle série|quel feuilleton)\b/i.test(q)) return "series";
  if (/\b(quelle chanson|quel album|quel morceau)\b/i.test(q)) return "song";
  if (/\b(quel livre|quel roman|quelle œuvre littéraire|quelle pièce)\b/i.test(q)) return "book";
  if (/\b(quelle émission|quel jeu télévisé)\b/i.test(q)) return "show";
  if (/\b(quel opéra|quel titre|quel dessin animé)\b/i.test(q)) return "title";
  if (/\b(quel animal|quelle race|quel oiseau|quel poisson|quel insecte|quel mammifère)\b/i.test(q)) return "animal";
  if (/\b(quel sport|quelle discipline|dans quel sport)\b/i.test(q)) return "sport";
  if (/\b(quel fruit|de quel fruit)\b/i.test(q)) return "fruit";
  if (/\b(quel légume|de quel légume)\b/i.test(q)) return "vegetable";
  if (/\b(quel fromage|de quel fromage)\b/i.test(q)) return "cheese";
  if (/\b(quelle boisson|quel vin|quelle bière)\b/i.test(q)) return "drink";
  if (/\b(quelle viande|de quel animal mangez-vous la viande)\b/i.test(q)) return "meat";
  if (/\b(quel plat|quel aliment|quel dessert|quel ingrédient)\b/i.test(q)) return "food";
  if (/\b(de quelle couleur|quelle couleur)\b/i.test(q)) return "color";
  if (/\b(quel prénom|quelle prénom)\b/i.test(q)) return "name";
  if (/\b(quelle profession|quel métier)\b/i.test(q)) return "profession";
  if (/\b(quelle langue|quel langage)\b/i.test(q)) return "language";
  if (/\b(quelle partie du corps|quel organe|quel os|quel muscle)\b/i.test(q)) return "body";
  if (/\b(quel jeu|quel jeu de société|quelle console)\b/i.test(q)) return "game";
  if (/\b(quel groupe|quelle équipe|quel club|quelle organisation|quel parti|quelle entreprise)\b/i.test(q)) return "organization";
  return "other";
};

const rows = [];
for (const raw of fs.readFileSync(input, "utf8").split(/\r?\n/)) {
  const line = raw.replace("\f", "").trim();
  if (!line || line.startsWith("QUESTION") || line.startsWith("REPONSE")) continue;
  const parts = line.split(/\s{2,}/, 2);
  if (parts.length !== 2 || !parts[0].includes("?") || !parts[1].trim()) continue;
  const [question, answer] = parts.map(value => value.trim());
  if (dynamic.test(question) || volatile.test(question) || answer.length > 70 || answer.includes("/") || question.length > 180) continue;
  const haystack = `${question} ${answer}`.toLowerCase();
  const category = categories.find(([, words]) => words.some(word => haystack.includes(word)))?.[0] || "Culture générale";
  const type = answerType(question);
  if (type === "other") continue;
  rows.push({ question, answer, category, type });
}

const seen = new Set();
const selected = [];
for (const [category, quota] of Object.entries(quotas)) {
  const candidates = rows.filter(row => row.category === category).sort((a,b) => hash(a.question) - hash(b.question));
  for (const row of candidates) {
    const key = normalize(row.question);
    if (seen.has(key)) continue;
    seen.add(key); selected.push(row);
    if (selected.filter(item => item.category === category).length >= quota) break;
  }
}

const pools = new Map();
for (const row of rows) {
  const key = `${row.category}:${row.type}`;
  if (!pools.has(key)) pools.set(key, []);
  if (!pools.get(key).some(value => normalize(value) === normalize(row.answer))) pools.get(key).push(row.answer);
}
const globalPools = new Map();
for (const row of rows) {
  if (!globalPools.has(row.type)) globalPools.set(row.type, []);
  if (!globalPools.get(row.type).some(value => normalize(value) === normalize(row.answer))) globalPools.get(row.type).push(row.answer);
}

const numericDistractors = row => {
  const match = row.answer.match(/-?\d[\d\s]*/);
  if (!match) return null;
  const value = Number(match[0].replace(/\s/g, ""));
  if (!Number.isFinite(value)) return null;
  const startsWithNumber = (match.index || 0) === 0;
  const suffix = startsWithNumber ? row.answer.slice(match[0].length).trim() : "";
  const format = n => `${n.toLocaleString("fr-FR")}${suffix ? ` ${suffix}` : ""}`;
  const candidates = row.type === "year"
    ? [value - 10, value - 1, value + 1, value + 10]
    : row.type === "age"
      ? [Math.max(0, value - 4), Math.max(0, value - 2), value + 2, value + 4]
      : [Math.max(0, value - 2), Math.max(0, value - 1), value + 1, value + 2, value * 2, value + 3];
  return [...new Set(candidates)].filter(n => n !== value).map(format);
};

const pdfQuestions = selected.map((row, index) => {
  const broadType = ({ singer: "person", actor: "person", writer: "person", director: "person", film: "title", series: "title", song: "title", book: "title", show: "title", year: "number", age: "number", fruit: "food", vegetable: "food", meat: "food", cheese: "food", drink: "food" })[row.type] || row.type;
  const cleanPool = curatedPools[row.type];
  const pool = numericDistractors(row) || cleanPool || (pools.get(`${row.category}:${row.type}`)?.length >= 4
    ? pools.get(`${row.category}:${row.type}`)
    : globalPools.get(row.type)?.length >= 4
      ? globalPools.get(row.type)
      : curatedPools[broadType] || []);
  const distractors = pool.filter(value => normalize(value) !== normalize(row.answer)).sort((a,b) => hash(`${row.question}${a}`) - hash(`${row.question}${b}`)).slice(0,3);
  const choices = [...distractors, row.answer].sort((a,b) => hash(`${row.question}:${a}`) - hash(`${row.question}:${b}`));
  return { id: `archive-${String(index+1).padStart(4,"0")}`, question: row.question, choices, answer: choices.indexOf(row.answer), category: row.category, difficulty: index % 7 === 0 ? "hard" : index % 3 === 0 ? "easy" : "medium", origin: "Le Grand Quiz - dB Animation", review: "stable-filtered" };
});
const modernQuestions = modern.map(([category, question, choices, answer], index) => ({ id: `modern-${String(index+1).padStart(3,"0")}`, question, choices, answer, category, difficulty: index % 4 === 0 ? "easy" : "medium", origin: "Le Dernier Neurone", review: "editorial" }));
const bank = [...pdfQuestions, ...modernQuestions].sort((a,b) => hash(a.question) - hash(b.question)).slice(0,1000);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(bank, null, 2)}\n`);
console.log(`Generated ${bank.length} questions in ${output}`);
