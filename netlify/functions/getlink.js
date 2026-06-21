const TOKEN_SECRETO = "ort-piratas-xK92mNq7pL3wZ";

// ── LINKS ──
const LINKS = {
  "papers-please":          "https://github.com/hotwelj/paramintarneort/releases/download/Papers-Please/papers.please.zip",
  "no-im-not-human":        "https://github.com/hotwelj/paramintarneort/releases/download/No-im-not-human/No_im_not_human.zip",
  "fnaf-into-the-pit":      "https://github.com/hotwelj/paramintarneort/releases/download/FNAF-into-the-pit/FNAF.into.the.pit.zip",
  "balatro":                "https://github.com/hotwelj/paramintarneort/releases/download/Balatro/Balatro.zip",
  "geometry-dash":          "https://github.com/hotwelj/paramintarneort/releases/download/Geometry-dash/Geometry.dash.zip",
  "plantas-vs-zombies":     "https://github.com/hotwelj/paramintarneort/releases/download/Plantas-VS-Zombies/Plantas.VS.Zombies.zip",
  "cookie-clicker":         "https://github.com/hotwelj/paramintarneort/releases/download/Cookie-clicker/Cookie.Clicker.zip",
  "undertale":              "https://github.com/hotwelj/paramintarneort/releases/download/Undertale/Undertale.zip",
  "berry-burry-berry":      "https://github.com/hotwelj/paramintarneort/releases/download/Berry-Burry-Berry/Berry.Bury.Berry.v2026.02.06.zip",
  "i-am-bread":             "https://github.com/hotwelj/paramintarneort/releases/download/I-Am-Bread/I.Am.Bread.Incl.GoatBread.zip",
  "particul":               "https://github.com/hotwelj/paramintarneort/releases/download/Particul/Particul.Build.21967676.zip",
  "simpsons-hit-and-run":   "https://github.com/hotwelj/paramintarneort/releases/download/The-Simpsons-Hit-%26-Run/The.Simpsons.Hit.and.Run.zip",
  "henry-stickmin":         "https://github.com/hotwelj/paramintarneort/releases/download/The-Henry-Stickmin-Collection/The.Henry.Stickmin.Collection.v2020.08.12.zip",
  "hollow-knight":          "https://github.com/hotwelj/paramintarneort/releases/download/Hollow-Knight/Hollow.Knight.v1.5.12620.zip",
  "untitled-goose-game":    "https://github.com/hotwelj/paramintarneort/releases/download/Untitled-Goose-Game/Untitled.Goose.Game.v1.1.4.zip",
  "buckshot-roulette":      "https://github.com/hotwelj/paramintarneort/releases/download/Buckshot-Roulette/Buckshot.Roulette.v2.2.0.zip",
  "scritchy-scratchy":      "https://github.com/hotwelj/paramintarneort/releases/download/Scritchy-Scratchy/Scritchy.Scratchy.zip",
  "do-not-feed-the-monkeys":"https://github.com/hotwelj/paramintarneort/releases/download/Do-Not-Feed-The-Monkeys/DoNotfeedtheMonkeys.zip",
  "fnaf-1":                 "https://github.com/hotwelj/paramintarneort/releases/download/FNAF-1/Five.Nights.at.Freddys.v1.132.zip",
  "fnaf-2":                 "https://github.com/hotwelj/paramintarneort/releases/download/FNAF-2/Five.Nights.at.Freddys.2.v1.033.zip",
  "fnaf-3":                 "https://github.com/hotwelj/paramintarneort/releases/download/FNAF-3/Five.Nights.at.Freddys.3.v1.032.zip",
  "plague-inc":             "https://github.com/hotwelj/paramintarneort/releases/download/Plague-Inc/Plague.Inc.Evolved.v1.23.0.12.ALL.DLC.zip",
  "terraria":               "https://github.com/hotwelj/paramintarneort/releases/download/Terraria/Terraria.v1.4.5.3.zip",
  "jump-king":              "https://github.com/hotwelj/paramintarneort/releases/download/Jump-king/Jump.King.v2025.05.30.zip",
  "celeste":                "https://github.com/hotwelj/paramintarneort/releases/download/Celeste/Celeste.v2025.02.07.zip",
  "stardew-valley":         "https://github.com/hotwelj/paramintarneort/releases/download/Stardew-valley/Stardew.Valley.v1.6.15.zip",
  "super-meat-boy":         "https://github.com/hotwelj/paramintarneort/releases/download/Super-meat-boy/Super.Meat.Boy.v1.2.5.ALL.DLC.zip",
  "slime-rancher":          "https://github.com/hotwelj/paramintarneort/releases/download/Slime-rancher/Slime.Rancher.v1.4.4.ALL.DLC.zip",
  "cloverpit":              "https://github.com/hotwelj/paramintarneort/releases/download/Cloverpit/CloverPit.v1.4.10.ALL.DLC.zip",
  "getting-over-it":        "https://github.com/hotwelj/paramintarneort/releases/download/Getting-over-it/Getting.Over.It.with.Bennett.Foddy.v1.7.zip",
  "fortune-mill":           "https://github.com/hotwelj/paramintarneort/releases/download/Fortune-mill/Fortune.Mill.v2026.06.03.zip",
  "eaglercraft":            "https://github.com/hotwelj/paramintarneort/releases/download/Eaglercraft/EaglercraftX_1.8_Signed_Offline.zip",
  "vampire-survivors":      "https://github.com/hotwelj/paramintarneort/releases/download/Vampire-survivors/Vampire.Survivors.v1.14.112.ALL.DLC.zip",
  "oneshot":                "https://github.com/hotwelj/paramintarneort/releases/download/OneShot/OneShot.v2022.12.06.zip",
  "a-short-hike":           "https://github.com/hotwelj/paramintarneort/releases/download/A-short-hike/A.Short.Hike.v1.8.14.zip",
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
