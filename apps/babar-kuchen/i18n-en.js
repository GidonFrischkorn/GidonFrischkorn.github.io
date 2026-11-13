/* English. Same structure and keys as i18n-de.js; the comments there say where each text appears.
   Placeholders in curly brackets ({n}, {name}, {cat}, {list}) stay as they are. */
(window.KUCHEN_I18N = window.KUCHEN_I18N || {}).en = {

  meta: { name: "English", dir: "ltr", locale: "en-GB" },

  title: "Bake sale",

  ui: {
    lang_label: "Language",
    intro: "Please enter here which cake you will bring. The overview shows what is already signed up. That way we get a nice variety.",

    overview_h: "Already signed up",
    overview_by_cat: "By type",
    overview_by_ing: "By main ingredient",
    ing_none: "No main ingredients given yet.",
    loading: "Loading overview …",
    load_error: "The overview could not be loaded. Please check your internet connection.",
    retry: "Try again",
    total: "Signed up so far: {n}",
    empty: "No entries yet. Feel free to go first!",
    mark_legend: "Orange: there are already many of these. Similar cakes are still welcome.",
    mark_sr: "(already well represented)",

    form_h: "Sign up your cake",
    tip_h: "Tip for the sale",
    tip_text: "Cakes that are easy to eat by hand work best, for example muffins, tray bakes, loaf cakes or biscuits. We are happy about layer cakes too. But please consider whether your cake is easy to carry, cut and eat by hand.",
    first_label: "Child’s first name",
    last_label: "Child’s family name",
    name_hint: "Only the organising team sees the name.",
    required: "required",
    cat_label: "Type of cake",
    cat_placeholder: "Please choose",
    other_label: "Name of your bake (optional)",
    other_hint: "e.g. “baklava”",
    alg_legend: "Allergens and diet (optional)",
    alg_hint: "Please tick what applies to your cake.",
    alg_nut_note: "You chose nuts / almonds as a main ingredient. That is why the box for nuts / almonds is ticked under allergens.",
    ing_legend: "Main ingredient (optional)",
    ing_hint: "You can tick up to {n}.",
    ing_other_note: "You chose “Other”. Please write in the description what you will bring.",
    desc_label: "Description (optional)",
    desc_hint: "e.g. “marble cake”",
    chars_left: "{n} characters left",
    hint_many: "{cat}: {n} signed up already. Similar cakes are welcome. We have only a few of: {list}.",
    hint_many_ing: "Already in many cakes: {list}. That is fine. A different ingredient adds variety.",
    list_and: " and ",
    list_sep: ", ",
    submit: "Sign up",
    sending: "Sending …",

    err_first: "Please enter your child’s first name.",
    err_last: "Please enter your child’s family name.",
    err_name_long: "The name is too long (at most {n} characters).",
    err_cat: "Please choose a type of cake.",
    err_other_long: "The name of your bake is too long (at most {n} characters).",
    err_ing: "Please tick no more than {n} main ingredients.",
    err_desc_long: "The description is too long (at most {n} characters).",
    err_submit: "Sorry, that did not work. Your details are still here. Please try again in a moment.",
    err_full: "The list is full. Please contact the organising team.",

    success_h: "Thank you!",
    success_text: "We have signed up “{cat}” for {name}.",
    again: "Sign up another cake",
    reminder_btn: "Save a reminder in your calendar",
    reminder_hint: "Open the file with your calendar. It reminds you in the morning of the day before the bake sale. If nothing happens, open this page in Safari or Chrome.",
    reminder_text: "You signed up: {cat}. Please bring the cake on {date} in the morning, when you drop off your child.",
    deadline: "Please sign up by {date}, {time}.",
    closed: "Sign-up is closed. Thank you to everyone who is bringing a cake!",

    privacy_h: "Privacy",
    privacy_p1: "Only the organising team sees your child’s name and what you write. Publicly, the page shows only numbers: how many cakes are signed up per type and per main ingredient.",
    privacy_p2: "The entries are kept in a Google spreadsheet and deleted after the bake sale. When loading and sending, your browser connects to Google. The page uses no cookies and no tracking. It only remembers your language on your device.",

    not_configured: "Sign-up is not open yet.",
    demo_banner: "Test mode: nothing is saved.",
    descriptions_h: "Already announced",
    hp_label: "Please leave this field empty"
  },

  cat: {
    muffins: "Muffins / cupcakes",
    blech: "Tray bake / bars",
    ruehr: "Loaf cake / pound cake",
    guetzli: "Biscuits / Christmas cookies (Guetzli)",
    hefe: "Yeast bakes (plaited bread “Zopf”, buns)",
    waehe: "Fruit tart (Wähe)",
    kaese: "Cheesecake",
    torte: "Layer cake / gateau",
    sonstiges: "Other"
  },

  alg: {
    nuesse: "Contains nuts / almonds",
    glutenfrei: "Gluten-free",
    vegan: "Vegan"
  },

  ing: {
    schoko: "Chocolate",
    nuss: "Nuts / almonds",
    apfel: "Apple",
    zwetschge: "Plum",
    kirsche: "Cherry",
    beeren: "Berries",
    banane: "Banana",
    rueebli: "Carrot",
    zitrone: "Lemon",
    gewuerz: "Cinnamon / spices",
    natur: "Plain / vanilla",
    andere: "Other"
  }
};
