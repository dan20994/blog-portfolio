import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  UserRound,
  Smartphone,
  Globe,
  Server,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  CircleX,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Info,
  Table2,
} from "lucide-react";
import "./TotpWebauthnFlow.css";

/*
 * TOTP vs. WebAuthn — animación ilustrativa de dos métodos de autenticación,
 * cada uno en dos recorridos: inicio de sesión legítimo y ataque de phishing
 * con una web falsa que hace de intermediaria (AiTM).
 * Todo es una simulación visual: no hay red, credenciales ni criptografía real.
 *
 * Uso: <TotpWebauthnFlow />  (props opcionales: initialMethod, initialFlow, autoplayMs)
 */

/* ------------------------------------------------------------------ */
/* Datos de los escenarios                                             */
/* ------------------------------------------------------------------ */

const SITE = "tienda-example.com";
const FAKE = "tienda-exarnple.com";

// Participantes reutilizados por los cuatro recorridos.
// `site` es el dominio al que responde ese servidor; se dibuja bajo el nombre.
const NODE = {
  phone: { name: "App Authenticator", kind: "phone", icon: Smartphone, tone: "violet", key: "clave secreta K" },
  user: { name: "Usuario", kind: "user", icon: UserRound, tone: "blue" },
  browser: { name: "Navegador", kind: "browser", icon: Globe, tone: "blue" },
  auth: { name: "Autenticador", kind: "authenticator", icon: Fingerprint, tone: "amber", key: "clave privada" },
  // La web falsa es un servidor del atacante: sirve la copia y reenvía todo a la tienda real.
  attacker: { name: "Web falsa", kind: "attacker", icon: Server, tone: "coral", site: FAKE, siteTone: "coral" },
  serverK: { name: "Servidor de la tienda", kind: "server", icon: Server, tone: "blue", site: SITE, key: "clave secreta K" },
  serverPub: { name: "Servidor de la tienda", kind: "server", icon: Server, tone: "blue", site: SITE, key: "clave pública" },
};

const TOTP_NODES = { phone: NODE.phone, user: NODE.user, browser: NODE.browser, server: NODE.serverK };
const WA_NODES = { user: NODE.user, auth: NODE.auth, browser: NODE.browser, server: NODE.serverPub };

const FLOWS = [
  { id: "legit", label: "Flujo legítimo", tone: "green" },
  { id: "attack", label: "Ataque de phishing", tone: "coral" },
];

/* ---- TOTP, inicio de sesión legítimo ---- */

const TOTP_LEGIT = {
  id: "legit",
  // Nodos dibujados con el texto debajo de cada ilustración, en una columna centrada.
  illustrated: "below",
  // Orden de los participantes en el diagrama (cada flecha une vecinos).
  order: ["phone", "user", "browser", "server"],
  nodes: TOTP_NODES,
  initial: {
    phone: { lines: ["Genera los códigos TOTP"] },
    user: { lines: ["Quiere iniciar sesión"] },
    browser: { lines: ["Muestra la pantalla de acceso"], screen: "login", url: SITE },
    server: { lines: ["Espera un inicio de sesión"] },
  },
  steps: [
    {
      title: "El usuario introduce su contraseña",
      text: "El usuario escribe su nombre y su contraseña. El navegador los envía al servidor, que comprueba la contraseña y responde que falta un segundo factor.",
      detail: { label: "Mensaje", value: "POST /login  →  «Introduce el código de tu app»" },
      active: ["user", "browser", "server"],
      status: {
        user: { lines: ["Escribe su contraseña"] },
        browser: { lines: ["Envía usuario y contraseña"], screen: "password", url: SITE },
        server: { lines: ["Contraseña correcta", "Pide el segundo factor"], tone: "amber" },
      },
      edges: [
        { from: "user", to: "browser", label: ["Contraseña"], tone: "blue" },
        { from: "browser", to: "server", label: ["Usuario +", "contraseña"], tone: "blue" },
      ],
    },
    {
      title: "La app genera un código TOTP",
      text: "La app calcula un código de seis dígitos a partir de la clave secreta K y de la hora actual. Esa clave se compartió con el servidor al activar el 2FA, normalmente escaneando un código QR. Cada 30 segundos aparece un código nuevo.",
      detail: { label: "Cálculo", value: "TOTP = Truncar(HMAC-SHA1(K, ⌊t / 30⌋)) mod 10⁶" },
      note: "El teléfono no se comunica con el servidor. El código sale solo de la clave K y del reloj.",
      active: ["phone", "user"],
      status: {
        phone: { code: "482 193", lines: ["Muestra un código nuevo", "cada 30 segundos"], tone: "violet" },
        user: { lines: ["Lee el código en el móvil"] },
        browser: { lines: ["Pide el código de 6 dígitos"], screen: "otp", url: SITE },
        server: { lines: ["Espera el código"], tone: "amber" },
      },
      edges: [{ from: "phone", to: "user", label: ["482 193"], tone: "violet" }],
    },
    {
      title: "El usuario introduce el código",
      text: "El usuario copia los seis dígitos en el formulario y el navegador los envía al servidor, asociados al inicio de sesión que quedó pendiente en el paso 1.",
      detail: { label: "Mensaje", value: "POST /login/2fa  code=482193" },
      active: ["user", "browser", "server"],
      status: {
        user: { lines: ["Escribe 482 193"] },
        browser: { lines: ["Envía el código"], screen: "code", url: SITE },
        server: { lines: ["Recibe el código"], tone: "amber" },
      },
      edges: [
        { from: "user", to: "browser", label: ["482 193"], tone: "violet" },
        { from: "browser", to: "server", label: ["Código", "TOTP"], tone: "violet" },
      ],
    },
    {
      title: "El servidor valida el código",
      text: "El servidor calcula el código esperado con su copia de la clave K y su propio reloj, y lo compara con el recibido. Suele aceptar también el intervalo anterior y el siguiente para tolerar pequeñas diferencias de hora.",
      detail: { label: "Comprobación", value: "HMAC-SHA1(K, ⌊t / 30⌋)  →  482 193" },
      checks: [
        "La contraseña es correcta",
        "El código esperado ahora es 482 193",
        "El código recibido coincide",
      ],
      result: "Autenticación completada",
      next: { label: "Ver el mismo inicio de sesión bajo phishing", method: "totp", flow: "attack" },
      active: ["server", "browser", "user"],
      status: {
        phone: { lines: ["Pronto mostrará", "otro código"] },
        user: { lines: ["Ha iniciado sesión"], tone: "green" },
        browser: { lines: ["Sesión iniciada"], tone: "green", screen: "done", url: SITE },
        server: { lines: ["Código correcto", "Concede la sesión"], tone: "green" },
      },
      edges: [],
    },
  ],
};

/* ---- TOTP bajo un ataque de phishing con una web falsa intermediaria ---- */

