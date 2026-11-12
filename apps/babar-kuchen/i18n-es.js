/* Spanish. Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).es = {

  meta: { name: "Español", dir: "ltr", locale: "es" },

  title: "Venta de pasteles",

  ui: {
    lang_label: "Idioma",
    intro: "Por favor, anote aquí qué pastel va a traer. El resumen muestra lo que ya está anotado. Así tendremos una buena variedad.",

    overview_h: "Ya anotado",
    overview_by_cat: "Por tipo",
    overview_by_ing: "Por ingrediente principal",
    ing_none: "Todavía no hay ingredientes principales indicados.",
    loading: "Cargando el resumen…",
    load_error: "No se pudo cargar el resumen. Por favor, revise su conexión a internet.",
    retry: "Intentar de nuevo",
    total: "Anotados hasta ahora: {n}",
    empty: "Todavía no hay nada anotado. ¡Anímese a empezar!",
    mark_legend: "En naranja: de estos ya hay muchos. Aun así, los pasteles parecidos son bienvenidos.",
    mark_sr: "(ya hay muchos)",

    form_h: "Anotar un pastel",
    tip_h: "Consejo para la venta",
    tip_text: "Lo mejor son los pasteles que se pueden comer fácilmente con la mano, por ejemplo muffins, pasteles de bandeja, bizcochos o galletas. También nos alegran los pasteles de capas (tartas o tortas). Pero, por favor, piense si su pastel se puede transportar, cortar y comer con la mano sin problema.",
    first_label: "Nombre del niño o la niña",
    last_label: "Apellido del niño o la niña",
    name_hint: "El nombre solo lo ve el equipo organizador.",
    required: "Campo obligatorio",
    cat_label: "Tipo de pastel",
    cat_placeholder: "Por favor, elija",
    other_label: "Nombre de lo que va a traer (opcional)",
    other_hint: "Por ejemplo: “baklava”",
    alg_legend: "Alérgenos y alimentación (opcional)",
    alg_hint: "Por favor, marque lo que corresponda a su pastel.",
    alg_nut_note: "Ha elegido frutos secos / almendras como ingrediente principal. Por eso, en los alérgenos está marcada la casilla de frutos secos.",
    ing_legend: "Ingrediente principal (opcional)",
    ing_hint: "Puede marcar hasta {n}.",
    ing_other_note: "Ha elegido “Otro”. Por favor, escriba en la descripción qué va a traer.",
    desc_label: "Descripción (opcional)",
    desc_hint: "Por ejemplo: “pastel marmolado”",
    chars_left: "Caracteres restantes: {n}",
    hint_many: "{cat}: ya hay {n}. Los pasteles parecidos son bienvenidos. Todavía hay pocos de: {list}.",
    hint_many_ing: "Ya en muchos pasteles: {list}. Está bien. Otro ingrediente da más variedad.",
    list_and: " y ",
    list_sep: ", ",
    submit: "Enviar",
    sending: "Enviando…",

    err_first: "Por favor, escriba el nombre de su hijo o hija.",
    err_last: "Por favor, escriba el apellido de su hijo o hija.",
    err_name_long: "El nombre es demasiado largo (máximo {n} caracteres).",
    err_cat: "Por favor, elija un tipo de pastel.",
    err_other_long: "El nombre de lo que va a traer es demasiado largo (máximo {n} caracteres).",
    err_ing: "Por favor, marque como máximo {n} ingredientes principales.",
    err_desc_long: "La descripción es demasiado larga (máximo {n} caracteres).",
    err_submit: "Lo sentimos, no se pudo enviar. Sus datos siguen aquí. Por favor, inténtelo de nuevo en un momento.",
    err_full: "La lista está llena. Por favor, avise al equipo organizador.",

    success_h: "¡Gracias!",
    success_text: "Hemos anotado “{cat}” para {name}.",
    again: "Anotar otro pastel",

    privacy_h: "Protección de datos",
    privacy_p1: "El nombre de su hijo o hija y lo que usted escribe solo lo ve el equipo organizador. Al público, la página solo muestra números: cuántos pasteles hay anotados por tipo y por ingrediente principal.",
    privacy_p2: "Los datos se guardan en una hoja de cálculo de Google y se borran después de la venta de pasteles. Al cargar la página y al enviar, su navegador se conecta con Google. La página no usa cookies ni rastreo. Solo recuerda su idioma en su dispositivo.",

    not_configured: "La inscripción todavía no está abierta.",
    demo_banner: "Modo de prueba: no se guarda nada.",
    descriptions_h: "Ya anunciado",
    hp_label: "Por favor, deje este campo vacío"
  },

  cat: {
    muffins: "Muffins / cupcakes",
    blech: "Pastel de bandeja (en porciones)",
    ruehr: "Bizcocho / pastel de molde",
    guetzli: "Galletas / galletas de Navidad (Guetzli)",
    hefe: "Masas de levadura (pan trenzado Zopf, rollos dulces)",
    waehe: "Tarta de fruta (Wähe)",
    kaese: "Tarta de queso / cheesecake",
    torte: "Pastel de capas (tarta / torta)",
    sonstiges: "Otros"
  },

  alg: {
    nuesse: "Contiene frutos secos (nueces, almendras, etc.)",
    glutenfrei: "Sin gluten",
    vegan: "Vegano"
  },

  ing: {
    schoko: "Chocolate",
    nuss: "Frutos secos / almendras",
    apfel: "Manzana",
    zwetschge: "Ciruela",
    kirsche: "Cereza",
    beeren: "Frutos rojos",
    banane: "Plátano / banana",
    rueebli: "Zanahoria",
    zitrone: "Limón",
    gewuerz: "Canela / especias",
    natur: "Natural / vainilla",
    andere: "Otro"
  }
};
