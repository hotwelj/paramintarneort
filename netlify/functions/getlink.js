const TOKEN_SECRETO = "ort-piratas-xK92mNq7pL3wZ";

// Links reales de descarga — nunca aparecen en el HTML
const LINKS = {
  "papers-please":          "https://github.com/hotwelj/juegos-ort/releases/download/Papers-Please/papers.please.zip",
  "no-im-not-human":        "https://github.com/hotwelj/juegos-ort/releases/download/No-im-not-human/No_im_not_human.zip",
  "fnaf-into-the-pit":      "https://github.com/hotwelj/juegos-ort/releases/download/FNAF-into-the-pit/FNAF.into.the.pit.zip",
  "balatro":                "https://github.com/hotwelj/juegos-ort/releases/download/Balatro/Balatro.zip",
  "geometry-dash":          "https://github.com/hotwelj/juegos-ort/releases/download/Geometry-dash/Geometry.dash.zip",
  "plantas-vs-zombies":     "https://github.com/hotwelj/juegos-ort/releases/download/Plantas-VS-Zombies/Plantas.VS.Zombies.zip",
  "cookie-clicker":         "https://github.com/hotwelj/juegos-ort/releases/download/Cookie-clicker/Cookie.Clicker.zip",
  "undertale":              "https://github.com/hotwelj/juegos-ort/releases/download/Undertale/Undertale.zip",
  "berry-burry-berry":      "https://github.com/hotwelj/juegos-ort/releases/download/Berry-Burry-Berry/Berry.Bury.Berry.v2026.02.06.zip",
  "i-am-bread":             "https://github.com/hotwelj/juegos-ort/releases/download/I-Am-Bread/I.Am.Bread.Incl.GoatBread.zip",
  "particul":               "https://github.com/hotwelj/juegos-ort/releases/download/Particul/Particul.Build.21967676.zip",
  "simpsons-hit-and-run":   "https://github.com/hotwelj/juegos-ort/releases/download/The-Simpsons-Hit-%26-Run/The.Simpsons.Hit.and.Run.zip",
  "henry-stickmin":         "https://github.com/hotwelj/juegos-ort/releases/download/The-Henry-Stickmin-Collection/The.Henry.Stickmin.Collection.v2020.08.12.zip",
  "hollow-knight":          "https://github.com/hotwelj/juegos-ort/releases/download/Hollow-Knight/Hollow.Knight.v1.5.12620.zip",
  "untitled-goose-game":    "https://github.com/hotwelj/juegos-ort/releases/download/Untitled-Goose-Game/Untitled.Goose.Game.v1.1.4.zip",
  "buckshot-roulette":      "https://github.com/hotwelj/juegos-ort/releases/download/Buckshot-Roulette/Buckshot.Roulette.v2.2.0.zip",
  "scritchy-scratchy":      "https://github.com/hotwelj/juegos-ort/releases/download/Scritchy-Scratchy/Scritchy.Scratchy.zip",
  "do-not-feed-the-monkeys":"https://github.com/hotwelj/juegosort/releases/download/Do-Not-Feed-The-Monkeys/DoNotfeedtheMonkeys.zip",
  "fnaf-1":                 "https://github.com/hotwelj/juegosort/releases/download/FNAF-1/Five.Nights.at.Freddys.v1.132.zip",
  "fnaf-2":                 "https://github.com/hotwelj/juegosort/releases/download/FNAF-2/Five.Nights.at.Freddys.2.v1.033.zip",
  "fnaf-3":                 "https://github.com/hotwelj/juegosort/releases/download/FNAF-3/Five.Nights.at.Freddys.3.v1.032.zip",
  "plague-inc":             "https://github.com/hotwelj/juegosort/releases/download/Plague-Inc/Plague.Inc.Evolved.v1.23.0.12.ALL.DLC.zip",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { token, juego } = JSON.parse(event.body);

    if (token !== TOKEN_SECRETO) {
      return { statusCode: 401, body: JSON.stringify({ ok: false }) };
    }

    const url = LINKS[juego];
    if (!url) {
      return { statusCode: 404, body: JSON.stringify({ ok: false }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, url }),
    };
  } catch {
    return { statusCode: 400, body: "Bad request" };
  }
};