const TOTP_ATTACK = {
  id: "attack",
  accent: "coral",
  illustrated: "below",
  order: ["phone", "user", "browser", "attacker", "server"],
  nodes: { ...TOTP_NODES, attacker: NODE.attacker },
  initial: {
    phone: { lines: ["Genera los códigos TOTP"] },
    user: { lines: ["Recibe un correo urgente"] },
    browser: { lines: ["Abre el enlace del correo"], screen: "login", url: FAKE, fake: true },
    attacker: { lines: ["Copia de la tienda real"], tone: "coral", screen: "relay" },
    server: { lines: ["Espera un inicio de sesión"] },
  },
  steps: [
    {
      title: "Un correo lleva a una copia de la web",
      text: "El enlace abre una página idéntica a la de siempre, pero el dominio no es el mismo: es tienda-exarnple.com, no tienda-example.com. Esa web falsa la controla el atacante y reenvía cada petición a la tienda real en tiempo real. Fíjate en lo fácil que es confundir un dominio falso bien preparado con el original: «rn» casi no se distingue de «m». Es lo que pasó con PyPI, cuyos usuarios recibieron enlaces a pypj.org en lugar de pypi.org.",
      detail: { label: "Dirección", value: "https://tienda-exarnple.com/login   (la real es https://tienda-example.com)" },
      active: ["user", "browser", "attacker"],
      status: {
        user: { lines: ["Abre el enlace del correo"] },
        browser: { lines: ["Parece la tienda de siempre"], screen: "login", url: FAKE, fake: true },
        attacker: { lines: ["Sirve la copia y reenvía todo"], tone: "coral", screen: "relay" },
      },
      edges: [
        { from: "user", to: "browser", label: ["Abre el enlace"], tone: "blue" },
        { from: "attacker", to: "browser", label: ["Página falsa"], tone: "coral" },
      ],
    },
    {
      title: "La contraseña se escribe en la web falsa",
      text: "El usuario escribe su nombre y su contraseña sin notar nada raro. La web falsa se queda una copia y las reenvía al servidor de la tienda, que las comprueba y responde pidiendo el segundo factor.",
      detail: { label: "Mensaje", value: "POST /login   (la web falsa lo reenvía a tienda-example.com)" },
      active: ["user", "browser", "attacker", "server"],
      status: {
        user: { lines: ["Escribe su contraseña"] },
        browser: { lines: ["Envía usuario y contraseña"], screen: "password", url: FAKE, fake: true },
        attacker: { lines: ["Se queda una copia de todo"], tone: "coral", screen: "relay" },
        server: { lines: ["Contraseña correcta", "Pide el segundo factor"], tone: "amber" },
      },
      edges: [
        { from: "user", to: "browser", label: ["Contraseña"], tone: "blue" },
        { from: "browser", to: "attacker", label: ["Contraseña"], tone: "coral" },
        { from: "attacker", to: "server", label: ["Contraseña"], tone: "coral" },
      ],
    },
    {
      title: "La web falsa reenvía la pantalla del código",
      text: "El servidor de la tienda pide el código de seis dígitos y la web falsa devuelve esa misma pantalla a la víctima. Lo que ve es exactamente lo que esperaba ver después de la contraseña.",
      detail: { label: "Respuesta", value: "«Introduce el código de tu app»" },
      active: ["server", "attacker", "browser", "user"],
      status: {
        user: { lines: ["No sospecha nada"] },
        browser: { lines: ["Pide el código de 6 dígitos"], screen: "otp", url: FAKE, fake: true },
        attacker: { lines: ["Reenvía la petición"], tone: "coral", screen: "relay" },
        server: { lines: ["Espera el código"], tone: "amber" },
      },
      edges: [
        { from: "server", to: "attacker", label: ["Pide código"], tone: "amber" },
        { from: "attacker", to: "browser", label: ["Pide código"], tone: "coral" },
      ],
    },
    {
      title: "La app genera el código",
      text: "La app calcula los seis dígitos con la clave secreta K y la hora actual, igual que en un inicio de sesión normal. El usuario los lee en el móvil y los teclea donde cree que debe.",
      detail: { label: "Cálculo", value: "TOTP = Truncar(HMAC-SHA1(K, ⌊t / 30⌋)) mod 10⁶" },
      note: "El código no lleva ninguna información sobre la web en la que se va a escribir: la app no se comunica con nadie.",
      active: ["phone", "user"],
      status: {
        phone: { code: "482 193", lines: ["Muestra un código nuevo", "cada 30 segundos"], tone: "violet" },
        user: { lines: ["Lee el código en el móvil"] },
      },
      edges: [{ from: "phone", to: "user", label: ["482 193"], tone: "violet" }],
    },
    {
      title: "El código viaja al atacante y, de ahí, al servidor",
      text: "El usuario teclea los seis dígitos en la web falsa, que los reenvía al servidor de la tienda en cuestión de segundos, dentro del mismo intervalo en el que el código sigue siendo válido.",
      detail: { label: "Mensaje", value: "POST /login/2fa  code=482193   (la web falsa lo reenvía a tienda-example.com)" },
      active: ["user", "browser", "attacker", "server"],
      status: {
        user: { lines: ["Escribe 482 193"] },
        browser: { lines: ["Envía el código"], screen: "code", url: FAKE, fake: true },
        attacker: { lines: ["Reenvía el código a tiempo"], tone: "coral", screen: "relay" },
        server: { lines: ["Recibe el código"], tone: "amber" },
      },
      edges: [
        { from: "user", to: "browser", label: ["482 193"], tone: "violet" },
        { from: "browser", to: "attacker", label: ["Código"], tone: "coral" },
        { from: "attacker", to: "server", label: ["Código"], tone: "coral" },
      ],
    },
    {
      title: "El servidor valida el código y entrega la sesión",
      text: "El servidor calcula el código esperado con su copia de la clave K, comprueba que coincide y concede el acceso. Desde su punto de vista todo encaja, así que devuelve la cookie de sesión… a la web falsa. El atacante ya está dentro de la cuenta.",
      detail: { label: "Comprobación", value: "HMAC-SHA1(K, ⌊t / 30⌋)  →  482 193  ✓" },
      checks: [
        "La contraseña es correcta",
        "El código recibido coincide",
        { text: "Nada en el mensaje dice en qué web se escribió el código", ok: false },
      ],
      result: "Cuenta comprometida",
      resultTone: "coral",
      next: { label: "Ver el mismo ataque con WebAuthn", method: "webauthn", flow: "attack" },
      active: ["server", "attacker", "user"],
      status: {
        phone: { lines: ["Pronto mostrará", "otro código"] },
        user: { lines: ["Cree que ha iniciado sesión"], tone: "coral" },
        browser: { lines: ["Pantalla de «todo correcto»"], screen: "hijacked", url: FAKE, fake: true },
        attacker: { lines: ["El atacante tiene la sesión"], tone: "coral", screen: "idle" },
        server: { lines: ["Código correcto", "Concede la sesión"], tone: "green" },
      },
      edges: [{ from: "server", to: "attacker", label: ["Cookie de sesión"], tone: "coral" }],
    },
  ],
};

/* ---- WebAuthn, inicio de sesión legítimo ---- */

