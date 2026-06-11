const crypto = require("crypto");

// ── CONTRASEÑAS ──
const USUARIOS = {
  "1b2910a9fbe1709de628fbcefa9fb9b409078a7d40d5dd2d8dfdaeb80a6bcbb5": "usu.gratis",
  "a5a8098e19611e966bff4f8243043767ef99bfee85f6499d2e8da5062420d25f": "najmani16",
  "41c0ebccb07e468d1067b90472cbe6e27ca2631436ce83a528e7a00fb066c6f7": "cabe.tiene.aura",
  "ff8e5d99a11ddc294515bc779a5569b39dbf745517756ef8b3c4a275621398d5": "32208Sn3",
  "d764ffb7b5b0c4a9e5bcfe31ae1e02805993d0426a09928a98eb84b47a4e54ce": "ortng",
  "e7fe814f09f51fae5e8de644d6a06b1a1ee265adb90a629d163bbaf937ad7881": "timy2904",
  "1e49b994bc4e851eb601b132ae979a7340a563793554982c60abede128bcda45": "12345jacques12345",
  "d13c2fbc565696f1c18cbd33e98d49745c7eb7668a0837a1f61242d3ccda5e34": "notado",
};

const TOKEN_SECRETO = "ort-piratas-xK92mNq7pL3wZ";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { password } = JSON.parse(event.body);
    const hash = crypto.createHash("sha256").update(password).digest("hex");
    const nombre = USUARIOS[hash];

    if (nombre) {
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
