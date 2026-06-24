const crypto = require("crypto");

const USUARIOS = {
  "1b2910a9fbe1709de628fbcefa9fb9b409078a7d40d5dd2d8dfdaeb80a6bcbb5": "user1",
  "a5a8098e19611e966bff4f8243043767ef99bfee85f6499d2e8da5062420d25f": "user2",
  "41c0ebccb07e468d1067b90472cbe6e27ca2631436ce83a528e7a00fb066c6f7": "user3",
  "ff8e5d99a11ddc294515bc779a5569b39dbf745517756ef8b3c4a275621398d5": "user4",
  "d764ffb7b5b0c4a9e5bcfe31ae1e02805993d0426a09928a98eb84b47a4e54ce": "user5",
  "e7fe814f09f51fae5e8de644d6a06b1a1ee265adb90a629d163bbaf937ad7881": "user6",
  "1e49b994bc4e851eb601b132ae979a7340a563793554982c60abede128bcda45": "user7",
  "679f39017d3381cd279ce5b437ef2ac82e60175f86390626d5edee06c9d69bf0": "user8",
  "d13c2fbc565696f1c18cbd33e98d49745c7eb7668a0837a1f61242d3ccda5e34": "user9",
  "8d651e5101b654a88f9a2a26ab3fcb8e89e4865c9c1aa4160ba1054007f3ffb4": "user10",
  "49a438928b2c55e4cead6da422a9147f123d94378ce28de3077bdc5b003e96cb": "user11",
  "e1efe132045e2bf09e24d0fe4324ba0fe00ffcb405734a35385aac348f334d20": "user12",
  "37aa8ac3f409b0dc1b4d0ac81f3ee3492a28465deab87fce0892ac84ae1f8610": "user13",
  "e0468b4013937118c5799fa368374bd3a915bced357d30cb729df5bf4117547c": "user14",
  "bb6c21fe4a2a0644c231acdf2ff0a803816e5d13e58b5e4304ca372751c0dc16": "user15",
  "293dea18c2b5f419de8c267534f762314022e0ff8cc03228f80626e485cdf2cf": "user16",
  "81486471c9839940d70784520ddb031c9547d6aec67d46b283c27d9363dca499": "user17",
  "6e0c6878591da71151d8fd6875717113b87256657865815e0229b9f915cfab2d": "user18",
};

const TOKEN_SECRETO = "ort-piratas-xK92mNq7pL3wZ";

function getNombreReal(userId) {
  try {
    const mapa = JSON.parse(process.env.USER_NAMES || "{}");
    return mapa[userId] || userId;
  } catch {
    return userId;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { password } = JSON.parse(event.body);
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    const userId = USUARIOS[hash];

    if (userId) {
      const nombre = getNombreReal(userId);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, token: TOKEN_SECRETO, nombre }),
      };
    }

    return { statusCode: 401, body: JSON.stringify({ ok: false }) };
  } catch {
    return { statusCode: 400, body: "Bad request" };
  }
};