const WA_LEGIT = {
  id: "legit",
  illustrated: "below",
  order: ["user", "auth", "browser", "server"],
  nodes: WA_NODES,
  initial: {
    user: { lines: ["Quiere iniciar sesión"] },
    auth: { lines: ["Móvil, portátil o llave física"], screen: "idle" },
    browser: { lines: ["Abre la web real"], screen: "passkey", url: SITE },
    server: { lines: ["Espera un inicio de sesión"] },
  },
  steps: [
    {
      title: "El usuario elige «Iniciar sesión con passkey»",
      text: "No hay contraseña que escribir. El usuario pulsa el botón y el navegador pide al servidor que empiece un inicio de sesión con WebAuthn.",
      detail: { label: "Mensaje", value: "POST /webauthn/login/options" },
      active: ["user", "browser", "server"],
      status: {
        user: { lines: ["Pulsa «Iniciar sesión con passkey»"] },
        browser: { lines: ["Pide iniciar sesión"], screen: "passkey", url: SITE },
        server: { lines: ["Prepara el inicio de sesión"], tone: "amber" },
      },
      edges: [{ from: "browser", to: "server", label: ["Iniciar", "sesión"], tone: "blue" }],
    },
    {
      title: "El servidor genera un desafío",
      text: "El servidor genera un valor aleatorio de un solo uso, el challenge, y lo guarda asociado a este intento. Así una respuesta antigua no sirve para un intento nuevo.",
      detail: { label: "Challenge", value: "9f2c41b7 … 03d8a71e  (32 bytes aleatorios)" },
      active: ["server", "browser"],
      status: {
        server: { lines: ["Genera un challenge aleatorio"], tone: "amber" },
        browser: { lines: ["Recibe el challenge"], tone: "amber", screen: "challenge", url: SITE },
      },
      edges: [{ from: "server", to: "browser", label: ["Challenge"], tone: "amber" }],
    },
    {
      title: "El usuario confirma su identidad",
      text: "El navegador pasa el challenge al autenticador junto con el origen de la página, https://tienda-example.com. El autenticador busca la passkey registrada para ese sitio y pide la huella, el rostro o un PIN. Esa comprobación ocurre dentro del dispositivo: la huella no se envía a ningún sitio.",
      detail: {
        label: "Datos del cliente",
        value: '{ type: "webauthn.get", challenge: "9f2c…a71e", origin: "https://tienda-example.com" }',
      },
      active: ["user", "auth", "browser"],
      status: {
        browser: { lines: ["Envía el challenge y el origen"], screen: "prompt", url: SITE },
        auth: { lines: ["Pide la huella o el PIN"], tone: "amber", screen: "touch" },
        user: { lines: ["Confirma con la huella"] },
      },
      edges: [
        { from: "browser", to: "auth", label: ["Challenge +", "origen"], tone: "amber" },
        { from: "user", to: "auth", label: ["Huella"], tone: "blue" },
      ],
    },
    {
      title: "El autenticador firma la respuesta",
      text: "Con la clave privada de esa passkey, el autenticador firma un resumen que incluye el challenge y el origen. La clave privada nunca sale del dispositivo: al servidor solo llega la firma.",
      detail: {
        label: "Firma",
        value: "Sign(clave privada, authenticatorData ‖ SHA-256(clientDataJSON))",
      },
      note: "El servidor solo guarda la clave pública. Con ella puede verificar firmas, pero no crearlas.",
      active: ["auth", "browser", "server"],
      status: {
        user: { lines: ["Espera"] },
        auth: { lines: ["Firma con la clave privada"], tone: "amber", screen: "sign" },
        browser: { lines: ["Reenvía la respuesta firmada"], screen: "sending", url: SITE },
        server: { lines: ["Recibe la respuesta"], tone: "amber" },
      },
      edges: [
        { from: "auth", to: "browser", label: ["Respuesta", "firmada"], tone: "amber" },
        { from: "browser", to: "server", label: ["Respuesta", "firmada"], tone: "amber" },
      ],
    },
    {
      title: "El servidor verifica la respuesta",
      text: "El servidor comprueba que la respuesta corresponde a su challenge, que viene del origen esperado y que la firma es válida con la clave pública que guardó al registrar la passkey.",
      detail: { label: "Verificación", value: "Verify(clave pública, firma, datos firmados)  →  válida" },
      checks: [
        "El challenge es el que se emitió",
        "El origen es https://tienda-example.com",
        "La firma es válida con la clave pública",
      ],
      result: "Autenticación completada",
      next: { label: "Ver el intento de phishing con passkeys", method: "webauthn", flow: "attack" },
      active: ["server", "browser", "user"],
      status: {
        user: { lines: ["Ha iniciado sesión"], tone: "green" },
        auth: { lines: ["La clave privada sigue dentro"], screen: "idle" },
        browser: { lines: ["Sesión iniciada"], tone: "green", screen: "done", url: SITE },
        server: { lines: ["Firma válida", "Concede la sesión"], tone: "green" },
      },
      edges: [],
    },
  ],
};

/* ---- WebAuthn bajo el mismo ataque de phishing ---- */

const WA_ATTACK = {
  id: "attack",
  accent: "coral",
  illustrated: "below",
  order: ["user", "auth", "browser", "attacker", "server"],
  nodes: { ...WA_NODES, attacker: NODE.attacker },
  initial: {
    user: { lines: ["Recibe el mismo correo"] },
    auth: { lines: ["Guarda la passkey de tienda-example.com"], screen: "idle" },
    browser: { lines: ["Abre el enlace del correo"], screen: "passkey", url: FAKE, fake: true },
    attacker: { lines: ["Copia de la tienda real"], tone: "coral", screen: "relay" },
    server: { lines: ["Espera un inicio de sesión"] },
  },
  steps: [
    {
      title: "La misma trampa, con passkeys",
      text: "El correo y la web falsa son idénticos al caso anterior: el dominio es tienda-exarnple.com y la web falsa reenvía todo a la tienda real. Lo único que cambia es cómo se prueba la identidad.",
      detail: { label: "Dirección", value: "https://tienda-exarnple.com   (la real es https://tienda-example.com)" },
      active: ["user", "browser", "attacker"],
      status: {
        user: { lines: ["Abre el enlace del correo"] },
        browser: { lines: ["Parece la tienda de siempre"], screen: "passkey", url: FAKE, fake: true },
        attacker: { lines: ["Sirve la copia y reenvía todo"], tone: "coral", screen: "relay" },
      },
      edges: [{ from: "attacker", to: "browser", label: ["Página falsa"], tone: "coral" }],
    },
    {
      title: "La web falsa consigue un desafío auténtico",
      text: "El usuario pulsa «Iniciar sesión con passkey». La web falsa pide al servidor de la tienda que empiece un inicio de sesión y recibe un challenge perfectamente válido, que reenvía al navegador.",
      detail: { label: "Mensaje", value: "POST /webauthn/login/options  →  challenge 9f2c…a71e" },
      active: ["user", "browser", "attacker", "server"],
      status: {
        user: { lines: ["Pulsa «Iniciar sesión con passkey»"] },
        browser: { lines: ["Pide iniciar sesión"], screen: "passkey", url: FAKE, fake: true },
        attacker: { lines: ["Pide el challenge por su cuenta"], tone: "coral", screen: "relay" },
        server: { lines: ["Genera un challenge aleatorio"], tone: "amber" },
      },
      edges: [
        { from: "browser", to: "attacker", label: ["Iniciar sesión"], tone: "coral" },
        { from: "attacker", to: "server", label: ["Iniciar sesión"], tone: "coral" },
        { from: "server", to: "attacker", label: ["Challenge"], tone: "amber" },
      ],
    },
    {
      title: "El navegador compara el origen, no la apariencia",
      text: "Antes de hablar con el autenticador, el navegador mira el origen de la página y lo compara con el dominio para el que se registró la passkey. No coinciden, así que no ofrece ninguna credencial.",
      detail: {
        label: "Comprobación del navegador",
        value: 'origen "https://tienda-exarnple.com"  ≠  RP ID "tienda-example.com"',
      },
      note: "El autenticador nunca se activa: no hay huella que pedir ni firma que generar.",
      active: ["attacker", "browser", "auth"],
      status: {
        user: { lines: ["Espera"] },
        auth: { lines: ["No recibe ninguna petición"], screen: "idle" },
        browser: { lines: ["No hay passkey para este sitio"], screen: "blocked", url: FAKE, fake: true },
        attacker: { lines: ["Reenvía el challenge"], tone: "coral", screen: "relay" },
      },
      edges: [
        { from: "attacker", to: "browser", label: ["Challenge"], tone: "amber" },
        { from: "browser", to: "auth", label: ["Ninguna passkey"], tone: "coral", blocked: true },
      ],
    },
    {
      title: "Sin firma no hay nada que reenviar",
      text: "La web falsa puede copiar la tienda hasta el último píxel, pero se queda sin el dato que necesita. La clave privada no sale del dispositivo y el navegador no la usa fuera del dominio en el que se registró.",
      detail: { label: "Lo que recibe la web falsa", value: "—  ninguna credencial" },
      checks: [
        "La passkey está ligada a tienda-example.com",
        "El navegador no ofrece la credencial",
        "El autenticador no llega a firmar",
      ],
      result: "Ataque bloqueado",
      active: ["auth", "browser", "attacker"],
      status: {
        auth: { lines: ["La clave privada sigue dentro"], screen: "idle" },
        browser: { lines: ["No hay nada que enviar"], screen: "blocked", url: FAKE, fake: true },
        attacker: { lines: ["Se queda sin credencial"], tone: "coral", screen: "idle" },
      },
      edges: [],
    },
    {
      title: "Segunda barrera: el servidor también mira el origen",
      text: "Supongamos que el atacante consiguiera una respuesta firmada por otra vía. Tampoco le serviría: el objeto que se firma incluye el origen de la página, y el servidor lo compara con el suyo antes de aceptar la firma.",
      detail: {
        label: "Verificación",
        value: 'origin "https://tienda-exarnple.com"  ≠  "https://tienda-example.com"  →  rechazada',
      },
      note: "La comprobación la hace el servidor, no depende de que el usuario se fije en el dominio.",
      checks: [
        "El challenge es el que se emitió",
        { text: "El origen firmado no es el del servidor", ok: false },
      ],
      result: "Respuesta rechazada",
      next: { label: "Ver el flujo normal con passkeys", method: "webauthn", flow: "legit" },
      active: ["attacker", "server"],
      status: {
        attacker: { lines: ["Reenvía una respuesta firmada"], tone: "coral", screen: "relay" },
        server: { lines: ["Origen incorrecto", "Rechaza la respuesta"], tone: "green" },
      },
      edges: [{ from: "attacker", to: "server", label: ["Respuesta firmada"], tone: "coral" }],
    },
  ],
};

const SCENARIOS = {
  totp: {
    id: "totp",
    tab: "TOTP",
    tone: "violet",
    flows: { legit: TOTP_LEGIT, attack: TOTP_ATTACK },
  },
  webauthn: {
    id: "webauthn",
    tab: "WebAuthn / Passkeys",
    tone: "amber",
    flows: { legit: WA_LEGIT, attack: WA_ATTACK },
  },
};

const COMPARISON = {
  rows: [
    ["Secreto", "Una clave K compartida: la guardan la app y el servidor", "Un par de claves: la privada en el dispositivo, la pública en el servidor"],
    ["Qué envía el usuario", "Un código de 6 dígitos que copia a mano", "Una firma que genera el autenticador"],
    ["Validez", "El código sirve durante su intervalo de unos 30 s", "Cada challenge sirve para un único intento"],
    ["Vinculación al sitio", "El código no depende de la web donde se escribe", "La firma incluye el origen de la página"],
    ["Phishing con una web falsa intermediaria", "El código se puede reenviar dentro de su intervalo", "La credencial no se ofrece fuera del dominio registrado"],
    ["Si se filtra la base de datos del servidor", "Quedan expuestas las claves K", "Solo quedan expuestas claves públicas"],
  ],
  conclusion:
    "TOTP comprueba un código temporal derivado de un secreto compartido. WebAuthn comprueba una firma hecha con una clave que nunca sale del dispositivo y que está ligada al sitio.",
};

/* ------------------------------------------------------------------ */
/* Geometría del diagrama                                              */
/* ------------------------------------------------------------------ */

const LAYOUTS = {
  // Fila horizontal para pantallas anchas.
  wide: { W: 900, w: 150, h: 136, pad: 12 },
  // Columna vertical para pantallas estrechas.
  narrow: { W: 320, w: 228, h: 116, gap: 70, pad: 12 },
};

function computeLayout(order, mode) {
  const L = LAYOUTS[mode];
  const pos = {};
  let H;
  if (mode === "wide") {
    H = L.h + L.pad * 2;
    const sp = (L.W - L.pad * 2 - L.w) / (order.length - 1);
    order.forEach((id, i) => {
      pos[id] = { x: L.pad + L.w / 2 + i * sp, y: H / 2, i };
    });
  } else {
    H = L.pad * 2 + order.length * L.h + (order.length - 1) * L.gap;
    order.forEach((id, i) => {
      pos[id] = { x: L.W / 2, y: L.pad + L.h / 2 + i * (L.h + L.gap), i };
    });
  }
  return { W: L.W, H, w: L.w, h: L.h, pos };
}

// Tamaño de cada dibujo en la variante ilustrada.
const ART = {
  phone: { w: 62, h: 116 },
  authenticator: { w: 62, h: 116 },
  user: { w: 48, h: 48 },
  browser: { w: 118, h: 78 },
  server: { w: 76, h: 80 },
  attacker: { w: 76, h: 80 },
};

// Alto de la línea con el dominio que algunos nodos muestran bajo su nombre.
const SITE_LINE_H = 17;

// "side": columna de dibujos a la izquierda y su texto a la derecha.
// "below": columna centrada; el texto va debajo de cada dibujo y la flecha sale después del texto.
function computeIllustratedLayout(order, nodes, textPos) {
  if (textPos === "below") {
    const W = 360;
    const pad = 14;
    // Con cinco participantes el hueco se reduce para que el diagrama no sea desproporcionado.
    const gap = order.length >= 5 ? 48 : 58;
    const cx = W / 2;
    const pos = {};
    let y = pad;
    order.forEach((id, i) => {
      const { w, h } = ART[nodes[id].kind];
      // Nombre + dominio, si lo hay + hasta dos líneas de estado + línea de la clave, si la hay.
      const textH = 64 + (nodes[id].site ? SITE_LINE_H : 0) + (nodes[id].key ? 18 : 0);
      pos[id] = { x: cx, y: y + h / 2, top: y, artBottom: y + h, bottom: y + h + textH, w, h, i };
      y += h + textH + gap;
    });
    return { W, H: y - gap + pad, pos, illustrated: true, textBelow: true };
  }

  const W = 360;
  const pad = 14;
  const gap = 68;
  const cx = 74;
  const pos = {};
  let y = pad;
  order.forEach((id, i) => {
    const { w, h } = ART[nodes[id].kind];
    pos[id] = { x: cx, y: y + h / 2, top: y, bottom: y + h, w, h, i };
    y += h + gap;
  });
  return { W, H: y - gap + pad, pos, illustrated: true, textX: 146 };
}

function edgeGeometry(edge, layout, mode, paired) {
  const a = layout.pos[edge.from];
  const b = layout.pos[edge.to];
  const forward = b.i > a.i;

  if (layout.illustrated) {
    // Si hay flechas en ambos sentidos, la de bajada va a la izquierda y la de subida a la derecha.
    const off = paired ? (forward ? -9 : 9) : 0;
    const side = paired && forward ? -1 : 1;
    const x = a.x + off;
    const y1 = forward ? a.bottom + 7 : a.top - 7;
    const y2 = forward ? b.top - 12.5 : b.bottom + 12.5;
    const my = (y1 + y2) / 2;
    const lines = edge.label || [];
    const labels = lines.map((text, k) => ({
      text,
      x: x + side * 16,
      y: my + (k - (lines.length - 1) / 2) * 15 + 4,
      anchor: side < 0 ? "end" : "start",
    }));
    return { x1: x, y1, x2: x, y2, labels };
  }

  const offset = paired ? (forward ? -9 : 9) : 0;
  const side = paired ? (forward ? -1 : 1) : mode === "wide" ? -1 : 1;
  const lines = edge.label || [];
  const LH = 15;

  if (mode === "wide") {
    const dir = forward ? 1 : -1;
    const y = a.y + offset;
    const x1 = a.x + dir * (layout.w / 2 + 5);
    const x2 = b.x - dir * (layout.w / 2 + 10.5);
    const mx = (x1 + x2) / 2;
    const labels = lines.map((text, k) => ({
      text,
      x: mx,
      y: side < 0 ? y - 10 - (lines.length - 1 - k) * LH : y + 20 + k * LH,
      anchor: "middle",
    }));
    return { x1, y1: y, x2, y2: y, labels };
  }

  const dir = forward ? 1 : -1;
  const x = a.x + offset;
  const y1 = a.y + dir * (layout.h / 2 + 5);
  const y2 = b.y - dir * (layout.h / 2 + 10.5);
  const my = (y1 + y2) / 2;
  const labels = lines.map((text, k) => ({
    text,
    x: x + side * 16,
    y: my + (k - (lines.length - 1) / 2) * LH + 4,
    anchor: side < 0 ? "end" : "start",
  }));
  return { x1: x, y1, x2: x, y2, labels };
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);
  return reduced;
}

function useElementWidth(ref, fallback) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ------------------------------------------------------------------ */
/* Piezas del diagrama                                                 */
/* ------------------------------------------------------------------ */

function DiagramNode({ def, pos, layout, mode, status, active, changed, stepKey }) {
  const { w, h } = layout;
  const left = pos.x - w / 2;
  const top = pos.y - h / 2;
  const Icon = def.icon;
  const tone = `var(--twf-${def.tone})`;
  const st = status || { lines: [] };
  const statusColor = st.tone ? `var(--twf-${st.tone})` : undefined;
  const pad = 14;
  const lineStart = top + (mode === "wide" ? 60 : 56);

  return (
    <g className={`twf-node ${active ? "is-active" : "is-dim"}`} style={{ "--tone": tone }}>
      <rect className="twf-card" x={left} y={top} width={w} height={h} rx="11" />
      <g style={{ color: tone }}>
        <Icon x={left + pad} y={top + 13} size={20} strokeWidth={1.75} aria-hidden="true" />
      </g>
      <text className="twf-n-name" x={left + pad + 28} y={top + 28}>
        {def.name}
      </text>

      <g key={changed ? `s${stepKey}` : "base"} className={changed ? "twf-fadein" : undefined}>
        {st.code ? (
          <>
            <text className="twf-n-code" x={left + pad} y={lineStart + 8}>
              {st.code}
            </text>
            {st.lines.map((line, i) => (
              <text
                key={i}
                className="twf-n-status"
                style={statusColor ? { fill: statusColor } : undefined}
                x={left + pad}
                y={lineStart + 28 + i * 17}
              >
                {line}
              </text>
            ))}
          </>
        ) : (
          st.lines.map((line, i) => (
            <text
              key={i}
              className="twf-n-status"
              style={statusColor ? { fill: statusColor } : undefined}
              x={left + pad}
              y={lineStart + i * 17}
            >
              {line}
            </text>
          ))
        )}
      </g>

      {def.key && (
        <g style={{ color: "var(--twf-dim)" }}>
          <KeyRound x={left + pad} y={top + h - 25} size={13} strokeWidth={1.75} aria-hidden="true" />
          <text className="twf-n-key" x={left + pad + 19} y={top + h - 14}>
            {def.key}
          </text>
        </g>
      )}
    </g>
  );
}

/* ---- Variante ilustrada: dibujos sin recuadro y texto al lado ---- */

// Móvil tipo iPhone antiguo: marco, cámara, altavoz, pantalla y botón home.
function PhoneFrame({ left, top, touchId = false, touching = false, children }) {
  const w = ART.phone.w;
  const h = ART.phone.h;
  const cx = left + w / 2;
  return (
    <>
      <rect className="twf-o" x={left} y={top} width={w} height={h} rx="11" />
      <circle className="twf-l" cx={cx - 13} cy={top + 8.5} r="1.4" />
      <line className="twf-l" x1={cx - 7} y1={top + 8.5} x2={cx + 7} y2={top + 8.5} />
      <rect className="twf-screen" x={left + 6} y={top + 16} width={w - 12} height="78" rx="2" />
      {children}
      <circle className={`twf-o twf-home ${touching ? "is-touch" : ""}`} cx={cx} cy={top + h - 11} r="6.5" />
      {!touchId && <rect className="twf-l" x={cx - 2.5} y={top + h - 13.5} width="5" height="5" rx="1.3" />}
    </>
  );
}

function AuthenticatorArt({ left, top, status }) {
  const cx = left + ART.authenticator.w / 2;
  const screen = status.screen || "idle";
  return (
    <PhoneFrame left={left} top={top} touchId touching={screen === "touch"}>
      <g key={screen} className="twf-fadein">
        {screen === "touch" && (
          <g style={{ color: "var(--twf-amber)" }}>
            <Fingerprint x={cx - 13} y={top + 40} size={26} strokeWidth={1.5} aria-hidden="true" />
          </g>
        )}
        {screen === "sign" && (
          <>
            <g style={{ color: "var(--twf-amber)" }}>
              <KeyRound x={cx - 10} y={top + 38} size={20} strokeWidth={1.6} aria-hidden="true" />
            </g>
            <text className="twf-scr-amber" x={cx} y={top + 75} textAnchor="middle">
              firma
            </text>
          </>
        )}
        {screen === "idle" && (
          <g style={{ color: "var(--twf-dim)" }}>
            <KeyRound x={cx - 9} y={top + 46} size={18} strokeWidth={1.6} aria-hidden="true" />
          </g>
        )}
      </g>
    </PhoneFrame>
  );
}

function PhoneArt({ left, top, status }) {
  const w = ART.phone.w;
  const cx = left + w / 2;
  return (
    <PhoneFrame left={left} top={top}>
      {status.code ? (
        <g key="code" className="twf-fadein">
          <text className="twf-scr-code" x={cx} y={top + 47} textAnchor="middle">
            {status.code.split(" ")[0]}
          </text>
          <text className="twf-scr-code" x={cx} y={top + 65} textAnchor="middle">
            {status.code.split(" ")[1]}
          </text>
          <rect className="twf-scr-track" x={left + 13} y={top + 80} width={w - 26} height="3" rx="1.5" />
          <rect className="twf-scr-bar" x={left + 13} y={top + 80} width={w - 26} height="3" rx="1.5" />
        </g>
      ) : (
        <g key="idle" style={{ color: "var(--twf-dim)" }}>
          <KeyRound x={cx - 9} y={top + 46} size={18} strokeWidth={1.6} aria-hidden="true" />
        </g>
      )}
    </PhoneFrame>
  );
}

function UserArt({ left, top }) {
  return (
    <g className="twf-user-ic">
      <UserRound x={left} y={top} size={ART.user.w} strokeWidth={1.5} aria-hidden="true" />
    </g>
  );
}

function BrowserArt({ left, top, status }) {
  const w = ART.browser.w;
  const h = ART.browser.h;
  const screen = status.screen || "login";
  const fx = left + 14;
  const fw = w - 28;
  const cx = left + w / 2;
  return (
    <>
      <rect className="twf-o" x={left} y={top} width={w} height={h} rx="7" />
      <line className="twf-l" x1={left} y1={top + 18} x2={left + w} y2={top + 18} />
      <circle className="twf-win-btn is-close" cx={left + 9} cy={top + 9} r="2.6" />
      <circle className="twf-win-btn is-min" cx={left + 17} cy={top + 9} r="2.6" />
      <circle className="twf-win-btn is-max" cx={left + 25} cy={top + 9} r="2.6" />
      <rect className="twf-field" x={left + 33} y={top + 3.5} width={w - 41} height="11" rx="5.5" />
      {status.url && (
        <text
          className={`twf-scr-url${status.fake ? " is-fake" : ""}`}
          x={left + 38}
          y={top + 12.2}
          // La barra de direcciones es estrecha: se ajusta el texto para que no desborde.
          textLength={Math.min(status.url.length * 3.9, w - 51)}
          lengthAdjust="spacingAndGlyphs"
        >
          {status.url}
        </text>
      )}

      <g key={screen} className="twf-fadein">
        {(screen === "login" || screen === "password") && (
          <>
            <rect className="twf-field" x={fx} y={top + 27} width={fw} height="12" rx="3" />
            <rect className="twf-field" x={fx} y={top + 44} width={fw} height="12" rx="3" />
            {screen === "password" && (
              <>
                <line className="twf-typed" x1={fx + 5} y1={top + 33} x2={fx + 34} y2={top + 33} />
                <text className="twf-scr-text" x={fx + 5} y={top + 53.5}>
                  ••••••••
                </text>
              </>
            )}
            <rect className="twf-win-cta" x={fx} y={top + 61} width="34" height="9" rx="3" />
          </>
        )}
        {(screen === "otp" || screen === "code") && (
          <>
            <rect className="twf-field" x={fx} y={top + 31} width={fw} height="16" rx="3" />
            {screen === "code" ? (
              <text className="twf-scr-otp" x={cx} y={top + 43} textAnchor="middle">
                482 193
              </text>
            ) : (
              <text className="twf-scr-hint" x={cx} y={top + 43} textAnchor="middle">
                _ _ _ _ _ _
              </text>
            )}
            <rect className="twf-win-cta" x={fx} y={top + 56} width="34" height="9" rx="3" />
          </>
        )}
        {screen === "passkey" && (
          <>
            <line className="twf-l" x1={fx} y1={top + 31} x2={fx + 42} y2={top + 31} />
            <rect className="twf-win-cta" x={fx} y={top + 41} width={fw} height="16" rx="3" />
            <g style={{ color: "var(--twf-bg)" }}>
              <KeyRound x={cx - 5} y={top + 44} size={10} strokeWidth={2.2} aria-hidden="true" />
            </g>
          </>
        )}
        {(screen === "challenge" || screen === "sending") && (
          <>
            <rect className="twf-field" x={fx} y={top + 32} width={fw} height="16" rx="3" />
            <text className="twf-scr-amber" x={cx} y={top + 43.5} textAnchor="middle">
              {screen === "challenge" ? "9f2c…a71e" : "sig 3045…"}
            </text>
            <line className="twf-l" x1={fx} y1={top + 59} x2={fx + 30} y2={top + 59} />
          </>
        )}
        {screen === "prompt" && (
          <>
            <line className="twf-l" x1={fx} y1={top + 29} x2={fx + fw} y2={top + 29} />
            <line className="twf-l" x1={fx} y1={top + 67} x2={fx + fw} y2={top + 67} />
            <rect className="twf-dialog" x={left + 26} y={top + 34} width={w - 52} height="28" rx="5" />
            <g style={{ color: "var(--twf-amber)" }}>
              <Fingerprint x={cx - 9} y={top + 39} size={18} strokeWidth={1.6} aria-hidden="true" />
            </g>
          </>
        )}
        {screen === "blocked" && (
          <>
            <line className="twf-l" x1={fx} y1={top + 29} x2={fx + fw} y2={top + 29} />
            <rect className="twf-dialog is-bad" x={left + 26} y={top + 34} width={w - 52} height="28" rx="5" />
            <g style={{ color: "var(--twf-coral)" }}>
              <Fingerprint x={cx - 9} y={top + 39} size={18} strokeWidth={1.6} aria-hidden="true" />
            </g>
            <line className="twf-blocked-slash" x1={cx - 11} y1={top + 59} x2={cx + 11} y2={top + 37} />
          </>
        )}
        {screen === "hijacked" && (
          <g style={{ color: "var(--twf-coral)" }}>
            <TriangleAlert x={cx - 13} y={top + 34} size={26} strokeWidth={1.7} aria-hidden="true" />
          </g>
        )}
        {screen === "done" && (
          <g style={{ color: "var(--twf-green)" }}>
            <CheckCircle2 x={cx - 13} y={top + 34} size={26} strokeWidth={1.7} aria-hidden="true" />
          </g>
        )}
      </g>
    </>
  );
}

function ServerArt({ left, top, status }) {
  const w = ART.server.w;
  const led = status.tone ? `var(--twf-${status.tone})` : "var(--twf-dim)";
  return (
    <>
      {[0, 1, 2].map((k) => {
        const y = top + k * 28;
        return (
          <g key={k}>
            <rect className="twf-o" x={left} y={y} width={w} height="24" rx="4" />
            <circle
              className={`twf-led ${k === 0 && status.tone === "amber" ? "is-blink" : ""}`}
              style={{ fill: led }}
              cx={left + 11}
              cy={y + 12}
              r="2.6"
            />
            <circle className="twf-led" style={{ fill: k === 0 ? led : "var(--twf-dim)" }} cx={left + 19} cy={y + 12} r="2.6" />
            <line className="twf-l" x1={left + 34} y1={y + 9} x2={left + w - 10} y2={y + 9} />
            <line className="twf-l" x1={left + 34} y1={y + 15} x2={left + w - 10} y2={y + 15} />
          </g>
        );
      })}
    </>
  );
}

// Web falsa: el mismo tipo de servidor que la tienda, pero del atacante y siempre en coral.
// Mientras reenvía peticiones ("relay"), el primer led parpadea.
function AttackerArt({ left, top, status }) {
  const w = ART.attacker.w;
  const relay = status.screen === "relay";
  return (
    <g className="twf-fake-server">
      {[0, 1, 2].map((k) => {
        const y = top + k * 28;
        return (
          <g key={k}>
            <rect className="twf-o" x={left} y={y} width={w} height="24" rx="4" />
            <circle
              className={`twf-led ${k === 0 && relay ? "is-blink" : ""}`}
              style={{ fill: k === 0 ? "var(--twf-coral)" : "var(--twf-dim)" }}
              cx={left + 11}
              cy={y + 12}
              r="2.6"
            />
            <circle className="twf-led" style={{ fill: "var(--twf-dim)" }} cx={left + 19} cy={y + 12} r="2.6" />
            <line className="twf-l" x1={left + 34} y1={y + 9} x2={left + w - 10} y2={y + 9} />
            <line className="twf-l" x1={left + 34} y1={y + 15} x2={left + w - 10} y2={y + 15} />
          </g>
        );
      })}
    </g>
  );
}

function IllustratedNode({ def, pos, layout, status, active, changed, stepKey }) {
  const tone = `var(--twf-${def.tone})`;
  const st = status || { lines: [] };
  const statusColor = st.tone ? `var(--twf-${st.tone})` : undefined;
  const left = pos.x - pos.w / 2;
  const top = pos.top;
  const below = Boolean(layout.textBelow);
  const tx = below ? pos.x : layout.textX;
  const anchor = below ? "middle" : "start";

  const lines = st.lines || [];
  // Dominio del servidor, justo debajo del nombre: desplaza el resto del texto.
  const siteH = def.site ? SITE_LINE_H : 0;
  const blockH = 16 + siteH + lines.length * 17 + (def.key ? 18 : 0);
  const nameY = below ? pos.artBottom + 22 : pos.y - blockH / 2 + 12;
  const linesY = nameY + 19 + siteH;
  const keyY = linesY + lines.length * 17 + 3;
  // Línea de la clave: icono + texto, centrada bajo el dibujo o alineada a la izquierda al lado.
  const keyW = def.key ? def.key.length * 6.6 + 17 : 0;
  const keyX = below ? pos.x - keyW / 2 : tx;

  const art =
    def.kind === "phone" ? (
      <PhoneArt left={left} top={top} status={st} />
    ) : def.kind === "authenticator" ? (
      <AuthenticatorArt left={left} top={top} status={st} />
    ) : def.kind === "user" ? (
      <UserArt left={left} top={top} />
    ) : def.kind === "browser" ? (
      <BrowserArt left={left} top={top} status={st} />
    ) : def.kind === "attacker" ? (
      <AttackerArt left={left} top={top} status={st} />
    ) : (
      <ServerArt left={left} top={top} status={st} />
    );

  return (
    <g className={`twf-node twf-ill ${active ? "is-active" : "is-dim"}`} style={{ "--tone": tone }}>
      <g className="twf-art">{art}</g>
      <text className="twf-n-name twf-ill-name" x={tx} y={nameY} textAnchor={anchor}>
        {def.name}
      </text>
      {def.site && (
        <text
          className={`twf-n-site${def.siteTone ? ` is-${def.siteTone}` : ""}`}
          x={tx}
          y={nameY + 17}
          textAnchor={anchor}
        >
          {def.site}
        </text>
      )}
      <g key={changed ? `s${stepKey}` : "base"} className={changed ? "twf-fadein" : undefined}>
        {lines.map((line, i) => (
          <text
            key={i}
            className="twf-n-status twf-ill-status"
            style={statusColor ? { fill: statusColor } : undefined}
            x={tx}
            y={linesY + i * 17}
            textAnchor={anchor}
          >
            {line}
          </text>
        ))}
      </g>
      {def.key && (
        <g style={{ color: "var(--twf-dim)" }}>
          <KeyRound x={keyX} y={keyY - 10} size={12} strokeWidth={1.75} aria-hidden="true" />
          <text className="twf-n-key" x={keyX + 17} y={keyY}>
            {def.key}
          </text>
        </g>
      )}
    </g>
  );
}

function DiagramEdge({ edge, geom, state, uid, index, count, reduced }) {
  const { x1, y1, x2, y2, labels } = geom;

  // Flecha que no llega a su destino: se corta y se marca con una X.
  if (edge.blocked) {
    const t = 0.58;
    const bx = x1 + (x2 - x1) * t;
    const by = y1 + (y2 - y1) * t;
    return (
      <g className={`twf-edge is-blocked is-${state}`} style={{ "--tone": "var(--twf-coral)" }}>
        <line x1={x1} y1={y1} x2={bx} y2={by} />
        {/* La X solo cuando el intento ya ha ocurrido: en "future" sería adelantar el final. */}
        {state !== "future" && (
          <g className="twf-blocked-x">
            <line x1={bx - 5} y1={by - 5} x2={bx + 5} y2={by + 5} />
            <line x1={bx + 5} y1={by - 5} x2={bx - 5} y2={by + 5} />
          </g>
        )}
        {state === "current" &&
          labels.map((l, i) => (
            <text key={i} className="twf-e-label" x={l.x} y={l.y} textAnchor={l.anchor}>
              {l.text}
            </text>
          ))}
      </g>
    );
  }

  const marker = `url(#${uid}-m-${state === "current" ? edge.tone : state})`;

  // Cada flecha del paso tiene su propio turno dentro del ciclo, para que se lea el orden.
  const slot = 1.0;
  const cycle = count * slot + 0.6;
  const s = (0.15 + index * slot) / cycle;
  const e = (0.15 + index * slot + 0.85) / cycle;
  const f = (n) => n.toFixed(4);

  return (
    <g className={`twf-edge is-${state}`} style={{ "--tone": `var(--twf-${edge.tone})` }}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        pathLength={state === "current" ? "100" : undefined}
        markerEnd={marker}
      />
      {state === "current" &&
        labels.map((l, i) => (
          <text key={i} className="twf-e-label" x={l.x} y={l.y} textAnchor={l.anchor}>
            {l.text}
          </text>
        ))}
      {state === "current" && !reduced && (
        <circle className="twf-e-dot" r="4" cx="0" cy="0" opacity="0">
          <animateMotion
            dur={`${cycle}s`}
            repeatCount="indefinite"
            calcMode="linear"
            keyPoints="0;0;1;1"
            keyTimes={`0;${f(s)};${f(e)};1`}
            path={`M${x1},${y1} L${x2},${y2}`}
          />
          <animate
            attributeName="opacity"
            dur={`${cycle}s`}
            repeatCount="indefinite"
            values="0;0;1;1;0;0"
            keyTimes={`0;${f(s)};${f(s + 0.02)};${f(e - 0.02)};${f(e)};1`}
          />
        </circle>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function TotpWebauthnFlow({ initialMethod = "totp", initialFlow = "attack", autoplayMs = 3800 }) {
  const rawId = useId();
  const uid = "twf" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef(null);
  const width = useElementWidth(rootRef, 880);
  const reduced = usePrefersReducedMotion();

  const [methodId, setMethodId] = useState(SCENARIOS[initialMethod] ? initialMethod : "totp");
  const [flowId, setFlowId] = useState(initialFlow === "legit" ? "legit" : "attack");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const method = SCENARIOS[methodId];
  const scenario = method.flows[flowId];
  const flowLabel = (FLOWS.find((f) => f.id === flowId) || FLOWS[0]).label;
  const accent = scenario.accent || method.tone;
  const total = scenario.steps.length;
  const current = scenario.steps[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const mode = width >= 640 ? "wide" : "narrow";
  const illustrated = Boolean(scenario.illustrated);
  // En pantallas anchas, la variante ilustrada pone el diagrama y la explicación lado a lado.
  const split = illustrated && width >= 720;
  const runKey = `${methodId}-${flowId}`;

  // Reproducción automática: un temporizador por paso, siempre limpiado.
  useEffect(() => {
    if (!playing) return undefined;
    if (step >= total - 1) {
      setPlaying(false);
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, total - 1)), autoplayMs);
    return () => clearTimeout(t);
  }, [playing, step, total, autoplayMs, runKey]);

  const layout = useMemo(
    () =>
      scenario.illustrated
        ? computeIllustratedLayout(scenario.order, scenario.nodes, scenario.illustrated)
        : computeLayout(scenario.order, mode),
    [scenario, mode]
  );

  const pairedKeys = useMemo(() => {
    const keys = new Set();
    scenario.steps.forEach((s) => s.edges.forEach((e) => keys.add(`${e.from}>${e.to}`)));
    return keys;
  }, [scenario]);

  const statuses = useMemo(() => {
    const acc = { ...scenario.initial };
    for (let i = 0; i <= step; i += 1) Object.assign(acc, scenario.steps[i].status);
    return acc;
  }, [scenario, step]);

  // Todas las conexiones del escenario se dibujan siempre: las ya recorridas ("past"),
  // las que faltan ("future") y, por encima, las del paso actual.
  const otherEdges = useMemo(() => {
    const currentKeys = new Set(current.edges.map((e) => `${e.from}>${e.to}`));
    const seen = new Map();
    scenario.steps.forEach((s, i) => {
      s.edges.forEach((e) => {
        const k = `${e.from}>${e.to}`;
        if (currentKeys.has(k)) return;
        const state = i < step ? "past" : "future";
        const prev = seen.get(k);
        if (!prev || (prev.state === "future" && state === "past")) seen.set(k, { edge: e, state });
      });
    });
    return [...seen.values()].sort((a, b) => (a.state === b.state ? 0 : a.state === "future" ? -1 : 1));
  }, [scenario, step, current]);

  const geomFor = (e) => edgeGeometry(e, layout, mode, pairedKeys.has(`${e.to}>${e.from}`));

  const checks = (current.checks || []).map((c) =>
    typeof c === "string" ? { text: c, ok: true } : { ok: true, ...c }
  );
  const badResult = current.resultTone === "coral";

  const legend = [
    { tone: "blue", label: "Comunicación" },
    { tone: "violet", label: "Código TOTP" },
    { tone: "amber", label: "Desafío y criptografía" },
    { tone: "green", label: "Verificado" },
    ...(flowId === "attack" ? [{ tone: "coral", label: "Atacante" }] : []),
  ];

  const restart = () => {
    setStep(0);
    setPlaying(false);
    setShowCompare(false);
  };
  const selectMethod = (id) => {
    if (id === methodId) return;
    setMethodId(id);
    restart();
  };
  const selectFlow = (id) => {
    if (id === flowId) return;
    setFlowId(id);
    restart();
  };
  const jumpTo = (next) => {
    setMethodId(next.method);
    setFlowId(next.flow);
    restart();
  };
  const goTo = (n) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(total - 1, n)));
  };
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (isLast) setStep(0);
    setPlaying(true);
  };
  const reset = () => {
    setPlaying(false);
    setStep(0);
    setShowCompare(false);
  };

  return (
    <section className="twf" ref={rootRef} aria-label="TOTP vs. WebAuthn">
      <div className="twf-head">
        <div className="twf-tabs" role="tablist" aria-label="Método de autenticación">
          {Object.values(SCENARIOS).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${m.id}`}
              aria-selected={m.id === methodId}
              aria-controls={`${uid}-stage`}
              className="twf-tab"
              style={{ "--tone": `var(--twf-${m.tone})` }}
              onClick={() => selectMethod(m.id)}
            >
              <span className="twf-tab-dot" aria-hidden="true" />
              {m.tab}
            </button>
          ))}
        </div>

        <div className="twf-switch" role="group" aria-label="Recorrido">
          {FLOWS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="twf-switch-btn"
              aria-pressed={f.id === flowId}
              style={{ "--tone": `var(--twf-${f.tone})` }}
              onClick={() => selectFlow(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`twf-body ${split ? "is-split" : ""}`}>
      <div className="twf-stage" id={`${uid}-stage`} role="tabpanel" aria-labelledby={`${uid}-tab-${methodId}`}>
        <div className="twf-toolbar" style={{ "--tone": `var(--twf-${accent})` }}>
          <div className="twf-tools">
            <button
              type="button"
              className="twf-tool"
              onClick={() => goTo(step - 1)}
              disabled={isFirst}
              aria-label="Paso anterior"
              title="Paso anterior"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="twf-tool is-primary"
              onClick={() => goTo(step + 1)}
              disabled={isLast}
              aria-label="Paso siguiente"
              title="Paso siguiente"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="twf-tool"
              onClick={togglePlay}
              aria-pressed={playing}
              aria-label={playing ? "Pausar" : "Reproducir"}
              title={playing ? "Pausar" : "Reproducir"}
            >
              {playing ? (
                <Pause size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Play size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            <button type="button" className="twf-tool" onClick={reset} aria-label="Reiniciar" title="Reiniciar">
              <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <div className="twf-steps" role="group" aria-label="Pasos">
            {scenario.steps.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`twf-seg ${i === step ? "is-current" : i < step ? "is-done" : ""}`}
                aria-label={`Ir al paso ${i + 1}: ${s.title}`}
                aria-current={i === step ? "step" : undefined}
                title={`${i + 1}. ${s.title}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>

        <svg
          className={`twf-svg is-${illustrated ? "ill" : mode}`}
          viewBox={`0 0 ${layout.W} ${layout.H}`}
          role="img"
          aria-label={`${method.tab}, ${flowLabel}. Paso ${step + 1} de ${total}: ${current.title}`}
        >
          <defs>
            {["blue", "violet", "amber", "green", "coral", "past", "future"].map((t) => (
              <marker
                key={t}
                id={`${uid}-m-${t}`}
                className={`twf-m-${t}`}
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" />
              </marker>
            ))}
          </defs>

          {otherEdges.map(({ edge: e, state }) => (
            <DiagramEdge
              key={`o-${e.from}-${e.to}`}
              edge={e}
              geom={geomFor(e)}
              state={state}
              uid={uid}
              index={0}
              count={1}
              reduced={reduced}
            />
          ))}
          {current.edges.map((e, i) => (
            <DiagramEdge
              key={`c-${runKey}-${step}-${e.from}-${e.to}`}
              edge={e}
              geom={geomFor(e)}
              state="current"
              uid={uid}
              index={i}
              count={current.edges.length}
              reduced={reduced}
            />
          ))}

          {illustrated &&
            scenario.order.map((id) => (
              <IllustratedNode
                key={`${runKey}-${id}`}
                def={scenario.nodes[id]}
                pos={layout.pos[id]}
                layout={layout}
                status={statuses[id]}
                active={current.active.includes(id)}
                changed={Boolean(current.status[id])}
                stepKey={step}
              />
            ))}
          {!illustrated && scenario.order.map((id) => (
            <DiagramNode
              key={`${runKey}-${id}`}
              def={scenario.nodes[id]}
              pos={layout.pos[id]}
              layout={layout}
              mode={mode}
              status={statuses[id]}
              active={current.active.includes(id)}
              changed={Boolean(current.status[id])}
              stepKey={step}
            />
          ))}
        </svg>

        <ul className="twf-legend" aria-label="Leyenda de colores">
          {legend.map((l) => (
            <li key={l.tone} style={{ "--tone": `var(--twf-${l.tone})` }}>
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="twf-panel" aria-live="polite">
        <div className="twf-panel-main" key={`m-${runKey}-${step}`}>
          <span className="twf-eyebrow">
            Paso {step + 1} de {total}
          </span>
          <h4 className="twf-step-title">{current.title}</h4>
          <p className="twf-step-text">{current.text}</p>
          {current.note && (
            <p className="twf-note">
              <Info size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{current.note}</span>
            </p>
          )}
        </div>

        <div className="twf-panel-side" key={`s-${runKey}-${step}`}>
          {current.detail && (
            <div className="twf-detail">
              <span className="twf-detail-label">{current.detail.label}</span>
              <code className="twf-detail-value">{current.detail.value}</code>
            </div>
          )}

          {checks.length > 0 && (
            <ul className="twf-checks">
              {checks.map((c, i) => (
                <li
                  key={c.text}
                  className={c.ok ? undefined : "is-bad"}
                  style={{ animationDelay: `${0.15 + i * 0.18}s` }}
                >
                  {c.ok ? (
                    <CheckCircle2 size={16} strokeWidth={1.9} aria-hidden="true" />
                  ) : (
                    <CircleX size={16} strokeWidth={1.9} aria-hidden="true" />
                  )}
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          {current.result && (
            <div className="twf-result-row">
              <span className={`twf-result${badResult ? " is-bad" : ""}`}>
                {badResult ? (
                  <ShieldAlert size={17} strokeWidth={1.9} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={17} strokeWidth={1.9} aria-hidden="true" />
                )}
                {current.result}
              </span>
              {current.next && (
                <button type="button" className="twf-btn is-next" onClick={() => jumpTo(current.next)}>
                  <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
                  {current.next.label}
                </button>
              )}
              <button
                type="button"
                className="twf-btn"
                aria-expanded={showCompare}
                aria-controls={`${uid}-compare`}
                onClick={() => setShowCompare((v) => !v)}
              >
                <Table2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {showCompare ? "Ocultar comparación" : "Ver comparación"}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {showCompare && (
        <div className="twf-compare" id={`${uid}-compare`}>
          <h4 className="twf-step-title">Comparación</h4>
          <div className="twf-table-wrap">
            <table className="twf-table">
              <thead>
                <tr>
                  <th scope="col">Característica</th>
                  <th scope="col" className="is-totp">TOTP</th>
                  <th scope="col" className="is-wa">WebAuthn / Passkeys</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.rows.map(([k, a, b]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="twf-conclusion">{COMPARISON.conclusion}</p>
        </div>
      )}
    </section>
  );
}
